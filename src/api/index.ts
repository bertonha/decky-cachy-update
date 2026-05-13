import { callable } from "@decky/api";
import { SessionOutput } from "../types";

export const startSession = callable<[string], { started: boolean }>("start_session");
export const getOutput    = callable<[], SessionOutput>("get_output");
export const sendInput    = callable<[string], { ok: boolean }>("send_input");
export const killSession  = callable<[], { ok: boolean }>("kill_session");
export const logError     = callable<[string], void>("log_error");
