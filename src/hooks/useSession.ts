import { useCallback, useEffect, useState } from "react";
import { getState, killSession, onExit, onOutput, sendInput, startSession } from "../api";
import type { Status } from "../types";
import { safeAsync } from "../utils";
import { UPDATE_COMMAND } from "../utils/constants";

export interface Session {
  status: Status;
  output: string;
  start: () => Promise<void>;
  send: (text: string) => Promise<void>;
  kill: () => Promise<void>;
  reset: () => Promise<void>;
}

/**
 * Mirrors the backend session. Output arrives as pushed events rather than by
 * polling; `sync` pulls the authoritative transcript on mount and once a run
 * ends, which also covers anything emitted while the panel was being remounted.
 */
export const useSession = (): Session => {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [output, setOutput] = useState("");

  const sync = useCallback(async () => {
    const state = await safeAsync(getState, "useSession -> sync");
    if (!state) return;
    setOutput(state.output);
    if (state.running) setStatus({ kind: "running" });
    else if (state.exit_code !== null) setStatus({ kind: "exited", code: state.exit_code });
    else if (state.output) setStatus({ kind: "killed" });
    else setStatus({ kind: "idle" });
  }, []);

  useEffect(() => {
    const offOutput = onOutput((chunk) => setOutput((prev) => prev + chunk));
    const offExit = onExit((code) => {
      setStatus({ kind: "exited", code });
      // Trailing chunks may still be in flight; the backend transcript wins.
      void sync();
    });
    void sync();
    return () => {
      offOutput();
      offExit();
    };
  }, [sync]);

  const start = useCallback(async () => {
    setOutput("");
    setStatus({ kind: "running" });
    const result = await safeAsync(startSession, "useSession -> start");
    if (!result?.started) {
      setStatus({ kind: "error", message: `Could not start ${UPDATE_COMMAND}.` });
    }
  }, []);

  const send = useCallback(async (text: string) => {
    await safeAsync(() => sendInput(`${text}\n`), "useSession -> send");
  }, []);

  const kill = useCallback(async () => {
    await safeAsync(killSession, "useSession -> kill");
    setStatus({ kind: "killed" });
  }, []);

  // Discards the finished session on the backend as well, so the transcript and
  // exit code can't be restored by the next sync(); the panel comes back on a
  // clean Run button instead of the previous run's result.
  const reset = useCallback(async () => {
    setOutput("");
    setStatus({ kind: "idle" });
    await safeAsync(killSession, "useSession -> reset");
  }, []);

  return { status, output, start, send, kill, reset };
};
