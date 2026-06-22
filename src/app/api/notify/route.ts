export const runtime = "nodejs";

/* Sends an email notification for a new contact message via Resend.
   No-ops (returns ok) unless RESEND_API_KEY + NOTIFY_EMAIL env vars are set,
   so the contact form never breaks. The message is also stored in Supabase. */
export async function POST(req: Request) {
  try {
    const { name = "", email = "", message = "" } = await req.json();
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
