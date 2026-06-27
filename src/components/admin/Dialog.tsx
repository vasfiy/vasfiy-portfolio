"use client";
import { useEffect, useState } from "react";

/* Themed replacements for the browser's native prompt()/confirm() — a single
   <DialogHost/> mounted in the admin renders whatever uiPrompt/uiConfirm queue. */
type Req = { kind: "prompt" | "confirm"; message: string; def: string; danger: boolean; okLabel: string; resolve: (v: any) => void };
let listeners: ((r: Req | null) => void)[] = [];
const queue: Req[] = [];
const emit = () => listeners.forEach((l) => l(queue[0] || null));

export function uiPrompt(message: string, def = ""): Promise<string | null> {
  return new Promise((resolve) => { queue.push({ kind: "prompt", message, def, danger: false, okLabel: "OK", resolve }); emit(); });
}
export function uiConfirm(message: string, opts: { danger?: boolean; okLabel?: string } = {}): Promise<boolean> {
  return new Promise((resolve) => { queue.push({ kind: "confirm", message, def: "", danger: opts.danger ?? true, okLabel: opts.okLabel ?? "Delete", resolve }); emit(); });
}

export function DialogHost() {
  const [cur, setCur] = useState<Req | null>(null);
  const [val, setVal] = useState("");
  useEffect(() => {
    const l = (r: Req | null) => { setCur(r); if (r) setVal(r.def); };
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  useEffect(() => {
    if (!cur) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur]);
  if (!cur) return null;
  const finish = (result: any) => { cur.resolve(result); queue.shift(); emit(); };
  const cancel = () => finish(cur.kind === "confirm" ? false : null);
  return (
    <div className="ui-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}>
      <div className="ui-dialog" role="dialog" aria-modal>
        <p className="ui-dialog-msg">{cur.message}</p>
        {cur.kind === "prompt" && (
          <input className="ui-dialog-input" autoFocus value={val} onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") finish(val); }} />
        )}
        <div className="ui-dialog-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>Cancel</button>
          <button type="button" autoFocus={cur.kind === "confirm"} className={"btn btn-sm " + (cur.danger ? "ui-dialog-danger" : "btn-primary")}
            onClick={() => finish(cur.kind === "confirm" ? true : val)}>{cur.kind === "confirm" ? cur.okLabel : "OK"}</button>
        </div>
      </div>
    </div>
  );
}
