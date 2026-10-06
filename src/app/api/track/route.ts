import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/* First-party analytics endpoint.
   - v1 legacy: single { path, ref } payload -> one pageviews row (kept working)
   - v2: batched { sid, vid, events[] } -> events rows + atomic visit upsert
   Enrichment: UA parsing server-side, device model from UA-CH (client), and
   geography from Netlify's edge geo header (country/city/region/lat/lon) plus
   the connecting IP. Same-origin guarded, rate-limited, bots skipped. */

function parseUA(ua: string) {
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod|iOS/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "Other";
  const osVersion = (ua.match(/(?:Android\s([\d.]+))|(?:OS\s([\d_]+))|(?:Windows NT\s([\d.]+))/) || []).slice(1).find(Boolean)?.toString().replace(/_/g, ".") || "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Other";
  const browserVersion = (ua.match(/(?:Edg|OPR|SamsungBrowser|Firefox|Chrome|Version)\/([\d.]+)/) || [])[1] || "";
  const device = /iPad|Tablet/.test(ua) ? "Tablet" : /Mobile|Android|iPhone|iPod/.test(ua) ? "Mobile" : "Desktop";
  return { os, osVersion: osVersion.slice(0, 24), browser, browserVersion: browserVersion.slice(0, 24), device };
}

function refHost(ref: string) {
  if (!ref) return "";
  try { return new URL(ref).hostname.replace(/^www\./, "").slice(0, 60); } catch { return ""; }
}

function detectGeo(req: Request) {
  let country = "", city = "", region = "", lat: number | null = null, lon: number | null = null;
  const geoRaw = req.headers.get("x-nf-geo");
  if (geoRaw) {
    try {
      const g = JSON.parse(Buffer.from(geoRaw, "base64").toString("utf8"));
      country = g?.country?.code || g?.country?.name || "";
      city = g?.city || "";
      region = g?.region || "";
      if (typeof g?.latitude === "number") lat = g.latitude;
      if (typeof g?.longitude === "number") lon = g.longitude;
    } catch {}
  }
  if (!country) country = req.headers.get("x-country") || req.headers.get("x-nf-country") || req.headers.get("cf-ipcountry") || "";
  if (!city) city = req.headers.get("x-nf-city") || req.headers.get("x-vercel-ip-city") || "";
  return {
    country: decodeURIComponent(country).toUpperCase().slice(0, 60),
    city: decodeURIComponent(city).slice(0, 80),
    region: decodeURIComponent(region).slice(0, 80),
    lat, lon,
  };
}

function sameOrigin(req: Request) {
  const norm = (h: string) => h.replace(/^www\./, "").toLowerCase();
  const target = norm(req.headers.get("x-forwarded-host") || req.headers.get("host") || "vasfiy.com");
  const hostOf = (u: string) => { try { return norm(new URL(u).host); } catch { return ""; } };
  const ok = (h: string) => h === target || h.endsWith(".vasfiy.com");
  const origin = req.headers.get("origin");
  if (origin) return ok(hostOf(origin));
  const referer = req.headers.get("referer");
  if (referer) return ok(hostOf(referer));
  return false;
}

const hits = new Map<string, number[]>();
function limited(req: Request, max: number, windowMs: number) {
  const ip = req.headers.get("x-nf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "?";
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(ip, arr); return true; }
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return false;
}

type RawEv = { t?: number; type?: string; path?: string; name?: string; meta?: unknown };

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return Response.json({ ok: false }, { status: 403 });
    if (limited(req, 120, 60_000)) return Response.json({ ok: false }, { status: 429 });
    const ua = req.headers.get("user-agent") || "";
    if (/bot|crawl|spider|preview|lighthouse|headless/i.test(ua)) return Response.json({ ok: true, skipped: "bot" });

    const body = await req.json().catch(() => ({} as any));
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return Response.json({ ok: true, skipped: "no-env" });
    const sb = createClient(url, anon);

    const { os, osVersion, browser, browserVersion, device } = parseUA(ua);
    const geo = detectGeo(req);
    const ip = (req.headers.get("x-nf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "").trim().slice(0, 64);
    const clean = (v: unknown, n: number) => String(v ?? "").slice(0, n).trim();

    // ---- v1 legacy payload: single page view ----
    if (!Array.isArray(body?.events)) {
      const path = clean(body?.path || "/", 200);
      if (!path) return Response.json({ ok: true });
      const ref = clean(body?.ref || "", 120);
      const { error } = await sb.from("pageviews").insert({
        path, referrer: refHost(ref) || "Direct", browser, os, device,
        screen: clean(body?.screen, 16), lang: clean(body?.lang, 12),
        country: geo.country, city: geo.city,
      });
      if (error) return Response.json({ ok: true, skipped: "table" });
      return Response.json({ ok: true });
    }

    // ---- v2 batch ----
    const sid = clean(body.sid, 40).replace(/[^A-Za-z0-9_-]/g, "");
    if (!sid || !/^[A-Za-z0-9_-]{3,40}$/.test(sid)) return Response.json({ ok: false, error: "sid" }, { status: 400 });
    const vid = clean(body.vid, 40).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
    const now = Date.now();
    const events = (body.events as RawEv[])
      .slice(0, 50)
      .map((e) => ({
        t: typeof e.t === "number" && Math.abs(now - e.t) < 86400_000 ? new Date(e.t).toISOString() : new Date().toISOString(),
        type: e.type === "click" || e.type === "event" || e.type === "page" ? e.type : "event",
        path: clean(e.path, 200),
        name: clean(e.name, 120),
        metaRaw: e.meta,
      }))
      .filter((e) => e.path || e.name);

    const firstPage = events.find((e) => e.type === "page");
    const refName = firstPage?.name?.startsWith("ref:") ? firstPage.name.slice(4) : "";
    const utmFromMeta = (() => {
      try { const m = firstPage?.metaRaw && typeof firstPage.metaRaw === "object" ? (firstPage.metaRaw as any) : {}; return clean(m.utm_source, 60); } catch { return ""; }
    })();

    const pages = events.filter((e) => e.type === "page").length;
    const visit = {
      sid, vid: vid || null,
      ip: ip || null, country: geo.country || null, city: geo.city || null, region: geo.region || null,
      lat: geo.lat, lon: geo.lon,
      device, model: clean(body.model, 40), os, os_version: clean(body.osv || osVersion, 24),
      browser, browser_version: clean(body.brv || browserVersion, 24),
      screen: clean(body.screen, 16), lang: clean(body.lang, 12), tz: clean(body.tz, 40),
      utc_offset: Number.isFinite(body.utc_offset) ? Math.max(-840, Math.min(840, Math.round(body.utc_offset))) : null,
      conn: clean(body.conn, 12), referrer: refName, landing: firstPage?.path || "",
      pages, events: events.length,
    };
    const { error: visitErr } = await sb.rpc("touch_visit", { payload: visit });
    if (visitErr) return Response.json({ ok: true, skipped: "visits" });

    const { error: evErr } = await sb.from("events").insert(events.map((e) => {
      let meta: Record<string, unknown> | null = null;
      if (e.metaRaw && typeof e.metaRaw === "object") { try { meta = JSON.parse(JSON.stringify(e.metaRaw).slice(0, 1000)); } catch { meta = null; } }
      return { session_id: sid, visitor_id: vid || null, created_at: e.t, type: e.type, path: e.path, name: e.name || null, meta };
    }));
    if (evErr) return Response.json({ ok: true, skipped: "events" });

    // legacy aggregate row per page view keeps the existing widgets working
    for (const e of events.filter((e) => e.type === "page")) {
      await sb.from("pageviews").insert({
        path: e.path || "/", referrer: refName || "Direct", browser, os, device,
        screen: clean(body.screen, 16), lang: clean(body.lang, 12), country: geo.country, city: geo.city,
      }).then(undefined, () => {});
    }

    return Response.json({ ok: true, counted: events.length });
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
}

export async function GET() {
  return Response.json({ ok: true });
}
