import { addEventListener, callable, removeEventListener } from "@decky/api";
import type { SessionState } from "../types";

/** Must match the event names in main.py. */
const EVENT_OUTPUT = "cachy_update/output";
const EVENT_EXIT = "cachy_update/exit";

export const startSession = callable<[], { started: boolean }>("start_session");
export const getState = callable<[], SessionState>("get_state");
export const sendInput = callable<[string], { ok: boolean }>("send_input");
export const killSession = callable<[], { ok: boolean }>("kill_session");
export const logError = callable<[string], void>("log_error");

/** Subscribes and returns the matching unsubscribe, for direct use in useEffect. */
const subscribe = <Args extends unknown[]>(
  event: string,
  listener: (...args: Args) => void,
): (() => void) => {
  addEventListener<Args>(event, listener);
  return () => removeEventListener<Args>(event, listener);
};

export const onOutput = (listener: (chunk: string) => void) =>
  subscribe<[string]>(EVENT_OUTPUT, listener);

export const onExit = (listener: (code: number) => void) =>
  subscribe<[number]>(EVENT_EXIT, listener);
