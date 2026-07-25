import type { CSSProperties } from "react";

/** Display-only; the backend owns the command it actually runs. */
export const UPDATE_COMMAND = "cachy-update";

export const STYLES = {
  outputBox: {
    padding: "8px",
    backgroundColor: "var(--decky-selected-ui-bg)",
    borderRadius: "4px",
    border: "1px solid var(--decky-border-color)",
    fontSize: "10px",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    minHeight: "60px",
    maxHeight: "280px",
    overflowY: "auto",
  },
  placeholder: { color: "#888" },
  statusSuccess: { color: "#22c55e", fontWeight: "bold", fontSize: "13px" },
  statusError: { color: "#ef4444", fontWeight: "bold", fontSize: "13px" },
  statusNeutral: { color: "#e0e0e0", fontSize: "13px" },
} satisfies Record<string, CSSProperties>;
