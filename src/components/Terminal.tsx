import { ButtonItem, PanelSection, PanelSectionRow, TextField } from "@decky/ui";
import { type CSSProperties, type FC, useEffect, useRef, useState } from "react";
import { useSession } from "../hooks";
import type { Status } from "../types";
import { STYLES, UPDATE_COMMAND } from "../utils/constants";

const statusLine = (status: Status): { text: string; style: CSSProperties } => {
  switch (status.kind) {
    case "exited":
      return status.code === 0
        ? { text: "Done.", style: STYLES.statusSuccess }
        : { text: `Exited with code ${status.code}.`, style: STYLES.statusError };
    case "killed":
      return { text: "Killed.", style: STYLES.statusNeutral };
    case "error":
      return { text: status.message, style: STYLES.statusError };
    default:
      return { text: "", style: STYLES.statusNeutral };
  }
};

export const Terminal: FC = () => {
  const { status, output, start, send, kill, reset } = useSession();
  const [input, setInput] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);

  // Follow the tail as output streams in. `output` is the trigger, not a value
  // the effect reads, so Biome can't see why it belongs in the dependency list.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every new chunk
  useEffect(() => {
    const box = outputRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [output]);

  const handleSend = () => {
    const text = input;
    setInput("");
    void send(text);
  };

  const isIdle = status.kind === "idle";
  const isRunning = status.kind === "running";
  const { text: statusText, style: statusStyle } = statusLine(status);

  return (
    <PanelSection>
      {isIdle && (
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => void start()}>
            Run {UPDATE_COMMAND}
          </ButtonItem>
        </PanelSectionRow>
      )}

      {!isIdle && (
        <PanelSectionRow>
          <div ref={outputRef} style={STYLES.outputBox}>
            {output || <span style={STYLES.placeholder}>Starting…</span>}
          </div>
        </PanelSectionRow>
      )}

      {isRunning && (
        <>
          <PanelSectionRow>
            <TextField
              label="Input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={handleSend}>
              Send
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={() => void kill()}>
              Kill
            </ButtonItem>
          </PanelSectionRow>
        </>
      )}

      {!isIdle && !isRunning && (
        <>
          <PanelSectionRow>
            <div style={statusStyle}>{statusText}</div>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={() => void reset()}>
              Back
            </ButtonItem>
          </PanelSectionRow>
        </>
      )}
    </PanelSection>
  );
};
