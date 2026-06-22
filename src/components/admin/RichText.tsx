"use client";
import { useRef, useEffect } from "react";

/* Lightweight dependency-free WYSIWYG editor (contentEditable + toolbar).
   Emits HTML. Loads the initial value once on mount (keyed by the item being
   edited so switching items reloads content without disturbing the cursor). */
export default function RichText({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== (value || "")) ref.current.innerHTML = value || ""; /* eslint-disable-next-line */ }, []);

  const sync = () => { if (ref.current) onChange(ref.current.innerHTML); };
  const exec = (cmd: string, val?: string) => { document.execCommand(cmd, false, val); ref.current?.focus(); sync(); };
  const block = (tag: string) => exec("formatBlock", tag);
  const link = () => { const u = prompt("Link URL:"); if (u) exec("createLink", u); };

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
        <Btn on={() => exec("insertUnorderedList")} title="Bullet list">• –</Btn>
        <Btn on={() => exec("insertOrderedList")} title="Numbered list">1.</Btn>
        <Btn on={link} title="Link">🔗</Btn>
        <Btn on={() => block("<pre>")} title="Code block">{"</>"}</Btn>
        <Btn on={() => exec("removeFormat")} title="Clear formatting">✕</Btn>
      </div>
      <div className="rte-body" ref={ref} contentEditable suppressContentEditableWarning data-ph={placeholder || ""} onInput={sync} onBlur={sync} />
    </div>
  );
}
