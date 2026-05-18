export const STYLES = {
  outputBox: {
    padding: "8px",
    backgroundColor: "var(--decky-selected-ui-bg)",
    borderRadius: "4px",
    border: "1px solid var(--decky-border-color)",
    fontSize: "10px",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-all" as const,
    maxHeight: "200px",
    overflowY: "auto" as const,
  },
  statusSuccess: { color: "#22c55e", fontWeight: "bold", fontSize: "13px" },
  statusError:   { color: "#ef4444", fontWeight: "bold", fontSize: "13px" },
  statusNeutral: { color: "#e0e0e0", fontSize: "13px" },
};

