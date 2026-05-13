import { FC, useState, useRef, useEffect } from "react";
import { ButtonItem, PanelSection, PanelSectionRow, TextField } from "@decky/ui";
import { startSession, getOutput, sendInput, killSession } from "../api";
import { safeAsyncOperation } from "../utils";
import { STYLES } from "../utils/constants";

type Phase = "idle" | "running" | "done";

export const Terminal: FC = () => {
  const [phase, setPhase]   = useState<Phase>("idle");
  const [output, setOutput] = useState("");
  const [input, setInput]       = useState("");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const outputRef   = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const stopPolling = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const handleStart = async () => {
    setOutput(""); setExitCode(null); setPhase("running");
    await safeAsyncOperation(() => startSession("cachy-update"), "Terminal -> start");
    intervalRef.current = setInterval(async () => {
      const data = await safeAsyncOperation(() => getOutput(), "Terminal -> poll");
      if (!data) return;
      if (data.output) {
        setOutput(prev => prev + data.output);
        requestAnimationFrame(() => {
          if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
        });
      }
      if (!data.running) {
        stopPolling();
        setExitCode(data.exit_code ?? null);
        setPhase("done");
      }
    }, 300);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input; setInput("");
    await safeAsyncOperation(() => sendInput(text + "\n"), "Terminal -> send");
  };

  const handleKill = async () => {
    stopPolling();
    await safeAsyncOperation(() => killSession(), "Terminal -> kill");
    setPhase("done"); setExitCode(null);
  };

  const handleReset = () => { setPhase("idle"); setOutput(""); setExitCode(null); };

  return (
    <PanelSection title="CachyOS Update">

      {phase === "idle" && (
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleStart}>Run cachy-update</ButtonItem>
        </PanelSectionRow>
      )}

      {phase !== "idle" && (
        <PanelSectionRow>
          <div ref={outputRef} style={{ ...STYLES.outputBox, maxHeight: "280px", minHeight: "60px" }}>
            {output || <span style={{ color: "#888" }}>Starting…</span>}
          </div>
        </PanelSectionRow>
      )}

      {phase === "running" && (
        <>
          <PanelSectionRow>
            <TextField
              label="Input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={handleSend} disabled={!input.trim()}>Send</ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={handleKill}>Kill</ButtonItem>
          </PanelSectionRow>
        </>
      )}

      {phase === "done" && (
        <>
          <PanelSectionRow>
            <div style={exitCode === 0 ? STYLES.statusSuccess : STYLES.statusError}>
              {exitCode === 0 ? "Done." : exitCode !== null ? `Exited with code ${exitCode}.` : "Killed."}
            </div>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={handleReset}>Back</ButtonItem>
          </PanelSectionRow>
        </>
      )}

    </PanelSection>
  );
};
