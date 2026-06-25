import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/* Privacy-friendly page-view tracking. Stores no IP address and no cookie —
   only coarse, aggregate signals (page, referrer host, browser, OS, device,
   screen bucket, language, and country/city from Netlify's edge geo headers).
   No-ops gracefully if the insert fails (e.g. before the SQL migration runs),
   so navigation is never affected. */

function parseUA(ua: string) {
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod|iOS/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "Other";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Other";
  const device = /iPad|Tablet/.test(ua) ? "Tablet" : /Mobile|Android|iPhone|iPod/.test(ua) ? "Mobile" : "Desktop";
  return { os, browser, device };
}

function refHost(ref: string) {
  if (!ref) return "Direct";
  try { const h = new URL(ref).hostname.replace(/^www\./, ""); return h || "Direct"; } catch { return "Other"; }
}

function detectGeo(req: Request) {
  let country = "", city = "";
  const geoRaw = req.headers.get("x-nf-geo");
  if (geoRaw) { try { const g = JSON.parse(Buffer.from(geoRaw, "base64").toString("utf8")); country = g?.country?.code || g?.country?.name || ""; city = g?.city || ""; } catch {} }
  if (!country) country = req.headers.get("x-country") || req.headers.get("x-nf-country") || req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "";
  if (!city) city = req.headers.get("x-nf-city") || req.headers.get("x-vercel-ip-city") || "";
  return { country: country.toUpperCase().slice(0, 60), city: decodeURIComponent(city).slice(0, 80) };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const ua = req.headers.get("user-agent") || "";
    if (/bot|crawl|spider|preview|lighthouse|headless/i.test(ua)) return Response.json({ ok: true, skipped: "bot" });
    const { os, browser, device } = parseUA(ua);

    const { country, city } = detectGeo(req);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return Response.json({ ok: true, skipped: "no-env" });
    const sb = createClient(url, anon);
    const { error } = await sb.from("pageviews").insert({
      path: String(body.path || "/").slice(0, 200),
      referrer: refHost(String(body.ref || "")).slice(0, 120),
      browser, os, device,
      screen: String(body.screen || "").slice(0, 16),
      lang: String(body.lang || "").slice(0, 12),
      country: country.slice(0, 60),
      city: city.slice(0, 80),
    });
    return Response.json({ ok: !error, error: error?.message });
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
}

// Temporary diagnostic: GET /api/track?debug=1 reports whether Netlify edge geo
// headers reach this function, so we can confirm location capture works.
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (u.searchParams.get("debug") !== "1") return Response.json({ ok: true });
  const headerKeys = ["x-nf-geo", "x-country", "x-nf-country", "x-nf-city", "cf-ipcountry", "x-vercel-ip-country"];
  const present: Record<string, string> = {};
  headerKeys.forEach((k) => { const v = req.headers.get(k); if (v) present[k] = k === "x-nf-geo" ? "(base64 present)" : v; });
  return Response.json({ geo: detectGeo(req), headersSeen: present, ua: req.headers.get("user-agent") });
}
