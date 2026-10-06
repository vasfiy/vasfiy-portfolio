import type { SupabaseClient } from "@supabase/supabase-js";

/* Weekly analytics report builder — Markdown file + daily CSV, Tashkent time.
   Reads visits/events through whatever client it is given (admin JWT client or
   the service-role client), so RLS decides what is readable. */

const TZ = "Asia/Tashkent";
const dayIn = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD
const hourIn = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d));
const niceDate = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" }).format(d);

export type Report = { md: string; csv: string; caption: string; stats: Record<string, number> };

export async function buildWeeklyReport(sb: SupabaseClient, days = 7): Promise<Report> {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const [vRes, eRes] = await Promise.all([
    sb.from("visits").select("*").gte("last_seen_at", since).order("last_seen_at", { ascending: false }).limit(5000),
    sb.from("events").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(8000),
  ]);
  if (vRes.error || eRes.error) throw new Error("analytics-tables: " + (vRes.error?.message || eRes.error?.message));
  const visits = vRes.data || [];
  const events = eRes.data || [];

  const views = events.filter((e) => e.type === "page").length || visits.reduce((a, v) => a + (v.pageviews || 0), 0);
  const uniques = new Set(visits.map((v) => v.visitor_id || v.session_id)).size;
  const returning = uniques ? visits.length - uniques : 0;
  const avgPages = visits.length ? (views / visits.length).toFixed(1) : "0";

  const group = <T,>(rows: T[], key: (r: T) => string) => {
    const m: Record<string, number> = {};
    rows.forEach((r) => { const k = key(r); if (k) m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const top = (rows: [string, number][], n = 10) => rows.slice(0, n).map(([k, c], i) => `${i + 1}. ${k} — **${c}**`).join("\n") || "—";

  // daily + hourly buckets (Tashkent)
  const daily: Record<string, { v: number; p: number; e: number }> = {};
  const hourly = Array(24).fill(0) as number[];
  events.forEach((e) => { const d = new Date(e.created_at); daily[dayIn(d)] = daily[dayIn(d)] || { v: 0, p: 0, e: 0 }; if (e.type === "page") daily[dayIn(d)].p++; else if (e.type !== "click") daily[dayIn(d)].e++; hourly[hourIn(d)]++; });
  visits.forEach((v) => { const k = dayIn(new Date(v.last_seen_at)); daily[k] = daily[k] || { v: 0, p: 0, e: 0 }; daily[k].v++; });
  const dayRows = Object.keys(daily).sort().map((k) => ({ d: k, ...daily[k] }));

  const hmax = Math.max(1, ...hourly);
  const hourBars = hourly.map((n, h) => `${String(h).padStart(2, "0")}:00 ${"█".repeat(Math.round((n / hmax) * 20)) || "·"} ${n}`).join("\n");

  const clicks = events.filter((e) => e.type === "click");
  const customs = events.filter((e) => e.type === "event");
  const utm = group(events, (e) => { try { return String((e.meta as any)?.utm_source || ""); } catch { return ""; } }).filter(([k]) => k);

  const flag = (cc: string) => (/^[A-Za-z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🌐");
  const geoTop = group(visits, (v) => `${v.city ? v.city + ", " : ""}${v.country || "?"}`).slice(0, 12);

  const period = `${niceDate(new Date(Date.now() - days * 864e5))} – ${niceDate(new Date())} (${days} kun, Toshkent vaqti)`;
  const md = `# 📊 vasfiy.com analitikasi

**Davr:** ${period}

## Asosiy ko'rsatkichlar
| | |
|---|---|
| Tashriflar (sessiyalar) | **${visits.length}** |
| Unikal mehmonlar | **${uniques}** |
| Sahifa ko'rishlar | **${views}** |
| Hodisalar (klik+custom) | **${events.length - views}** |
| O'rtacha sahifa/tashrif | **${avgPages}** |
| Qaytgan mehmonlar | **${returning}** |

## Kunlar bo'yicha
| Kun | Tashrif | Ko'rish | Hodisa |
|---|---|---|---|
${dayRows.map((r) => `| ${r.d} | ${r.v} | ${r.p} | ${r.e} |`).join("\n") || "| — | — | — | — |"}

## Soatlar bo'yicha faollik (Toshkent)
\`\`\`
${hourBars}
\`\`\`

## Top sahifalar
${top(group(events.filter((e) => e.type === "page"), (e) => e.path || "/"))}

## Top bosilgan elementlar
${top(group(clicks, (e) => e.name || "?"), 12)}

## Maxsus hodisalar
${top(group(customs, (e) => e.name || "?"), 12)}

## Qurilmalar
${top(group(visits, (v) => v.device || "?"))}

**Modellar:** 
${top(group(visits, (v) => (v.model || v.device || "?").toString()).slice(0, 10) as [string, number][], 10)}

## Brauzerlar / OS
${top(group(visits, (v) => `${v.browser || "?"} ${v.browser_version || ""}`.trim()))}

${top(group(visits, (v) => `${v.os || "?"} ${v.os_version || ""}`.trim()))}

## Geografiya
${top(geoTop.map(([k, c]) => [`${flag(k.split(", ").pop() || "")} ${k}`, c] as [string, number]))}

## Tashrif manbalari
${top(group(visits, (v) => v.referrer || "Direct"))}
${utm.length ? `\n## UTM\n${top(utm)}` : ""}

---
_Yetkazilgan vaqt: ${new Date().toISOString()} · vasfiy.com birinchi-tomon analitikasi_
`;

  const csv = ["day,visits,pageviews,events", ...dayRows.map((r) => `${r.d},${r.v},${r.p},${r.e}`)].join("\n");
  const caption = `📊 vasfiy.com — ${days} kunlik: ${visits.length} tashrif, ${uniques} mehmon, ${views} ko'rish. Batafsil faylda.`;
  return { md, csv, caption, stats: { visits: visits.length, uniques, views, events: events.length } };
}

export async function sendTelegramDocument(token: string, chatId: string, filename: string, content: string, caption: string) {
  const fd = new FormData();
  fd.set("chat_id", chatId);
  fd.set("caption", caption.slice(0, 900));
  fd.set("document", new Blob([content], { type: "text/markdown; charset=utf-8" }), filename);
  const r = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}) as any);
  if (!j?.ok) throw new Error("telegram: " + (j?.description || r.status));
  return j;
}
