import { getSiteData, blogSort } from "@/lib/data";

const BASE = "https://vasfiy.uz";
export const revalidate = 300;

const esc = (s: string) => String(s || "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));

export async function GET() {
  const data = await getSiteData();
  const posts = blogSort(data.blog).slice(0, 30);
  const items = posts.map((p) => {
    const title = p.title || p.titleUz || "";
    const desc = p.body || p.bodyUz || "";
    const link = `${BASE}/blog/${p.__id}`;
    return `<item><title>${esc(title)}</title><link>${link}</link><guid>${link}</guid>` +
      (p.date ? `<pubDate>${new Date(p.date).toUTCString()}</pubDate>` : "") +
      `<description>${esc(desc)}</description></item>`;
  }).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Kamoliddin Tilonboyev — Journal</title>
<link>${BASE}/blog</link>
<description>Notes, posts and moments from the road.</description>
<language>en</language>
${items}
</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
