import { createClient } from "@supabase/supabase-js";
import { buildWeeklyReport, sendTelegramDocument } from "@/lib/report";

export const runtime = "nodejs";

/* Weekly analytics report. Authorized two ways:
   - a Supabase access token (the admin dashboard's "send to Telegram" button)
   - the x-cron-secret header (the Netlify scheduled function)
   GET  -> download the current report as a Markdown file.
   POST -> build + send it to Telegram when TELEGRAM_* env is configured. */

async function sbFor(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const secret = req.headers.get("x-cron-secret");
  if (secret && process.env.CRON_SECRET && secret === process.env.CRON_SECRET) {
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (svc) return createClient(url, svc);
  }
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    // validate the JWT before trusting it for reads
    return client.auth.getUser(auth.slice(7)).then(({ data }) => (data?.user ? client : null)).catch(() => null);
  }
  return null;
}

async function handle(req: Request, send: boolean) {
  const sb = await sbFor(req);
  if (!sb) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const days = Math.max(1, Math.min(90, Number(new URL(req.url).searchParams.get("days") || 7)));
  let report;
  try {
    report = await buildWeeklyReport(sb, days);
  } catch (e: any) {
    console.error("report build failed:", String(e?.message || e));
    return Response.json({ ok: false, error: "report-failed" }, { status: 200 });
  }
  const stamp = dayStamp();
  const filename = `vasfiy-analytics-${days}d-${stamp}.md`;
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const chat = process.env.TELEGRAM_CHAT_ID || "";
  if (send && token && chat) {
    try {
      await sendTelegramDocument(token, chat, filename, report.md, report.caption);
      return Response.json({ ok: true, sent: true, filename, stats: report.stats });
    } catch (e: any) {
      return Response.json({ ok: false, error: String(e?.message || e), stats: report.stats }, { status: 200 });
    }
  }
  if (send) return Response.json({ ok: false, error: "telegram-env-missing", hint: "TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID kerak", stats: report.stats }, { status: 200 });
  return new Response(report.md, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` } });
}

function dayStamp() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
}

export async function POST(req: Request) {
  const send = new URL(req.url).searchParams.get("send") !== "false";
  return handle(req, send);
}
export async function GET(req: Request) {
  return handle(req, false);
}
