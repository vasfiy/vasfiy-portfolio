import type { Post, Photo, Album, Lang } from "./types";

export function pinSort<T extends { pinned?: boolean }>(arr: T[]): T[] {
  return arr.map((x, i) => [x, i] as [T, number])
    .sort((a, b) => (b[0].pinned ? 1 : 0) - (a[0].pinned ? 1 : 0) || a[1] - b[1])
    .map((p) => p[0]);
}
// newest first, pinned on top — for blog

export function blogSort(arr: Post[]): Post[] {
  return arr.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.date || "").localeCompare(String(a.date || "")));
}

export function groupAlbums(items: Photo[]): Album[] {
  const order: string[] = [];
  const map: Record<string, Album> = {};
  items.forEach((it) => {
    const key = it.album ? "a:" + it.album : it.cat ? "c:" + it.cat : "a:Gallery";
    if (!map[key]) { map[key] = { key, album: it.album || null, albumUz: it.albumUz || null, cat: it.cat || null, photos: [] }; order.push(key); }
    map[key].photos.push(it);
  });
  return order.map((k) => map[k]);
}

export const isVideo = (v?: string) => /\.(mp4|mov|webm|m4v|ogv|ogg)(\?|$)/i.test(String(v || ""));

export function ytId(u?: string) {
  if (!u) return "";
  if (!/[/.]/.test(u)) return u;
  const m = String(u).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/);
  return m ? m[1] : u;
}

export function readingTime(text?: string) {
  const w = String(text || "").replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(w / 200));
}
/** Plain text of a post: block-model text blocks joined, else legacy full/body with HTML tags stripped. */

export function postText(p: Post, lang: Lang): string {
  const blocks = Array.isArray(p.blocks) ? p.blocks : [];
  if (blocks.length) return blocks.filter((b) => b.type === "text").map((b) => (lang === "uz" ? b.textUz || b.text : b.text || b.textUz) || "").join(" ");
  const html = (lang === "uz" ? p.fullUz || p.full : p.full || p.fullUz) || (lang === "uz" ? p.bodyUz || p.body : p.body || p.bodyUz) || "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTHS_UZ = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
// Deterministic (timezone- and locale-independent) so server and client render identically — avoids hydration mismatch (#418).

export function fmtDate(d: string | undefined, lang: string) {
  if (!d) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim());
  if (!m) return d;
  const months = lang === "uz" ? MONTHS_UZ : MONTHS_EN;
  return `${months[+m[2] - 1] || m[2]} ${+m[3]}, ${m[1]}`;
}
