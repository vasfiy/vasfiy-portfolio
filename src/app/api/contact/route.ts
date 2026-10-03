export const runtime = "nodejs";

/* Contact form endpoint: stores the message (and optional voice note) via the
   Supabase anon client server-side, so the browser never ships supabase-js.
   Same-origin only; the email notification stays a client fire-and-forget. */
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

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return Response.json({ ok: false }, { status: 403 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return Response.json({ ok: true, skipped: true });
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, key, { auth: { persistSession: false } });

    const fd = await req.formData();
    const name = String(fd.get("name") || "").slice(0, 120);
    const email = String(fd.get("email") || "").slice(0, 200);
    const message = String(fd.get("message") || "").slice(0, 5000);
    const f = fd.get("audio");
    const file = f instanceof File && f.size > 0 && f.size < 15 * 1024 * 1024 ? f : null;

    let audio: string | null = null;
    if (file) {
      const ext = (file.name.split(".").pop() || "webm").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "webm";
      const path = `voice/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await sb.storage.from("media").upload(path, file, { contentType: file.type || "audio/webm" });
      if (!up.error) audio = sb.storage.from("media").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await sb.from("messages").insert({ name, email, message, audio });
    if (error) return Response.json({ ok: false });
    return Response.json({ ok: true, voice: !!audio });
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
}
