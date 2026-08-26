import { headers } from "next/headers";
import { SITE_URL, MARKET_URL } from "@/lib/site";

/* Host-aware robots: the admin app answers at "/" on admin.vasfiy.com, so a
   shared "Allow: /" would invite crawlers straight into it. A static robots.ts
   can't see the Host header — hence this route handler. */
export const dynamic = "force-dynamic";

export async function GET() {
  const host = ((await headers()).get("host") || "").toLowerCase();
  const body = host.startsWith("admin.")
    ? "User-Agent: *\nDisallow: /\n"
    : host.startsWith("market.")
      ? `User-Agent: *\nAllow: /\n\nSitemap: ${MARKET_URL}/sitemap.xml\n`
      : `User-Agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
