"use client";
import { useEffect, useRef, useState } from "react";
import { SITE_GROUPS } from "@/lib/adminSchema";
import * as A from "@/lib/admin";
import CropModal from "./CropModal";

/* ---------------- Site text + Profile/CV ---------------- */
const EXPLORE_KEYS: { k: string; label: string }[] = [
  { k: "gallery", label: "Gallery cover" }, { k: "blog", label: "Journal cover" },
  { k: "library", label: "Library cover" }, { k: "linux", label: "Linux Lab cover" },
];

export function SiteText() {
  const [v, setV] = useState<Record<string, any>>({});
  const [profile, setProfile] = useState<string>("");
  const [cv, setCv] = useState<string>("");
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(0);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  useEffect(() => { A.getSettings().then((s) => { setV(s.siteText || {}); setProfile(s.profilePhoto || ""); setCv(s.cvUrl || ""); setCovers(s.exploreCovers || {}); }); }, []);
  const saveCover = async (k: string, url: string) => { const next = { ...covers, [k]: url }; setCovers(next); await A.setSetting("exploreCovers", next); flash("Cover updated"); };

  const save = async () => {
    const obj: Record<string, any> = {};
    SITE_GROUPS.forEach((g) => g.fields.forEach((f) => {
      const val = v[f.k];
      if (f.t === "list") { const arr = (Array.isArray(val) ? val : String(val || "").split("\n")).map((s: string) => s.trim()).filter(Boolean); if (arr.length) obj[f.k] = arr; }
      else if (val != null && String(val).trim() !== "") obj[f.k] = val;
    }));
    try { await A.setSetting("siteText", obj); flash("✓ Saved — live now"); } catch (e: any) { flash("Error: " + (e.message || e)); }
  };
  const set = (k: string, val: any) => setV((p) => ({ ...p, [k]: val }));

  return (
    <div className="ad-section">
      <div className="ad-head"><h2>📝 Site text</h2>{msg && <span className="ad-msg">{msg}</span>}</div>

      <div className="ad-card">
        <h3>👤 Profile photo &amp; CV</h3>
        <p className="ad-hint">The profile photo replaces the “KT” monogram in the About section (and admin avatar).</p>
        <div className="ad-grid2">
          <Uploader label="Profile photo (About “KT”)" value={profile} accept="image/*" image onDone={async (url) => { setProfile(url); await A.setSetting("profilePhoto", url); flash("Photo updated"); }} />
          <Uploader label="CV (PDF)" value={cv} accept="application/pdf,.pdf" onDone={async (url) => { setCv(url); await A.setSetting("cvUrl", url); flash("CV updated"); }} />
        </div>
      </div>

      <div className="ad-card">
        <h3>🧭 Explore cover photos</h3>
        <p className="ad-hint">Custom cover image for each card in the homepage “Explore” section. Leave empty to auto-pick from content.</p>
        <div className="ad-grid2">
          {EXPLORE_KEYS.map((e) => <Uploader key={e.k} label={e.label} value={covers[e.k] || ""} accept="image/*" image onDone={(url) => saveCover(e.k, url)} />)}
        </div>
      </div>

      {SITE_GROUPS.map((g, gi) => (
        <div className="ad-card" key={g.group}>
          <button className="ad-acc" onClick={() => setOpen(open === gi ? -1 : gi)}>{open === gi ? "▾" : "▸"} {g.group}</button>
          {open === gi && (
            <div className="ad-form">
              {g.fields.map((f) => (
                <label className="ad-field" key={f.k}>
                  <span>{f.label}</span>
                  {f.t === "textarea" || f.t === "list"
                    ? <textarea rows={3} value={Array.isArray(v[f.k]) ? v[f.k].join("\n") : (v[f.k] || "")} onChange={(e) => set(f.k, e.target.value)} />
                    : <input type="text" value={v[f.k] || ""} onChange={(e) => set(f.k, e.target.value)} />}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
      <button className="btn btn-primary" onClick={save}>Save all site text</button>
    </div>
  );
}

function Uploader({ label, value, accept, image, onDone }: { label: string; value: string; accept: string; image?: boolean; onDone: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const up = async (f: File) => { setBusy(true); try { const file = image ? await A.compressImage(f, 1600, 0.88) : f; onDone(await A.uploadFile(file)); } finally { setBusy(false); } };
  return (
    <div className="ad-field">
      <span>{label}</span>
      <div className="ad-upload">
        <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; if (image && /^image\//.test(f.type) && !/gif|svg/.test(f.type)) setCropFile(f); else up(f); if (ref.current) ref.current.value = ""; }} />
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? "⏳…" : value ? "Replace" : "Upload"}</button>
        {value && (image ? <img className="ad-thumb" src={value} alt="" /> : <a href={value} target="_blank" rel="noopener" className="ad-filelink">📄 current ↗</a>)}
      </div>
      {cropFile && <CropModal file={cropFile} onCancel={() => setCropFile(null)} onDone={(f2) => { setCropFile(null); up(f2); }} />}
    </div>
  );
}

/* ---------------- Inbox ---------------- */
export function Inbox() {
  const [msgs, setMsgs] = useState<any[]>([]);
  const load = () => A.listMessages().then(setMsgs);
  useEffect(() => { load(); }, []);
  return (
    <div className="ad-section">
      <div className="ad-head"><h2>📨 Messages ({msgs.length})</h2></div>
      {msgs.length === 0 && <p className="ad-hint">No messages yet.</p>}
      {msgs.map((m) => (
        <div className="ad-card ad-msg-card" key={m.id}>
          <div className="ad-msg-top"><b>{m.name || "(no name)"}</b> <a href={"mailto:" + m.email}>{m.email}</a><span className="ad-msg-date">{new Date(m.created_at).toLocaleString()}</span></div>
          {m.message && <p>{m.message}</p>}
          {m.audio && <audio className="ad-msg-audio" controls src={m.audio} />}
          <button className="btn btn-ghost btn-sm danger" onClick={async () => { if (confirm("Delete message?")) { await A.deleteMessage(m.id); load(); } }}>Delete</button>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Analytics ---------------- */
export function Analytics() {
  const [views, setViews] = useState<any[]>([]);
  useEffect(() => { A.listViews().then(setViews); }, []);
  const total = views.length;
  const week = views.filter((v) => Date.now() - new Date(v.created_at).getTime() < 7 * 864e5).length;
  const today = views.filter((v) => new Date(v.created_at).toDateString() === new Date().toDateString()).length;
  const byPath: Record<string, number> = {};
  views.forEach((v) => { byPath[v.path || "/"] = (byPath[v.path || "/"] || 0) + 1; });
  const top = Object.entries(byPath).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const max = top[0]?.[1] || 1;
  return (
    <div className="ad-section">
      <div className="ad-head"><h2>📊 Analytics</h2></div>
      <div className="ad-stats">
        <div className="ad-stat"><b>{total}</b><span>Total views</span></div>
        <div className="ad-stat"><b>{week}</b><span>Last 7 days</span></div>
        <div className="ad-stat"><b>{today}</b><span>Today</span></div>
      </div>
      <div className="ad-card">
        <h3>Top pages</h3>
        {top.map(([p, n]) => (
          <div className="ad-bar-row" key={p}><span className="ad-bar-label">{p}</span><div className="ad-bar"><i style={{ width: (n / max) * 100 + "%" }} /></div><span className="ad-bar-n">{n}</span></div>
        ))}
        {!top.length && <p className="ad-hint">No views recorded yet.</p>}
      </div>
    </div>
  );
}

/* ---------------- Media library ---------------- */
export function MediaLib() {
  const [files, setFiles] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const load = () => A.listStorage().then(setFiles);
  useEffect(() => { load(); }, []);
  return (
    <div className="ad-section">
      <div className="ad-head"><h2>📁 Media library</h2></div>
      <div className="ad-card">
        <div className="ad-dropzone" onClick={() => ref.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={async (e) => { e.preventDefault(); setBusy(true); for (const f of Array.from(e.dataTransfer.files)) { try { await A.uploadFile(/^image\//.test(f.type) ? await A.compressImage(f) : f); } catch {} } setBusy(false); load(); }}>
          <input ref={ref} type="file" multiple hidden onChange={async (e) => { if (!e.target.files) return; setBusy(true); for (const f of Array.from(e.target.files)) { try { await A.uploadFile(/^image\//.test(f.type) ? await A.compressImage(f) : f); } catch {} } setBusy(false); load(); }} />
          {busy ? "⏳ Uploading…" : "⬆ Drop files or click to upload"}
        </div>
        <div className="ad-media-grid">
          {files.map((f) => (
            <div className="ad-media" key={f.name}>
              {/^image|webp|png|jpg|jpeg|gif/.test(f.type + f.name) ? <img src={f.url} alt="" /> : <div className="ad-media-doc">📄</div>}
              <button onClick={() => navigator.clipboard.writeText(f.url)} title="Copy URL">⧉</button>
              <button className="danger" onClick={async () => { if (confirm("Delete file?")) { await A.removeStorage(f.name); load(); } }} title="Delete">🗑</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
