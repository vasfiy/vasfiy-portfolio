export const runtime = "nodejs";

/* Sends an email notification for a new contact message via Resend.
   No-ops (returns ok) unless RESEND_API_KEY + NOTIFY_EMAIL env vars are set,
   so the contact form never breaks. The message is also stored in Supabase. */

/* Same-origin guard: the site's own forms/JS always send Origin or Referer. */
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

/* Best-effort in-memory rate limiter (per serverless instance — raises the
   bar against casual abuse; real flood control stays at the edge). */
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

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return Response.json({ ok: false }, { status: 403 });
    if (limited(req, 5, 600_000)) return Response.json({ ok: false }, { status: 429 });
    const raw = await req.json();
    const name = String(raw?.name ?? "").slice(0, 120);
    const email = String(raw?.email ?? "").slice(0, 200);
    const message = String(raw?.message ?? "").slice(0, 5000);
    const key = process.env.RESEND_API_KEY;
    const to = process.env.NOTIFY_EMAIL;
    if (!key || !to) return Response.json({ ok: true, skipped: true });
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Portfolio <onboarding@resend.dev>",
        to: [to],
        reply_to: email || undefined,
        subject: `New message from ${name || "a visitor"} — portfolio`,
        text: `From: ${name} <${email}>\n\n${message}`,
      }),
    });
    return Response.json({ ok: r.ok });
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
}
