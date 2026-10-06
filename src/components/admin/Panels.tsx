"use client";
import { useEffect, useRef, useState } from "react";
import { SITE_GROUPS } from "@/lib/adminSchema";
import * as A from "@/lib/admin";
import CropModal from "./CropModal";
import { uiConfirm, showToast } from "./Dialog";

/* ---------------- Site text + Profile/CV ---------------- */
const EXPLORE_KEYS: { k: string; label: string }[] = [
  { k: "library", label: "Library cover" },
  { k: "learning", label: "Learning cover" },
  { k: "linux", label: "Linux lab cover" },
  { k: "tools", label: "Tools cover" },
];

export function SiteText() {
  const [v, setV] = useState<Record<string, any>>({});
  const [profile, setProfile] = useState<string>("");
  const [cv, setCv] = useState<string>("");
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(0);
  // Flash/status messages render in the fixed toast (Dialog.tsx) — success
  // auto-clears, "Error:"/"⚠" persist until dismissed.
  const flash = (m: string) => showToast(m);

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
      <div className="ad-head"><h2>📝 Site text</h2></div>

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
  const [err, setErr] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const up = async (f: File) => {
    setBusy(true); setErr("");
    try {
      const file: A.CompressedFile = image ? await A.compressImage(f, 1600, 0.88) : f;
      onDone(await A.uploadFile(file));
      if (file.uncompressedNote) setErr(file.uncompressedNote);
    } catch (e: any) { setErr(`Upload failed — ${e?.message || e}`); } finally { setBusy(false); }
  };
  return (
    <div className="ad-field">
      <span>{label}</span>
      <div className="ad-upload">
        <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; if (image && /^image\//.test(f.type) && !/gif|svg/.test(f.type)) setCropFile(f); else up(f); if (ref.current) ref.current.value = ""; }} />
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? "⏳…" : value ? "Replace" : "Upload"}</button>
        {value && (image ? <img className="ad-thumb" src={value} alt="" /> : <a href={value} target="_blank" rel="noopener" className="ad-filelink">📄 current ↗</a>)}
      </div>
      {err && <p className="ad-up-err">⚠ {err}</p>}
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
          <button className="btn btn-ghost btn-sm danger" onClick={async () => { if (await uiConfirm("Delete message?")) { await A.deleteMessage(m.id); load(); } }}>Delete</button>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Analytics ---------------- */
const COUNTRY_NAMES: Record<string, string> = { US: "United States", GB: "UK", UZ: "Uzbekistan", RU: "Russia", DE: "Germany", FR: "France", IN: "India", TR: "Türkiye", KZ: "Kazakhstan", CN: "China", JP: "Japan", CA: "Canada", BR: "Brazil", NL: "Netherlands", UA: "Ukraine", PL: "Poland", ES: "Spain", IT: "Italy", KR: "South Korea", AE: "UAE", SA: "Saudi Arabia", AZ: "Azerbaijan", AM: "Armenia", GE: "Georgia", KG: "Kyrgyzstan", TJ: "Tajikistan", TM: "Turkmenistan", AF: "Afghanistan", IR: "Iran", IQ: "Iraq", IL: "Israel", EG: "Egypt", PK: "Pakistan", ID: "Indonesia", MY: "Malaysia", SG: "Singapore", TH: "Thailand", VN: "Vietnam", PH: "Philippines", HK: "Hong Kong", TW: "Taiwan", AU: "Australia", NZ: "New Zealand", MX: "Mexico", AR: "Argentina", CL: "Chile", CO: "Colombia", SE: "Sweden", NO: "Norway", FI: "Finland", DK: "Denmark", CH: "Switzerland", AT: "Austria", BE: "Belgium", CZ: "Czechia", PT: "Portugal", GR: "Greece", RO: "Romania", HU: "Hungary", BG: "Bulgaria", RS: "Serbia", HR: "Croatia", SK: "Slovakia", SI: "Slovenia", LT: "Lithuania", LV: "Latvia", EE: "Estonia", BY: "Belarus", MD: "Moldova", IE: "Ireland" };
const flag = (cc: string) => (/^[A-Za-z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "");

function Breakdown({ title, rows, fmt }: { title: string; rows: [string, number][]; fmt?: (k: string) => string }) {
  const max = rows[0]?.[1] || 1;
  return (
    <div className="ad-card">
      <h3>{title}</h3>
      {rows.length ? rows.map(([k, n]) => (
        <div className="ad-bar-row" key={k}><span className="ad-bar-label">{fmt ? fmt(k) : k}</span><div className="ad-bar"><i style={{ width: (n / max) * 100 + "%" }} /></div><span className="ad-bar-n">{n}</span></div>
      )) : <p className="ad-hint">No data yet.</p>}
    </div>
  );
}

/* Analytics v2 reads the visits + events tables (sql/analytics_v2.sql). All
   time bucketing is pinned to Asia/Tashkent so the charts match the audience
   no matter where the admin browser sits. */
const TK_TZ = "Asia/Tashkent";
const tkHourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TK_TZ, hour: "2-digit", hour12: false });
const tkDayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TK_TZ, year: "numeric", month: "2-digit", day: "2-digit" }); // YYYY-MM-DD
const tkClockFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TK_TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const tkStampFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TK_TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
const tkMonthDayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TK_TZ, day: "numeric", month: "short" });
const tkFmt = (fmt: Intl.DateTimeFormat, iso: any) => { try { const d = iso ? new Date(iso) : null; return d && !isNaN(d.getTime()) ? fmt.format(d) : ""; } catch { return ""; } };
const tkHour = (iso: any) => { const s = tkFmt(tkHourFmt, iso); return s ? parseInt(s, 10) % 24 : -1; }; // some engines emit "24" for midnight
const dayKeyOf = (iso: any) => tkFmt(tkDayFmt, iso);
const metaOf = (e: any): Record<string, any> => (e?.meta && typeof e.meta === "object" && !Array.isArray(e.meta) ? e.meta : {});
const cleanRef = (r: any) => { const s = String(r || "").trim(); return s ? s.replace(/^https?:\/\//i, "").replace(/\/+$/, "") : "(direct)"; };
const countBy = (rows: any[], keyOf: (r: any) => unknown, take: number): [string, number][] => {
  const m: Record<string, number> = {};
  rows.forEach((r) => { const k = String(keyOf(r) ?? "").trim(); if (k) m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, take);
};

type AnalyticsRange = "24h" | "7d" | "30d" | "all";
const RANGES: { k: AnalyticsRange; label: string; ms?: number }[] = [
  { k: "24h", label: "24h", ms: 864e5 },
  { k: "7d", label: "7d", ms: 7 * 864e5 },
  { k: "30d", label: "30d", ms: 30 * 864e5 },
  { k: "all", label: "All" },
];
const EVENT_TYPES: { k: string; label: string }[] = [
  { k: "all", label: "All" },
  { k: "page", label: "Pages" },
  { k: "click", label: "Clicks" },
  { k: "event", label: "Events" },
];

function TelegramReport() {
  const [st, setSt] = useState<{ kind: "idle" | "busy" | "ok" | "warn" | "err"; msg: string }>({ kind: "idle", msg: "" });
  const go = async (send: boolean) => {
    setSt({ kind: "busy", msg: send ? "Sending to Telegram..." : "Building report..." });
    try {
      const { data } = await A.sb().auth.getSession();
      const token = data?.session?.access_token || "";
      if (send) {
        const r = await fetch("/api/report?days=7", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const j = await r.json().catch(() => ({ ok: false, error: "bad response" }));
        if (j.ok && j.sent) setSt({ kind: "ok", msg: `Sent to Telegram (${j.filename})` });
        else if (j.error === "telegram-env-missing") setSt({ kind: "warn", msg: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set in Netlify env yet - report built, sending skipped." });
        else setSt({ kind: "err", msg: String(j.error || "failed") });
      } else {
        const r = await fetch("/api/report?days=7&send=false", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const blob = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "vasfiy-analytics-7d.md";
        a.click();
        URL.revokeObjectURL(a.href);
        setSt({ kind: "ok", msg: "Report downloaded." });
      }
    } catch (e: any) {
      setSt({ kind: "err", msg: String(e?.message || e) });
    }
  };
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
      <button className="btn btn-sm btn-primary" disabled={st.kind === "busy"} onClick={() => go(true)}>📤 Haftalik hisobot → Telegram</button>
      <button className="btn btn-sm btn-ghost" disabled={st.kind === "busy"} onClick={() => go(false)}>⬇ Download .md</button>
      {st.msg ? <span style={{ fontSize: ".82rem", color: st.kind === "err" ? "#ff7a7a" : st.kind === "warn" ? "#e8c46b" : st.kind === "ok" ? "#7ee2a8" : "var(--text-dim)" }}>{st.msg}</span> : null}
    </div>
  );
}

export function Analytics() {
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [visits, setVisits] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false); // visits/events tables not created yet
  const [fDevice, setFDevice] = useState("");
  const [fBrowser, setFBrowser] = useState("");
  const [fCountry, setFCountry] = useState("");
  const [fType, setFType] = useState("all"); // event type filter: all | page | click | event
  const [fPath, setFPath] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set()); // expanded session_ids in Recent visits

  // One fetch per range; device/browser/country/type/path filters stay client-side.
  useEffect(() => {
    let alive = true;
    setLoaded(false);
    (async () => {
      const r = RANGES.find((x) => x.k === range);
      const since = r?.ms ? new Date(Date.now() - r.ms).toISOString() : undefined;
      const [v, e] = await Promise.allSettled([A.listVisits(since), A.listEvents(since)]);
      if (!alive) return;
      setVisits(v.status === "fulfilled" ? v.value : []);
      setEvents(e.status === "fulfilled" ? e.value : []);
      setMissing(v.status === "rejected" || e.status === "rejected");
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [range]);

  /* Filters combine with AND. Session-level filters (device/browser/country)
     narrow the visits first, then events are matched to the surviving sessions
     (only while such a filter is active); the path filter applies to both.
     The event-type filter narrows events only. */
  const q = fPath.trim().toLowerCase();
  const sessionFiltered = !!(fDevice || fBrowser || fCountry);
  const fVisits = visits.filter((v) =>
    (!fDevice || (v.device || "") === fDevice) &&
    (!fBrowser || (v.browser || "") === fBrowser) &&
    (!fCountry || (v.country || "") === fCountry) &&
    (!q || String(v.landing || "").toLowerCase().includes(q) || String(v.exit_path || "").toLowerCase().includes(q)));
  const sessionSet = new Set(fVisits.map((v) => v.session_id).filter(Boolean));
  const evts = events.filter((e) =>
    (!sessionFiltered || sessionSet.has(e.session_id)) &&
    (!q || String(e.path || "").toLowerCase().includes(q)));
  const typed = fType === "all" ? evts : evts.filter((e) => e.type === fType);

  // KPIs — visits/pageviews come from the visit rows, events from the event rows.
  const kVisits = fVisits.length;
  const kVisitors = new Set(fVisits.map((v) => v.visitor_id).filter(Boolean)).size;
  const kViews = fVisits.reduce((m: number, v: any) => m + (v.pageviews || 0), 0);
  const kEvents = typed.filter((e) => e.type !== "page").length; // pageviews are counted separately
  const kAvg = kVisits ? (kViews / kVisits).toFixed(1) : "0";

  // Activity by hour — every loaded event row (pages + clicks + custom), Tashkent time.
  const hours: number[] = new Array(24).fill(0);
  typed.forEach((e) => { const h = tkHour(e.created_at); if (h >= 0) hours[h]++; });
  const hmax = Math.max(1, ...hours);

  // 14-day pageview trend — same spark approach as before, Tashkent calendar days.
  const perDay = new Map<string, number>();
  typed.forEach((e) => { if (e.type !== "page") return; const k = dayKeyOf(e.created_at); if (k) perDay.set(k, (perDay.get(k) || 0) + 1); });
  const days: { label: string; full: string; n: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const k = dayKeyOf(d);
    days.push({ label: k.slice(8), full: tkFmt(tkMonthDayFmt, d), n: perDay.get(k) || 0 });
  }
  const dmax = Math.max(1, ...days.map((x) => x.n));

  // Breakdowns — visit-based cards count VISITS, event-based cards count events.
  const devRows = countBy(fVisits, (v) => v.device, 10);
  const modelRows = countBy(fVisits, (v) => v.model, 12);
  const browserRows = countBy(fVisits, (v) => (v.browser ? (v.browser_version ? `${v.browser} ${v.browser_version}` : v.browser) : ""), 10);
  const osRows = countBy(fVisits, (v) => v.os, 10);
  const countryRows = countBy(fVisits, (v) => v.country, 10);
  const cityRows = countBy(fVisits, (v) => (v.city ? `${v.city}${v.country ? ", " + v.country : ""}` : ""), 12);
  const refRows = countBy(fVisits, (v) => cleanRef(v.referrer), 10);
  const utmRows = countBy(typed, (e) => metaOf(e).utm_source, 10);
  const pageRows = countBy(typed.filter((e) => e.type === "page"), (e) => e.path || "/", 12);
  const clickRows = countBy(typed.filter((e) => e.type === "click"), (e) => e.name, 12);
  const customRows = countBy(typed.filter((e) => e.type === "event"), (e) => e.name, 12);

  // Filter dropdown options come from the whole loaded range (not cross-filtered).
  const opts = (rows: any[], keyOf: (r: any) => unknown) => countBy(rows, keyOf, 9999).map(([k]) => k);
  const deviceOpts = opts(visits, (v) => v.device);
  const browserOpts = opts(visits, (v) => v.browser);
  const countryOpts = opts(visits, (v) => v.country);

  // Recent visits + expandable per-session timeline (chronological).
  const recent = fVisits.slice(0, 30);
  const timelineFor = (sid: string) => typed.filter((e) => e.session_id === sid)
    .slice().sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
  const toggleSession = (sid: string) => setOpen((prev) => { const n = new Set(prev); if (n.has(sid)) n.delete(sid); else n.add(sid); return n; });
  const anyFilter = !!(fDevice || fBrowser || fCountry || q || fType !== "all");
  const resetFilters = () => { setFDevice(""); setFBrowser(""); setFCountry(""); setFType("all"); setFPath(""); };
  const cell = { padding: "6px 8px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };

  return (
    <div className="ad-section">
      <div className="ad-head"><h2>📊 Analytics</h2></div>
      <TelegramReport />

      <div className="ad-card" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
        <div className="ad-field"><span>Range</span>
          <div style={{ display: "flex", gap: 6 }}>
            {RANGES.map((r) => <button key={r.k} className={`btn btn-sm ${range === r.k ? "btn-primary" : "btn-ghost"}`} onClick={() => setRange(r.k)}>{r.label}</button>)}
          </div>
        </div>
        <label className="ad-field" style={{ minWidth: 130 }}><span>Device</span>
          <select value={fDevice} onChange={(e) => setFDevice(e.target.value)}><option value="">All</option>{deviceOpts.map((d) => <option key={d} value={d}>{d}</option>)}</select>
        </label>
        <label className="ad-field" style={{ minWidth: 130 }}><span>Browser</span>
          <select value={fBrowser} onChange={(e) => setFBrowser(e.target.value)}><option value="">All</option>{browserOpts.map((b) => <option key={b} value={b}>{b}</option>)}</select>
        </label>
        <label className="ad-field" style={{ minWidth: 130 }}><span>Country</span>
          <select value={fCountry} onChange={(e) => setFCountry(e.target.value)}><option value="">All</option>{countryOpts.map((c) => <option key={c} value={c}>{flag(c)} {COUNTRY_NAMES[c] || c}</option>)}</select>
        </label>
        <label className="ad-field" style={{ minWidth: 120 }}><span>Event type</span>
          <select value={fType} onChange={(e) => setFType(e.target.value)}>{EVENT_TYPES.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}</select>
        </label>
        <label className="ad-field" style={{ flex: 1, minWidth: 180 }}><span>Path contains</span>
          <input type="text" placeholder="e.g. /library" value={fPath} onChange={(e) => setFPath(e.target.value)} />
        </label>
        {anyFilter && <button className="btn btn-ghost btn-sm" onClick={resetFilters}>Reset filters</button>}
      </div>

      {!loaded && <p className="ad-hint">⏳ Loading analytics…</p>}

      {loaded && missing && <p className="ad-hint">⚠ Analytics tables not ready — run sql/analytics_v2.sql in Supabase first.</p>}

      {loaded && !missing && (
        <>
          <div className="ad-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <div className="ad-stat"><b>{kVisits}</b><span>Visits</span></div>
            <div className="ad-stat"><b>{kVisitors}</b><span>Unique visitors</span></div>
            <div className="ad-stat"><b>{kViews}</b><span>Pageviews</span></div>
            <div className="ad-stat"><b>{kEvents}</b><span>Events</span></div>
            <div className="ad-stat"><b>{kAvg}</b><span>Avg pages / visit</span></div>
          </div>

          <div className="ad-card">
            <h3>⏰ Activity by hour (Tashkent time)</h3>
            {typed.length ? (
              <div className="ad-spark">
                {hours.map((n, h) => (
                  <div className="ad-spark-col" key={h} title={`${String(h).padStart(2, "0")}:00 — ${n}`}>
                    <i style={{ height: (n / hmax) * 100 + "%" }} /><span>{h % 3 === 0 ? String(h).padStart(2, "0") : ""}</span>
                  </div>
                ))}
              </div>
            ) : <p className="ad-hint">No data yet.</p>}
          </div>

          <div className="ad-card">
            <h3>📅 Last 14 days (pageviews)</h3>
            <div className="ad-spark">
              {days.map((x, i) => (
                <div className="ad-spark-col" key={i} title={`${x.full}: ${x.n}`}><i style={{ height: (x.n / dmax) * 100 + "%" }} /><span>{x.label}</span></div>
              ))}
            </div>
          </div>

          <div className="ad-analytics-grid">
            <Breakdown title="💻 Devices" rows={devRows} />
            <Breakdown title="📱 Device models" rows={modelRows} />
            <Breakdown title="🧭 Browsers" rows={browserRows} />
            <Breakdown title="⚙️ Operating system" rows={osRows} />
            <Breakdown title="🌍 Countries" rows={countryRows} fmt={(k) => `${flag(k)} ${COUNTRY_NAMES[k] || k}`} />
            <Breakdown title="🏙 Cities" rows={cityRows} />
            <Breakdown title="🔗 Referrers" rows={refRows} />
            <Breakdown title="📣 UTM sources" rows={utmRows} />
            <Breakdown title="📄 Top pages" rows={pageRows} />
            <Breakdown title="🖱 Top clicked elements" rows={clickRows} />
            <Breakdown title="⚡ Custom events" rows={customRows} />
          </div>

          <div className="ad-card">
            <h3>🕓 Recent visits — newest 30{anyFilter ? " (filtered)" : ""} · click a row for its timeline</h3>
            {recent.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem" }}>
                  <thead>
                    <tr>{["", "When", "Geo", "Device", "Browser / OS", "Landing", "Pages", "Referrer"].map((h, i) => (
                      <th key={i} style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--border-strong)", color: "var(--text-dim)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {recent.map((v, i) => {
                      const sid = String(v.session_id || `row-${i}`);
                      const isOpen = open.has(sid);
                      const tl = isOpen ? timelineFor(String(v.session_id || "")) : [];
                      return [
                        <tr key={sid} onClick={() => toggleSession(sid)} style={{ cursor: "pointer" }} title="Show/hide this session's event timeline">
                          <td style={{ ...cell, color: "var(--text-faint)" }}>{isOpen ? "▾" : "▸"}</td>
                          <td style={cell}>{tkFmt(tkStampFmt, v.last_seen_at) || "—"}</td>
                          <td style={cell}>{flag(v.country || "")} {v.city || COUNTRY_NAMES[v.country || ""] || v.country || "—"}</td>
                          <td style={cell}>{v.device || "—"}{v.model ? ` · ${v.model}` : ""}</td>
                          <td style={cell}>{v.browser || "—"}{v.browser_version ? ` ${v.browser_version}` : ""} / {v.os || "—"}</td>
                          <td style={{ ...cell, whiteSpace: "normal", maxWidth: 180, overflowWrap: "anywhere" }}>{v.landing || "/"}</td>
                          <td style={{ ...cell, textAlign: "right" }}>{v.pageviews ?? 0}</td>
                          <td style={{ ...cell, color: "var(--text-dim)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{cleanRef(v.referrer)}</td>
                        </tr>,
                        isOpen ? (
                          <tr key={sid + ":tl"}>
                            <td colSpan={8} style={{ padding: "8px 12px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                              {tl.length ? tl.map((e, j) => (
                                <div key={j} style={{ display: "flex", gap: 10, padding: "3px 0", fontSize: ".8rem", borderBottom: j < tl.length - 1 ? "1px dashed var(--border)" : "none" }}>
                                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "var(--text-faint)", whiteSpace: "nowrap" }}>{tkFmt(tkClockFmt, e.created_at) || "—"}</span>
                                  <span style={{ color: "var(--cyan)", minWidth: 48 }}>{e.type || "?"}</span>
                                  <span style={{ color: "var(--text-dim)", whiteSpace: "nowrap" }}>{e.path || "—"}</span>
                                  {e.name ? <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span> : null}
                                </div>
                              )) : <p className="ad-hint">No events for this session in the current range/filters.</p>}
                            </td>
                          </tr>
                        ) : null,
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            ) : <p className="ad-hint">No data yet.</p>}
          </div>
        </>
      )}
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
  // Upload everything, then flash a summary — failures used to vanish into `catch {}`.
  const uploadAll = async (list: File[]) => {
    setBusy(true);
    let failed = 0, lastErr = "", uncompressed = 0;
    for (const f of list) {
      try {
        const file: A.CompressedFile = /^image\//.test(f.type) ? await A.compressImage(f) : f;
        await A.uploadFile(file);
        if (file.uncompressedNote) uncompressed++;
      } catch (e: any) { failed++; lastErr = e?.message || String(e); }
    }
    setBusy(false); load();
    if (failed) showToast(`⚠ ${failed} file${failed === 1 ? "" : "s"} failed to upload — ${lastErr}`);
    else if (uncompressed) showToast(`⚠ ${uncompressed} file${uncompressed === 1 ? " was" : "s were"} uploaded uncompressed (original kept)`);
  };
  const copyUrl = async (url: string) => {
    try { await navigator.clipboard.writeText(url); showToast("✓ URL copied"); }
    catch (e: any) { showToast("Error: couldn't copy — " + (e?.message || e)); }
  };
  return (
    <div className="ad-section">
      <div className="ad-head"><h2>📁 Media library</h2></div>
      <div className="ad-card">
        <div className="ad-dropzone" onClick={() => ref.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={async (e) => { e.preventDefault(); await uploadAll(Array.from(e.dataTransfer.files)); }}>
          <input ref={ref} type="file" multiple hidden onChange={async (e) => { if (!e.target.files) return; await uploadAll(Array.from(e.target.files)); if (ref.current) ref.current.value = ""; }} />
          {busy ? "⏳ Uploading…" : "⬆ Drop files or click to upload"}
        </div>
        {files.length > 0 && <p className="ad-hint">Showing newest {files.length} file{files.length > 1 ? "s" : ""} (storage list caps at 200).</p>}
        <div className="ad-media-grid">
          {files.map((f) => (
            <div className="ad-media" key={f.name}>
              {/^image|webp|png|jpg|jpeg|gif/.test(f.type + f.name) ? <img src={f.url} alt="" /> : <div className="ad-media-doc">📄</div>}
              <button onClick={() => copyUrl(f.url)} title="Copy URL">⧉</button>
              <button className="danger" onClick={async () => { if (await uiConfirm(`Delete "${f.name}"? This may break items still using it.`)) { await A.removeStorage(f.name); load(); } }} title="Delete">🗑</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
