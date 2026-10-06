/* Netlify scheduled function: weekly analytics report -> Telegram.
   Env needed in the Netlify UI: CRON_SECRET (matches the site's route guard).
   The heavy lifting happens in the site's own /api/report route. */
const SITE = "https://vasfiy.com";

export default async () => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET not set", { status: 500 });
  try {
    const r = await fetch(`${SITE}/api/report?send=telegram&days=7`, {
      method: "POST",
      headers: { "x-cron-secret": secret },
    });
    const body = await r.text().catch(() => "");
    return new Response(`weekly-report: ${r.status} ${body.slice(0, 200)}`, { status: 200 });
  } catch (e) {
    return new Response("weekly-report error: " + String(e), { status: 200 });
  }
};

export const config = { schedule: "@weekly" };
