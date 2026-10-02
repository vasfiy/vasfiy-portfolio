"use client";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./Providers";

export default function VoiceRecorder({ onChange, label }: { onChange: (b: Blob | null) => void; label?: string }) {
  const { t } = useLang();
  const [rec, setRec] = useState(false);
  const [url, setUrl] = useState("");
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState("");
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Unmount cleanup: kill the seconds timer and release the mic so no track stays hot after leaving the page
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    const m = mr.current;
    if (m) {
      m.onstop = null; // leaving the page — no blob/callback needed
      if (m.state !== "inactive") m.stop();
      m.stream.getTracks().forEach((tr) => tr.stop());
    }
  }, []);

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
    } catch { setErr(t("voice.micError")); }
  };
  const stop = () => { mr.current?.stop(); setRec(false); if (timer.current) clearInterval(timer.current); };
  const clear = () => { setUrl(""); onChange(null); };
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="voice-rec">
      {label && <span className="voice-label">{label}</span>}
      <div className="voice-row">
        {!rec && !url && <button type="button" className="voice-btn" onClick={start}>{t("voice.record")}</button>}
        {rec && <button type="button" className="voice-btn is-rec" onClick={stop}><span className="rec-dot" /> {t("voice.stop")} · {mmss(secs)}</button>}
        {url && !rec && <><audio controls src={url} /><button type="button" className="voice-x" onClick={clear} title={t("voice.remove")}>✕</button></>}
      </div>
      {err && <span className="voice-err">{err}</span>}
    </div>
  );
}
