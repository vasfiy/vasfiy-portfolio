"use client";
import { useRef, useState } from "react";
import type { Block } from "@/lib/types";

const ytId = (u = "") => { const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/); return m ? m[1] : u.trim(); };
const LABEL: Record<Block["type"], string> = { text: "📝 Text", image: "🖼 Image", video: "🎬 Video", youtube: "▶ YouTube", file: "📎 File" };

/* Block-based article composer: an ordered list of text / image / video / youtube /
   file blocks. Reliable (each media is a discrete upload), unlimited, reorderable. */
export default function BlockEditor({ value, onChange, onUpload }: {
  value: Block[]; onChange: (v: Block[]) => void; onUpload: (file: File, isImage: boolean) => Promise<string>;
}) {
  const blocks: Block[] = Array.isArray(value) ? value : [];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (i: number, patch: Partial<Block>) => onChange(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const remove = (i: number) => onChange(blocks.filter((_, j) => j !== i));
  const move = (i: number, dir: number) => { const j = i + dir; if (j < 0 || j >= blocks.length) return; const a = blocks.slice(); [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  const addText = () => onChange([...blocks, { type: "text", text: "", textUz: "" }]);
  const addYouTube = () => onChange([...blocks, { type: "youtube", url: "" }]);
  const addMedia = async (type: "image" | "video" | "file", file: File) => {
    setBusy(true); setErr("");
    try { const url = await onUpload(file, type === "image"); onChange([...blocks, { type, url, name: file.name }]); }
    catch (e: any) { setErr(`Upload failed — ${e?.message || e}`); }
    setBusy(false);
  };

  return (
    <div className="blk-editor">
      <div className="blk-list">
        {blocks.length === 0 && <p className="ad-hint">No blocks yet — add text or media below. The first image becomes the cover.</p>}
        {blocks.map((b, i) => (
          <div className="blk" key={i}>
            <div className="blk-head">
              <span className="blk-type">{LABEL[b.type]}{b.type === "image" && i === blocks.findIndex((x) => x.type === "image") ? " · cover" : ""}</span>
              <div className="blk-ctrl">
                <button type="button" title="Up" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" title="Down" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}>↓</button>
                <button type="button" title="Delete" className="danger" onClick={() => remove(i)}>🗑</button>
              </div>
            </div>
            {b.type === "text" && <>
              <textarea rows={4} placeholder="Text (EN) — blank line = new paragraph" value={b.text || ""} onChange={(e) => update(i, { text: e.target.value })} />
              <textarea rows={4} placeholder="Matn (UZ)" value={b.textUz || ""} onChange={(e) => update(i, { textUz: e.target.value })} />
            </>}
            {b.type === "image" && <>
              {b.url && <img className="blk-media" src={b.url} alt="" />}
              <input placeholder="Caption (EN, optional)" value={b.caption || ""} onChange={(e) => update(i, { caption: e.target.value })} />
              <input placeholder="Izoh (UZ, ixtiyoriy)" value={b.captionUz || ""} onChange={(e) => update(i, { captionUz: e.target.value })} />
            </>}
            {b.type === "video" && <>
              {b.url && <video className="blk-media" src={b.url} controls preload="metadata" />}
              <input placeholder="Caption (EN)" value={b.caption || ""} onChange={(e) => update(i, { caption: e.target.value })} />
            </>}
            {b.type === "youtube" && <>
              <input placeholder="YouTube URL or video ID" value={b.url || ""} onChange={(e) => update(i, { url: e.target.value })} />
              {ytId(b.url) && b.url && <div className="blk-yt"><iframe src={`https://www.youtube.com/embed/${ytId(b.url)}`} title="YouTube" allowFullScreen /></div>}
            </>}
            {b.type === "file" && <a className="ad-filelink" href={b.url} target="_blank" rel="noopener">📎 {b.name || b.url}</a>}
          </div>
        ))}
      </div>
      {err && <p className="ad-up-err">⚠ {err}</p>}
      <div className="blk-add">
        <button type="button" onClick={addText}>＋ Text</button>
        <button type="button" disabled={busy} onClick={() => imgRef.current?.click()}>{busy ? "⏳ Uploading…" : "＋ Image"}</button>
        <button type="button" disabled={busy} onClick={() => vidRef.current?.click()}>＋ Video</button>
        <button type="button" onClick={addYouTube}>＋ YouTube</button>
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}>＋ File</button>
      </div>
      <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addMedia("image", f); if (imgRef.current) imgRef.current.value = ""; }} />
      <input ref={vidRef} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addMedia("video", f); if (vidRef.current) vidRef.current.value = ""; }} />
      <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addMedia("file", f); if (fileRef.current) fileRef.current.value = ""; }} />
    </div>
  );
}
