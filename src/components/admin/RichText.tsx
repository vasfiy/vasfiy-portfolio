"use client";
import { useRef, useEffect, useState } from "react";
import * as A from "@/lib/admin";
import { uiPrompt } from "./Dialog";

/* Lightweight dependency-free WYSIWYG editor (contentEditable + toolbar).
   Emits HTML. Supports inline images, videos and YouTube embeds so a Journal
   article can mix text and media. Loads the initial value once on mount. */
export default function RichText({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  // Load once; unwrap any <pre> misused as a text container so old content edits cleanly.
  useEffect(() => {
    const v = (value || "").replace(/<pre>\s*(<(?:p|div|h[1-6]|ul|ol|blockquote)[\s\S]*?)<\/pre>/gi, "$1");
    if (ref.current && ref.current.innerHTML !== v) ref.current.innerHTML = v;
    /* eslint-disable-next-line */
  }, []);

  const sync = () => { if (ref.current) onChange(ref.current.innerHTML); };
  const focusEd = () => ref.current?.focus();
  const exec = (cmd: string, val?: string) => { focusEd(); document.execCommand(cmd, false, val); sync(); };
  const block = (tag: string) => exec("formatBlock", tag);
  // Save/restore the editor selection across the (focus-stealing) prompt modal
  const savedRange = useRef<Range | null>(null);
  const saveSel = () => { const s = window.getSelection(); savedRange.current = s && s.rangeCount ? s.getRangeAt(0).cloneRange() : null; };
  const restoreSel = () => { const s = window.getSelection(); if (savedRange.current && s) { s.removeAllRanges(); s.addRange(savedRange.current); } };
  const link = async () => { saveSel(); const u = await uiPrompt("Link URL:"); if (!u) return; focusEd(); restoreSel(); document.execCommand("createLink", false, u); sync(); };

  // Bulletproof insertion: try at the saved cursor, otherwise append to the end.
  // Either way the media ends up in the content (the previous execCommand path could silently no-op).
  const insert = (html: string) => {
    const el = ref.current; if (!el) return;
    let inserted = false;
    try {
      const r = savedRange.current;
      if (r && el.contains(r.startContainer)) {
        const temp = document.createElement("div"); temp.innerHTML = html;
        const frag = document.createDocumentFragment(); while (temp.firstChild) frag.appendChild(temp.firstChild);
        r.collapse(false); r.insertNode(frag); inserted = true;
      }
    } catch { /* fall through to append */ }
    if (!inserted) el.insertAdjacentHTML("beforeend", html + "<p><br></p>");
    sync();
  };

  // Paste plain text at the cursor (insertText reliably handles empty editors and newlines).
  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = (e.clipboardData.getData("text/plain") || "").replace(/\r/g, "");
    document.execCommand("insertText", false, text);
    sync();
  };

  const ytId = (u: string) => { const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/); return m ? m[1] : u.trim(); };
  const addYouTube = async () => { saveSel(); const u = await uiPrompt("YouTube URL or video ID:"); if (!u) return; const id = ytId(u); insert(`<div class="rte-embed"><iframe src="https://www.youtube.com/embed/${id}" loading="lazy" allowfullscreen></iframe></div>`); };

  const upload = async (file: File, kind: "image" | "video") => {
    setBusy(kind === "image" ? "Uploading image…" : "Uploading video…");
    let url = "";
    try {
      const f = kind === "image" ? await A.compressImage(file, 1600, 0.85) : file;
      url = await A.uploadFile(f);
    } catch (e: any) { console.error("RichText upload failed:", e); setBusy(`⚠ Upload failed — ${e?.message || e?.error?.message || JSON.stringify(e)}`); setTimeout(() => setBusy(""), 6000); return; }
    try {
      insert(kind === "image" ? `<img src="${url}" alt="" loading="lazy">` : `<video src="${url}" controls preload="metadata"></video>`);
      setBusy("✓ Inserted"); setTimeout(() => setBusy(""), 1500);
    } catch (e: any) { console.error("RichText insert failed:", e); setBusy(`⚠ Insert failed — ${e?.message || e}`); setTimeout(() => setBusy(""), 6000); }
  };

  const Btn = ({ on, title, children }: { on: () => void; title: string; children: React.ReactNode }) => (
    <button type="button" title={title} onMouseDown={(e) => { e.preventDefault(); on(); }}>{children}</button>
  );

  return (
    <div className="rte">
      <div className="rte-bar">
        <Btn on={() => exec("bold")} title="Bold"><b>B</b></Btn>
        <Btn on={() => exec("italic")} title="Italic"><i>I</i></Btn>
        <Btn on={() => block("<h3>")} title="Heading">H</Btn>
        <Btn on={() => block("<p>")} title="Paragraph">¶</Btn>
        <Btn on={() => block("<blockquote>")} title="Quote">❝</Btn>
        <Btn on={() => exec("insertUnorderedList")} title="Bullet list">• –</Btn>
        <Btn on={() => exec("insertOrderedList")} title="Numbered list">1.</Btn>
        <Btn on={link} title="Link">🔗</Btn>
        <Btn on={() => block("<pre>")} title="Code block">{"</>"}</Btn>
        <span className="rte-sep" />
        <Btn on={() => { saveSel(); imgRef.current?.click(); }} title="Insert image">🖼</Btn>
        <Btn on={() => { saveSel(); vidRef.current?.click(); }} title="Insert video">🎬</Btn>
        <Btn on={addYouTube} title="Embed YouTube">▶</Btn>
        <span className="rte-sep" />
        <Btn on={() => exec("removeFormat")} title="Clear formatting">✕</Btn>
        {busy && <span className="rte-busy">{busy}</span>}
      </div>
      <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "image"); if (imgRef.current) imgRef.current.value = ""; }} />
      <input ref={vidRef} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "video"); if (vidRef.current) vidRef.current.value = ""; }} />
      <div className="rte-body" ref={ref} contentEditable suppressContentEditableWarning data-ph={placeholder || ""} onInput={sync} onBlur={sync} onPaste={onPaste} />
    </div>
  );
}
