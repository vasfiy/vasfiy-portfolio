import { createClient } from "@supabase/supabase-js";
import type { SiteData, Album, Photo, Post, Page } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(url, key, { auth: { persistSession: false } });

const KIND_TO_ARR: Record<string, keyof SiteData> = {
  gallery: "gallery", blog: "blog", book: "books",
  experience: "experience", skill: "skills", cert: "certs",
  project: "projects", education: "education", language: "languages", challenge: "challenges", page: "pages",
};
const CAT_KIND_TO_KEY: Record<string, keyof SiteData> = { gallery: "galleryCats", book: "bookCats" };

function empty(): SiteData {
  return { gallery: [], blog: [], books: [], experience: [], skills: [], certs: [], projects: [], education: [], languages: [], challenges: [], pages: [], galleryCats: {}, bookCats: {}, cats: {}, settings: {} };
}
const byPos = (a: any, b: any) => (a.position || 0) - (b.position || 0);

export async function getSiteData(): Promise<SiteData> {
  const data = empty();
  if (!url || !key) return data;
  try {
    const [items, cats, settings] = await Promise.all([
      supabase.from("items").select("*"),
      supabase.from("categories").select("*"),
      supabase.from("settings").select("*"),
    ]);
    (items.data || []).slice().sort(byPos).forEach((r: any) => {
      const arr = KIND_TO_ARR[r.kind];
      if (arr && !r.data?.archived) (data[arr] as any[]).push({ ...r.data, pinned: r.pinned, __id: r.id });
    });
    const archCats: Record<string, string[]> = (settings.data || []).find((s: any) => s.key === "archivedCats")?.value || {};
    (cats.data || []).slice().sort(byPos).forEach((c: any) => {
      if ((archCats[c.kind] || []).includes(c.key)) return; // hide archived categories from the public site
      const cat = { en: c.en, uz: c.uz, icon: c.icon };
      const k = CAT_KIND_TO_KEY[c.kind];
      if (k) (data[k] as any)[c.key] = cat;
      (data.cats[c.kind] ||= {})[c.key] = cat;
    });
    (settings.data || []).forEach((s: any) => { data.settings[s.key] = s.value; });
    // Categories for newer kinds (blog/project/challenge/page) live in the `extraCats` setting.
    const extra: Record<string, Record<string, any>> = (data.settings.extraCats as any) || {};
    for (const kind in extra) {
      for (const key in extra[kind]) {
        if ((archCats[kind] || []).includes(key)) continue;
        (data.cats[kind] ||= {})[key] = extra[kind][key];
      }
    }
  } catch {
    /* network/RLS issue — return whatever we have */
  }
  return data;
}

/** Lightweight fetch of admin-created pages flagged to appear in the navbar. */
export async function getNavPages(): Promise<Page[]> {
  if (!url || !key) return [];
  try {
    const { data } = await supabase.from("items").select("*").eq("kind", "page");
    return (data || [])
      .slice().sort(byPos)
      .map((r: any) => ({ ...r.data, pinned: r.pinned, __id: r.id }))
      .filter((p: any) => p.nav === "yes" && p.slug && !p.archived);
  } catch { return []; }
}

/* ---------- helpers shared by client + server ---------- */
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

export async function uploadVoice(blob: Blob): Promise<string> {
  const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
  const path = `voice/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

export const isVideo = (v?: string) => /\.(mp4|mov|webm|m4v|ogv|ogg)(\?|$)/i.test(String(v || ""));
export function ytId(u?: string) {
  if (!u) return "";
  if (!/[/.]/.test(u)) return u;
  const m = String(u).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/);
  return m ? m[1] : u;
}
export function readingTime(text?: string) {
  const w = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(w / 200));
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
