"use client";
import { useMemo, useRef, useState } from "react";
import { useLang } from "./Providers";

const T = {
  en: { kicker: "Free tools", title: "Handy little tools", sub: "Fast, private, in-browser — nothing is uploaded.", qr: "QR code", pw: "Password", count: "Word counter", b64: "Base64", copy: "Copy", copied: "Copied!", download: "Download", generate: "Generate", qrPh: "Text or URL to encode…", pwLen: "Length", upper: "A-Z", lower: "a-z", nums: "0-9", syms: "!@#", strength: "Strength", countPh: "Paste or type text…", words: "Words", chars: "Characters", noSpace: "No spaces", sentences: "Sentences", lines: "Lines", readTime: "Reading time", min: "min", encode: "Encode", decode: "Decode", b64Ph: "Text to encode / decode…", weak: "Weak", fair: "Fair", good: "Good", strong: "Strong" },
  uz: { kicker: "Bepul vositalar", title: "Foydali kichik vositalar", sub: "Tez, maxfiy, brauzerda — hech narsa yuklanmaydi.", qr: "QR kod", pw: "Parol", count: "Matn hisoblagich", b64: "Base64", copy: "Nusxa", copied: "Nusxalandi!", download: "Yuklab olish", generate: "Yaratish", qrPh: "Kodlanadigan matn yoki URL…", pwLen: "Uzunlik", upper: "A-Z", lower: "a-z", nums: "0-9", syms: "!@#", strength: "Kuchi", countPh: "Matn yozing yoki joylang…", words: "So'zlar", chars: "Belgilar", noSpace: "Probelsiz", sentences: "Gaplar", lines: "Qatorlar", readTime: "O'qish vaqti", min: "daq", encode: "Kodlash", decode: "Dekodlash", b64Ph: "Kodlash / dekodlash uchun matn…", weak: "Zaif", fair: "O'rtacha", good: "Yaxshi", strong: "Kuchli" },
};

export default function Tools() {
  const { lang } = useLang();
  const t = T[lang] || T.en;
  const [tab, setTab] = useState<"qr" | "pw" | "count" | "b64">("qr");
  const tabs: [typeof tab, string, string][] = [["qr", "🔳", t.qr], ["pw", "🔑", t.pw], ["count", "📝", t.count], ["b64", "🔁", t.b64]];
  return (
    <section className="section page-hero">
      <div className="container">
        <div className="section-head">
          <span className="section-kicker"><span className="kicker-num">✶</span> <span>{t.kicker}</span></span>
          <h1 className="section-title">{t.title}</h1>
          <p className="hero-desc" style={{ marginTop: 10 }}>{t.sub}</p>
        </div>
        <div className="filter-bar" style={{ marginBottom: 22 }}>
          {tabs.map(([id, ic, label]) => <button key={id} className={"filter-chip" + (tab === id ? " active" : "")} onClick={() => setTab(id)}>{ic} {label}</button>)}
        </div>
        <div className="tool-card glass">
          {tab === "qr" && <QrTool t={t} />}
          {tab === "pw" && <PwTool t={t} />}
          {tab === "count" && <CountTool t={t} />}
          {tab === "b64" && <B64Tool t={t} />}
        </div>
      </div>
    </section>
  );
}

function CopyBtn({ value, label }: { value: string; label: string }) {
  const [ok, setOk] = useState(false);
  return <button className="btn btn-ghost btn-sm" disabled={!value} onClick={async () => { try { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1400); } catch {} }}>{ok ? "✓" : "⧉"} {label}</button>;
}

function QrTool({ t }: { t: any }) {
  const [text, setText] = useState("");
  const url = text.trim() ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(text)}` : "";
  const download = async () => { try { const r = await fetch(url); const b = await r.blob(); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "qr.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); } catch {} };
  return (
    <div className="tool-pane">
      <input className="tool-in" placeholder={t.qrPh} value={text} onChange={(e) => setText(e.target.value)} />
      {url ? <div className="qr-out"><img src={url} alt="QR" width={240} height={240} /><button className="btn btn-primary btn-sm" onClick={download}>↓ {t.download}</button></div> : <p className="tool-hint">{t.qrPh}</p>}
    </div>
  );
}

function PwTool({ t }: { t: any }) {
  const [len, setLen] = useState(16);
  const [opts, setOpts] = useState({ lower: true, upper: true, nums: true, syms: true });
  const [pw, setPw] = useState("");
  const gen = () => {
    let pool = "";
    if (opts.lower) pool += "abcdefghijkmnpqrstuvwxyz";
    if (opts.upper) pool += "ABCDEFGHJKLMNPQRSTUVWXYZ";
    if (opts.nums) pool += "23456789";
    if (opts.syms) pool += "!@#$%^&*()-_=+[]{}";
    if (!pool) { setPw(""); return; }
    const arr = new Uint32Array(len); crypto.getRandomValues(arr);
    setPw(Array.from(arr, (n) => pool[n % pool.length]).join(""));
  };
  const score = Math.min(3, (opts.lower ? 1 : 0) + (opts.upper ? 1 : 0) + (opts.nums ? 1 : 0) + (opts.syms ? 1 : 0) + (len >= 16 ? 1 : 0) - 1);
  const labels = [t.weak, t.fair, t.good, t.strong];
  return (
    <div className="tool-pane">
      <div className="tool-row"><label>{t.pwLen}: <b>{len}</b></label><input type="range" min={6} max={40} value={len} onChange={(e) => setLen(+e.target.value)} style={{ flex: 1 }} /></div>
      <div className="tool-checks">
        {(["lower", "upper", "nums", "syms"] as const).map((k) => <label key={k} className="tool-check"><input type="checkbox" checked={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })} /> {t[k]}</label>)}
      </div>
      <button className="btn btn-primary" onClick={gen}>{t.generate}</button>
      {pw && <div className="tool-out"><code className="tool-result">{pw}</code><CopyBtn value={pw} label={t.copy} /></div>}
      {pw && <div className="pw-strength"><span>{t.strength}: {labels[Math.max(0, score)]}</span><div className="pw-bar"><i className={"s" + Math.max(0, score)} style={{ width: ((Math.max(0, score) + 1) / 4) * 100 + "%" }} /></div></div>}
    </div>
  );
}

function CountTool({ t }: { t: any }) {
  const [text, setText] = useState("");
  const s = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { words, chars: text.length, noSpace: text.replace(/\s/g, "").length, sentences: (text.match(/[.!?]+/g) || []).length, lines: text ? text.split(/\n/).length : 0, read: Math.max(1, Math.round(words / 200)) };
  }, [text]);
  return (
    <div className="tool-pane">
      <textarea className="tool-area" placeholder={t.countPh} value={text} onChange={(e) => setText(e.target.value)} rows={6} />
      <div className="tool-stats">
        {[[t.words, s.words], [t.chars, s.chars], [t.noSpace, s.noSpace], [t.sentences, s.sentences], [t.lines, s.lines], [t.readTime, `${s.read} ${t.min}`]].map(([l, v], i) => (
          <div className="tool-stat" key={i}><b>{v}</b><span>{l}</span></div>
        ))}
      </div>
    </div>
  );
}

function B64Tool({ t }: { t: any }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"enc" | "dec">("enc");
  const ref = useRef<string>("");
  let out = "";
  try {
    if (!text) out = "";
    else if (mode === "enc") out = btoa(unescape(encodeURIComponent(text)));
    else out = decodeURIComponent(escape(atob(text.trim())));
  } catch { out = "⚠ Invalid input"; }
  ref.current = out;
  return (
    <div className="tool-pane">
      <div className="filter-bar">
        <button className={"filter-chip" + (mode === "enc" ? " active" : "")} onClick={() => setMode("enc")}>{t.encode}</button>
        <button className={"filter-chip" + (mode === "dec" ? " active" : "")} onClick={() => setMode("dec")}>{t.decode}</button>
      </div>
      <textarea className="tool-area" placeholder={t.b64Ph} value={text} onChange={(e) => setText(e.target.value)} rows={4} />
      <div className="tool-out"><code className="tool-result wrap">{out || "—"}</code><CopyBtn value={out} label={t.copy} /></div>
    </div>
  );
}
