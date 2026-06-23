"use client";
import { useRef, useState } from "react";

export default function VoiceRecorder({ onChange, label }: { onChange: (b: Blob | null) => void; label?: string }) {
  const [rec, setRec] = useState(false);
  const [url, setUrl] = useState("");
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState("");
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    setErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const m = new MediaRecorder(s);
      chunks.current = [];
      m.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      m.onstop = () => {
        const blob = new Blob(chunks.current, { type: m.mimeType || "audio/webm" });
        setUrl(URL.createObjectURL(blob)); onChange(blob);
        s.getTracks().forEach((t) => t.stop());
      };
      m.start(); mr.current = m; setRec(true); setSecs(0);
      timer.current = setInterval(() => setSecs((x) => x + 1), 1000);
    } catch { setErr("Microphone access denied."); }
  };
  const stop = () => { mr.current?.stop(); setRec(false); if (timer.current) clearInterval(timer.current); };
  const clear = () => { setUrl(""); onChange(null); };
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="voice-rec">
      {label && <span className="voice-label">{label}</span>}
      <div className="voice-row">
        {!rec && !url && <button type="button" className="voice-btn" onClick={start}>🎙 Record</button>}
        {rec && <button type="button" className="voice-btn is-rec" onClick={stop}><span className="rec-dot" /> Stop · {mmss(secs)}</button>}
        {url && !rec && <><audio controls src={url} /><button type="button" className="voice-x" onClick={clear} title="Remove">✕</button></>}
      </div>
      {err && <span className="voice-err">{err}</span>}
    </div>
  );
}
