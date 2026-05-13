import asyncio
import fcntl
import os
import pty
import re
import struct
import termios
import decky

ANSI_ESCAPE = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')


class Plugin:
    async def _main(self):
        self._session = None
        decky.logger.info("CachyOS Update plugin loaded")

    async def start_session(self, cmd: str) -> dict:
        if self._session is not None:
            await self._end_session()

        env = dict(os.environ)
        for var in ("LD_LIBRARY_PATH", "LD_LIBRARY_PATH_ORIG", "LD_PRELOAD"):
            env.pop(var, None)

        master_fd, slave_fd = pty.openpty()
        winsize = struct.pack("HHHH", 30, 80, 0, 0)
        fcntl.ioctl(slave_fd, termios.TIOCSWINSZ, winsize)

        proc = await asyncio.create_subprocess_exec(
            "/bin/bash", "-c", cmd,
            stdin=slave_fd,
            stdout=slave_fd,
            stderr=slave_fd,
            env=env,
            close_fds=True,
        )
        os.close(slave_fd)

        flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
        fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

        self._session = {"master_fd": master_fd, "proc": proc, "pending": ""}

        asyncio.create_task(self._read_loop())
        asyncio.create_task(proc.wait())  # ensures returncode is set on exit

        decky.logger.info(f"Session started: {cmd!r}")
        return {"started": True}

    async def _read_loop(self):
        while self._session is not None:
            try:
                data = os.read(self._session["master_fd"], 4096)
                if data:
                    text = data.decode("utf-8", errors="replace")
                    text = ANSI_ESCAPE.sub("", text)
                    text = text.replace("\r\n", "\n").replace("\r", "\n")
                    self._session["pending"] += text
            except BlockingIOError:
                pass
            except OSError:
                break
            await asyncio.sleep(0.05)

    async def get_output(self) -> dict:
        if self._session is None:
            return {"output": "", "running": False, "exit_code": None}

        pending = self._session["pending"]
        self._session["pending"] = ""
        proc = self._session["proc"]

        return {
            "output": pending,
            "running": proc.returncode is None,
            "exit_code": proc.returncode,
        }

    async def send_input(self, text: str) -> dict:
        if self._session is None:
            return {"ok": False}
        try:
            os.write(self._session["master_fd"], text.encode("utf-8"))
            return {"ok": True}
        except OSError as e:
            decky.logger.error(f"send_input: {e}")
            return {"ok": False}

    async def kill_session(self) -> dict:
        await self._end_session()
        return {"ok": True}

    async def _end_session(self):
        if self._session is None:
            return
        session = self._session
        self._session = None
        try:
            session["proc"].kill()
        except Exception:
            pass
        try:
            os.close(session["master_fd"])
        except Exception:
            pass

    async def log_error(self, error: str) -> None:
        decky.logger.error(f"FRONTEND: {error}")

    async def _unload(self):
        await self._end_session()
        decky.logger.info("CachyOS Update plugin unloaded")

    async def _uninstall(self):
        decky.logger.info("CachyOS Update plugin uninstalled")

    async def _migration(self):
        pass
