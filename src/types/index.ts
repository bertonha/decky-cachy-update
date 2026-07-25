/** Shape of the backend's `get_state` response. */
export interface SessionState {
  output: string;
  running: boolean;
  exit_code: number | null;
}

/**
 * What the panel is currently showing. Modelled as a union so "finished with a
 * code" and "killed by the user" can't be confused for one another.
 */
export type Status =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "exited"; code: number }
  | { kind: "killed" }
  | { kind: "error"; message: string };
