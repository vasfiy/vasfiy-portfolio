import { getSiteData, blogSort, postText } from "@/lib/data";
import { SITE_URL as BASE } from "@/lib/site";

export const revalidate = 300;

const esc = (s: string) => String(s || "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));

export async function GET() {
  const data = await getSiteData();
  const posts = blogSort(data.blog).slice(0, 30);
  const items = posts.map((p) => {
    const title = p.title || p.titleUz || "";
    const desc = p.body || p.bodyUz || postText(p, "en").slice(0, 160);
    const link = `${BASE}/blog/${p.__id}`;
    const dt = p.date ? new Date(p.date) : null;
    const pub = dt && !Number.isNaN(dt.getTime()) ? `<pubDate>${dt.toUTCString()}</pubDate>` : "";
    return `<item><title>${esc(title)}</title><link>${link}</link><guid>${link}</guid>` +
      pub +
      `<description>${esc(desc)}</description></item>`;
  }).join("");
  const times = posts.map((p) => (p.date ? new Date(p.date).getTime() : NaN)).filter((n) => !Number.isNaN(n));
  const lastBuild = new Date(times.length ? Math.max(...times) : Date.now());
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>Kamoliddin Tilonboyev — Journal</title>
<link>${BASE}/blog</link>
<description>Notes, posts and moments from the road.</description>
<language>en</language>
<lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
<atom:link rel="self" href="${BASE}/feed.xml"/>
${items}
</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
