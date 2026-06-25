"use client";
import { useRef, useEffect, useState } from "react";
import * as A from "@/lib/admin";

/* Lightweight dependency-free WYSIWYG editor (contentEditable + toolbar).
   Emits HTML. Supports inline images, videos and YouTube embeds so a Journal
   article can mix text and media. Loads the initial value once on mount. */
export default function RichText({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  useEffect(() => { if (ref.current && ref.current.innerHTML !== (value || "")) ref.current.innerHTML = value || ""; /* eslint-disable-next-line */ }, []);

  const sync = () => { if (ref.current) onChange(ref.current.innerHTML); };
  const focusEd = () => ref.current?.focus();
  const exec = (cmd: string, val?: string) => { focusEd(); document.execCommand(cmd, false, val); sync(); };
  const block = (tag: string) => exec("formatBlock", tag);
  const link = () => { const u = prompt("Link URL:"); if (u) exec("createLink", u); };
  const insert = (html: string) => { focusEd(); document.execCommand("insertHTML", false, html + "<p><br></p>"); sync(); };

  // Paste as clean text — strips foreign colours/fonts so pasted content is
  // always visible and matches the editor styling. Newlines become paragraphs.
  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = (e.clipboardData.getData("text/plain") || "").replace(/\r/g, "");
    const html = text.split(/\n{2,}/).map((para) => para ? "<p>" + para.replace(/\n/g, "<br>").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!)) + "</p>" : "").join("");
    document.execCommand("insertHTML", false, html || text);
    sync();
  };

  const ytId = (u: string) => { const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/); return m ? m[1] : u.trim(); };
  const addYouTube = () => { const u = prompt("YouTube URL or video ID:"); if (!u) return; const id = ytId(u); insert(`<div class="rte-embed"><iframe src="https://www.youtube.com/embed/${id}" loading="lazy" allowfullscreen></iframe></div>`); };

  const upload = async (file: File, kind: "image" | "video") => {
    setBusy(kind === "image" ? "Uploading image…" : "Uploading video…");
    try {
      const f = kind === "image" ? await A.compressImage(file, 1600, 0.85) : file;
      const url = await A.uploadFile(f);
      insert(kind === "image" ? `<img src="${url}" alt="" loading="lazy">` : `<video src="${url}" controls preload="metadata"></video>`);
    } catch (e: any) { setBusy(`⚠ Upload failed — ${e?.message || e}`); setTimeout(() => setBusy(""), 4000); return; }
    setBusy("");
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
        <Btn on={() => imgRef.current?.click()} title="Insert image">🖼</Btn>
        <Btn on={() => vidRef.current?.click()} title="Insert video">🎬</Btn>
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
