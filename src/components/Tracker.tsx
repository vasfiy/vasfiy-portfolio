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

function consented() {
  try { const raw = localStorage.getItem("vt_consent"); if (!raw) return false; return JSON.parse(raw).a === true; } catch { return false; }
}

export default function Tracker() {
  const p = usePathname();
  const last = useRef(typeof window !== "undefined" ? window.location.pathname : "/");
  const q = useRef<Ev[]>([]);
  const enrich = useRef<Record<string, string>>({});
  const send = useRef<(beacon?: boolean) => void>(() => {});
  const started = useRef(false);
  const cleanups = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (skipHost()) return;
    // analytics run only after the visitor accepts them in the consent banner
    const onConsent = () => { if (consented() && !started.current) startTracking(); };
    window.addEventListener("vt-consent", onConsent);
    if (consented()) startTracking();
    return () => {
      window.removeEventListener("vt-consent", onConsent);
      cleanups.current.forEach((fn) => fn());
      cleanups.current = [];
    };

    function startTracking() {
    if (started.current) return;
    started.current = true;
    let vid: string; let sid: string;
    try { vid = localStorage.getItem("vt_vid") || ""; if (!vid) { vid = uid("v"); localStorage.setItem("vt_vid", vid); } } catch { vid = uid("v"); }
    try { sid = sessionStorage.getItem("vt_sid") || ""; if (!sid) { sid = uid("s"); sessionStorage.setItem("vt_sid", sid); } } catch { sid = uid("s"); }

    // UA client hints: the real device MODEL where the browser offers it
    (navigator as any).userAgentData?.getHighEntropyValues?.(["model", "platformVersion", "uaFullVersion"]).then((r: any) => {
      if (r?.model) enrich.current.model = String(r.model).slice(0, 40);
      if (r?.platformVersion) enrich.current.osv = String(r.platformVersion).slice(0, 24);
      if (r?.uaFullVersion) enrich.current.brv = String(r.uaFullVersion).slice(0, 24);
    }).catch(() => {});

    // precise location: one browser permission prompt per visitor, opt-in only
    let gps = "";
    try { gps = localStorage.getItem("vt_gps") || ""; } catch {}
    if (!gps && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try { localStorage.setItem("vt_gps", "granted"); } catch {}
        const { latitude, longitude } = pos.coords;
        enrich.current.lat = String(Math.round(latitude * 1e4) / 1e4);
        enrich.current.lon = String(Math.round(longitude * 1e4) / 1e4);
        let address = "";
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&accept-language=uz`, { headers: { Accept: "application/json" } });
          const j = await r.json();
          const a = j.address || {};
          address = [a.road, a.house_number ? "uy " + a.house_number : "", a.suburb || a.city_district, a.city || a.town || a.village].filter(Boolean).join(", ").slice(0, 160);
        } catch {
          try {
            const r2 = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=uz`);
            const j2 = await r2.json();
            address = [j2.principalSubdivision, j2.locality, j2.countryName].filter(Boolean).join(", ").slice(0, 160);
          } catch {}
        }
        window.vtrack?.("geo_precise", { lat: Number(enrich.current.lat), lon: Number(enrich.current.lon), address });
      }, () => { try { localStorage.setItem("vt_gps", "denied"); } catch {} }, { timeout: 10000, maximumAge: 600000 });
    }

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
      if (!started.current) return;
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

    const cleanup = () => {
      document.removeEventListener("click", onClick, { capture: true } as never);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPagehide);
      if (timer.cur) clearTimeout(timer.cur);
      send.current(true);
    };
    cleanups.current.push(cleanup);
    }
  }, []);

  useEffect(() => {
    if (skipHost() || !p || last.current === p) return;
    last.current = p;
    if (!started.current) return; // no consent yet — nothing is tracked
    q.current.push({ t: Date.now(), type: "page", path: p });
    setTimeout(() => send.current(), 1200);
  }, [p]);

  return null;
}
