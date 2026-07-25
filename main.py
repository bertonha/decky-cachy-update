import asyncio
import codecs
import contextlib
import fcntl
import os
import pty
import re
import signal
import struct
import termios
from collections import deque
from dataclasses import dataclass, field
from typing import Any

import decky

# The only command this plugin is allowed to run. The frontend deliberately has
# no say in it, so nothing that reaches the plugin's IPC can choose the command.
UPDATE_COMMAND = "cachy-update"

# Pushed to the frontend; it keeps its own copy of the transcript and reconciles
# against get_state() whenever a run ends.
EVENT_OUTPUT = "cachy_update/output"
EVENT_EXIT = "cachy_update/exit"

TERM_ROWS = 30
TERM_COLS = 80
READ_CHUNK_SIZE = 65536
KILL_GRACE_SECONDS = 5.0
# A full system upgrade prints a lot; keep only the tail the user could scroll to.
MAX_TRANSCRIPT_CHARS = 200_000

# CSI and other ANSI escape sequences; the frontend renders plain text only.
ANSI_ESCAPE = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")

# The pty applies ONLCR, so a program that already writes "\r\n" reaches us as
# "\r\r\n". Collapse any run of CRs before a LF rather than turning each into
# its own blank line.
CR_BEFORE_LF = re.compile(r"\r+\n")

# A trailing escape sequence or CR run that the next read will complete. Holding
# it back keeps a sequence split across two reads from leaking into the output.
INCOMPLETE_TAIL = re.compile(r"(?:\x1B(?:\[[0-?]*[ -/]*)?|\r+)\Z")

# Steam injects these into the plugin's environment and they break pacman/sudo.
STRIPPED_ENV_VARS = ("LD_LIBRARY_PATH", "LD_LIBRARY_PATH_ORIG", "LD_PRELOAD")


def _clean(text: str) -> str:
    text = ANSI_ESCAPE.sub("", text)
    return CR_BEFORE_LF.sub("\n", text).replace("\r", "\n")


@dataclass(slots=True)
class Session:
    """A single `cachy-update` run attached to a pseudo-terminal."""

    proc: asyncio.subprocess.Process
    master_fd: int
    decoder: codecs.IncrementalDecoder
    monitor: asyncio.Task[None] | None = None
    chunks: deque[str] = field(default_factory=deque)
    size: int = 0
    reading: bool = True
    carry: str = ""

    @property
    def running(self) -> bool:
        return self.proc.returncode is None

    def normalize(self, data: bytes) -> str:
        """Decode one read into the plain text the frontend displays."""
        text = self.carry + self.decoder.decode(data)
        self.carry = ""
        if tail := INCOMPLETE_TAIL.search(text):
            self.carry = text[tail.start() :]
            text = text[: tail.start()]
        return _clean(text)

    def flush(self) -> str:
        """Emit whatever was being held back, once no more reads are coming."""
        text, self.carry = self.carry, ""
        return _clean(text)

    def append(self, text: str) -> None:
        self.chunks.append(text)
        self.size += len(text)
        while self.size > MAX_TRANSCRIPT_CHARS and len(self.chunks) > 1:
            self.size -= len(self.chunks.popleft())

    def transcript(self) -> str:
        return "".join(self.chunks)


class Plugin:
    _session: Session | None
    _emits: set[asyncio.Task[None]]

    async def _main(self) -> None:
        self._session = None
        self._emits = set()
        decky.logger.info("CachyOS Update plugin loaded")

    # ---------------------------------------------------------------- frontend API

    async def start_session(self) -> dict[str, Any]:
        await self._end_session()

        env = {k: v for k, v in os.environ.items() if k not in STRIPPED_ENV_VARS}
        master_fd, slave_fd = pty.openpty()

        def attach_controlling_tty() -> None:
            # Runs in the forked child before exec. Giving it its own session with
            # the pty as controlling terminal lets sudo prompt on /dev/tty, and
            # makes the whole process tree killable as a single process group.
            os.setsid()
            fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)

        try:
            fcntl.ioctl(
                slave_fd,
                termios.TIOCSWINSZ,
                struct.pack("HHHH", TERM_ROWS, TERM_COLS, 0, 0),
            )
            proc = await asyncio.create_subprocess_exec(
                "/bin/bash",
                "-c",
                UPDATE_COMMAND,
                stdin=slave_fd,
                stdout=slave_fd,
                stderr=slave_fd,
                env=env,
                close_fds=True,
                preexec_fn=attach_controlling_tty,
            )
        except Exception:
            os.close(master_fd)
            raise
        finally:
            os.close(slave_fd)

        os.set_blocking(master_fd, False)
        session = Session(
            proc=proc,
            master_fd=master_fd,
            decoder=codecs.getincrementaldecoder("utf-8")(errors="replace"),
        )
        self._session = session

        asyncio.get_running_loop().add_reader(master_fd, self._on_readable, session)
        session.monitor = asyncio.create_task(self._monitor(session))

        decky.logger.info("Session started: %s (pid %d)", UPDATE_COMMAND, proc.pid)
        return {"started": True}

    async def get_state(self) -> dict[str, Any]:
        """Full current state, used by the frontend to sync on mount and after exit."""
        session = self._session
        if session is None:
            return {"output": "", "running": False, "exit_code": None}
        return {
            "output": session.transcript(),
            "running": session.running,
            "exit_code": session.proc.returncode,
        }

    async def send_input(self, text: str) -> dict[str, Any]:
        session = self._session
        if session is None or not session.running:
            return {"ok": False}
        try:
            os.write(session.master_fd, text.encode("utf-8"))
        except OSError as e:
            decky.logger.error("send_input failed: %s", e)
            return {"ok": False}
        return {"ok": True}

    async def kill_session(self) -> dict[str, Any]:
        await self._end_session()
        return {"ok": True}

    async def log_error(self, error: str) -> None:
        decky.logger.error("FRONTEND: %s", error)

    # ---------------------------------------------------------------- internals

    def _on_readable(self, session: Session) -> None:
        try:
            data = os.read(session.master_fd, READ_CHUNK_SIZE)
        except BlockingIOError:
            return
        except OSError:
            # EIO on Linux once the last slave fd is gone, i.e. the child exited.
            data = b""

        text = session.flush() if not data else session.normalize(data)
        if text:
            session.append(text)
            if self._session is session:
                self._spawn_emit(EVENT_OUTPUT, text)

        if not data:
            self._stop_reading(session)

    def _spawn_emit(self, event: str, *args: Any) -> None:
        # emit() is a coroutine but readers are sync callbacks; tasks created here
        # run in scheduling order, so chunks reach the frontend in order.
        task = asyncio.create_task(decky.emit(event, *args))
        self._emits.add(task)
        task.add_done_callback(self._emits.discard)

    def _stop_reading(self, session: Session) -> None:
        if not session.reading:
            return
        session.reading = False
        asyncio.get_running_loop().remove_reader(session.master_fd)

    async def _monitor(self, session: Session) -> None:
        """Reap the child so `returncode` is set, and tell the frontend it ended."""
        code = await session.proc.wait()
        decky.logger.info("Session exited with code %s", code)
        # A session replaced or killed from the UI is not an exit worth reporting;
        # _end_session() clears _session before waiting, so this stays quiet there.
        if self._session is session:
            await decky.emit(EVENT_EXIT, code)

    async def _end_session(self) -> None:
        session, self._session = self._session, None
        if session is None:
            return

        self._stop_reading(session)

        if session.running:
            self._signal_group(session, signal.SIGTERM)
            try:
                await asyncio.wait_for(session.proc.wait(), KILL_GRACE_SECONDS)
            except TimeoutError:
                decky.logger.warning("Session ignored SIGTERM, sending SIGKILL")
                self._signal_group(session, signal.SIGKILL)
                await session.proc.wait()

        if session.monitor is not None:
            with contextlib.suppress(asyncio.CancelledError):
                await session.monitor

        with contextlib.suppress(OSError):
            os.close(session.master_fd)

    @staticmethod
    def _signal_group(session: Session, sig: signal.Signals) -> None:
        # The child is a session leader, so this reaches sudo/pacman too.
        try:
            os.killpg(os.getpgid(session.proc.pid), sig)
        except (ProcessLookupError, PermissionError) as e:
            decky.logger.warning("Could not signal process group: %s", e)

    # ---------------------------------------------------------------- lifecycle

    async def _unload(self) -> None:
        await self._end_session()
        decky.logger.info("CachyOS Update plugin unloaded")

    async def _uninstall(self) -> None:
        decky.logger.info("CachyOS Update plugin uninstalled")

    async def _migration(self) -> None:
        pass
