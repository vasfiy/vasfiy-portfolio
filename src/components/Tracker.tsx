"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/* First-party analytics beacon for vasfiy.com.
   Page views, clicks and custom events batch into /api/track; the server adds
   IP geo + UA parsing. No cookies — the visitor id lives in localStorage and
   the visit id in sessionStorage. Skips the admin host, /admin and localhost.
   Custom events: window.vtrack("name", {meta}) from anywhere in the app. */

function skipHost() {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return h.startsWith("admin.") || h === "localhost" || h === "127.0.0.1";
}
function uid(p: string) { return p + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function hostOf(u: string) { try { return new URL(u).hostname.replace(/^www\./, "").slice(0, 60); } catch { return ""; } }

type Ev = { t: number; type: string; path: string; name?: string; meta?: Record<string, unknown> };

declare global { interface Window { vtrack?: (name: string, meta?: Record<string, unknown>) => void; } }

export default function Tracker() {
  const p = usePathname();
  const last = useRef(typeof window !== "undefined" ? window.location.pathname : "/");
  const q = useRef<Ev[]>([]);
  const enrich = useRef<Record<string, string>>({});
  const send = useRef<(beacon?: boolean) => void>(() => {});

  useEffect(() => {
    if (skipHost()) return;
    let vid: string; let sid: string;
    try { vid = localStorage.getItem("vt_vid") || ""; if (!vid) { vid = uid("v"); localStorage.setItem("vt_vid", vid); } } catch { vid = uid("v"); }
    try { sid = sessionStorage.getItem("vt_sid") || ""; if (!sid) { sid = uid("s"); sessionStorage.setItem("vt_sid", sid); } } catch { sid = uid("s"); }

    // UA client hints: the real device MODEL where the browser offers it
    (navigator as any).userAgentData?.getHighEntropyValues?.(["model", "platformVersion", "uaFullVersion"]).then((r: any) => {
      if (r?.model) enrich.current.model = String(r.model).slice(0, 40);
      if (r?.platformVersion) enrich.current.osv = String(r.platformVersion).slice(0, 24);
      if (r?.uaFullVersion) enrich.current.brv = String(r.uaFullVersion).slice(0, 24);
    }).catch(() => {});

    send.current = (beacon = false) => {
      if (!q.current.length) return;
      const events = q.current.splice(0, 50);
      const body = JSON.stringify({
        sid, vid,
        conn: (navigator as any).connection?.effectiveType || "",
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        utc_offset: -new Date().getTimezoneOffset(),
        screen: `${screen.width}x${screen.height}`,
        lang: navigator.language || "",
        ...enrich.current,
        events,
      });
      try {
        if (beacon && typeof navigator.sendBeacon === "function") navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
        else fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
      } catch {}
    };
    const timer = { cur: 0 as any };
    const kick = () => { if (!timer.cur) timer.cur = setTimeout(() => { timer.cur = 0; send.current(); }, 6000); };
    const push = (e: Ev) => { q.current.push(e); if (q.current.length >= 12) send.current(); else kick(); };

    window.vtrack = (name, meta) => {
      q.current.push({ t: Date.now(), type: "event", path: window.location.pathname, name: String(name).slice(0, 120), ...(meta ? { meta } : {}) });
      setTimeout(() => send.current(), 900);
    };

    // delegated click capture — every interactive element, with its label
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("a,button,input,select,textarea,summary,[role=button],[role=switch]");
      if (!el) return;
      const d = el as HTMLElement;
      const label = (d.getAttribute("aria-label") || d.textContent || (d as HTMLInputElement).placeholder || "").trim().replace(/\s+/g, " ").slice(0, 60);
      const cls = String(d.className || "").split(/\s+/).filter(Boolean).slice(0, 2).join(".");
      push({ t: Date.now(), type: "click", path: window.location.pathname, name: `click:${d.tagName.toLowerCase()}${d.id ? "#" + d.id : ""}${cls ? "." + cls : ""}${label ? " '" + label + "'" : ""}` });
    };
    document.addEventListener("click", onClick, { capture: true });

    const onHide = () => { if (document.visibilityState === "hidden") send.current(true); };
    document.addEventListener("visibilitychange", onHide);
    const onPagehide = () => send.current(true);
    window.addEventListener("pagehide", onPagehide);

    const utm: Record<string, string> = {};
    try { const sp = new URLSearchParams(window.location.search); for (const k of ["utm_source", "utm_medium", "utm_campaign"]) { const v = sp.get(k); if (v) utm[k] = v.slice(0, 60); } } catch {}
    push({ t: Date.now(), type: "page", path: window.location.pathname, ...(Object.keys(utm).length ? { meta: utm } : {}), ...(document.referrer ? { name: "ref:" + hostOf(document.referrer) } : {}) });

    return () => {
      document.removeEventListener("click", onClick, { capture: true } as never);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPagehide);
      if (timer.cur) clearTimeout(timer.cur);
      send.current(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (skipHost() || !p || last.current === p) return;
    last.current = p;
    q.current.push({ t: Date.now(), type: "page", path: p });
    setTimeout(() => send.current(), 1200);
  }, [p]);

  return null;
}
