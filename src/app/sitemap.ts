import type { MetadataRoute } from "next";
import { getSiteData, groupAlbums } from "@/lib/data";
import { SITE_URL as BASE } from "@/lib/site";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSiteData();
  const staticRoutes: MetadataRoute.Sitemap = ["", "/blog", "/gallery", "/library", "/linux", "/cv", "/tools"].map((p) => ({
    url: BASE + p, changeFrequency: "weekly", priority: p === "" ? 1 : 0.7,
  }));
  const posts: MetadataRoute.Sitemap = data.blog.filter((p) => p.__id).map((p) => ({
    url: `${BASE}/blog/${p.__id}`, lastModified: p.date ? new Date(p.date) : undefined, priority: 0.6,
  }));
  const albums: MetadataRoute.Sitemap = groupAlbums(data.gallery).map((a) => ({
    url: `${BASE}/gallery/${encodeURIComponent(a.key)}`, priority: 0.5,
  }));
  const pages: MetadataRoute.Sitemap = data.pages.filter((p) => p.slug).map((p) => ({
    url: `${BASE}/p/${encodeURIComponent(p.slug!)}`, priority: 0.5,
  }));
  return [...staticRoutes, ...posts, ...albums, ...pages];
}
