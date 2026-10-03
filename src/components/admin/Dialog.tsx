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

/* ---------- Toast ----------
   Fixed bottom-center toast — the admin's single flash/status display (the old
   per-card .ad-msg lines were easy to miss on a phone). Success/neutral
   messages auto-clear after ~2.5s; "Error:"/"⚠" messages and in-flight
   statuses (sticky=true) persist until dismissed or replaced. */
type ToastMsg = { msg: React.ReactNode; sticky: boolean };
let toastSubs: ((t: ToastMsg | null) => void)[] = [];
let toastCur: ToastMsg | null = null;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function showToast(msg: React.ReactNode, sticky = typeof msg === "string" && /^(Error|⚠)/.test(msg)) {
  clearTimeout(toastTimer);
  if (msg == null || msg === "") toastCur = null;
  else {
    toastCur = { msg, sticky: !!sticky };
    if (!toastCur.sticky) toastTimer = setTimeout(() => { toastCur = null; toastSubs.forEach((l) => l(null)); }, 2500);
  }
  toastSubs.forEach((l) => l(toastCur));
}
export function ToastHost() {
  const [t, setT] = useState<ToastMsg | null>(toastCur);
  useEffect(() => {
    toastSubs.push(setT);
    return () => { toastSubs = toastSubs.filter((l) => l !== setT); };
  }, []);
  if (!t) return null;
  return (
    <div className="ad-toast" role="status">
      <span>{t.msg}</span>
      {t.sticky && <button type="button" className="ad-toast-x" aria-label="Dismiss" onClick={() => showToast("")}>✕</button>}
    </div>
  );
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
