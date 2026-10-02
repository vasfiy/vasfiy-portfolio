import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { SiteData, Page } from "./types";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Distinct storageKey: this read-only client must not share the auth storage slot
// with the admin client, which triggers the "Multiple GoTrueClient instances" warning.

export const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "kt-public" } });


const KIND_TO_ARR: Record<string, keyof SiteData> = {
  gallery: "gallery", blog: "blog", book: "books",
  experience: "experience", skill: "skills", cert: "certs",
  project: "projects", education: "education", language: "languages", challenge: "challenges", course: "courses", page: "pages", product: "products",
};

const CAT_KIND_TO_KEY: Record<string, keyof SiteData> = { gallery: "galleryCats", book: "bookCats" };


function empty(): SiteData {
  return { gallery: [], blog: [], books: [], experience: [], skills: [], certs: [], projects: [], education: [], languages: [], challenges: [], courses: [], pages: [], products: [], galleryCats: {}, bookCats: {}, cats: {}, settings: {} };
}

const byPos = (a: any, b: any) => (a.position || 0) - (b.position || 0);


async function getSiteDataUncached(): Promise<SiteData> {
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
    // Products live in the `marketProducts` setting (items.kind CHECK constraint
    // predates the `product` kind and can't be altered from the client).
    ((data.settings.marketProducts as any[]) || []).forEach((p: any) => { if (p && !p.archived) data.products.push({ ...p }); });
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

// Per-request memoization: blog/[id]'s generateMetadata + page each call getSiteData in one
// ISR pass — cache() collapses that into one round of Supabase queries. (Client callers get a
// plain pass-through: without a server dispatcher React's cache just calls the function.)

export const getSiteData = cache(getSiteDataUncached);

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

export async function uploadVoice(blob: Blob): Promise<string> {
  const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
  const path = `voice/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

// Pure helpers live in ./format.ts (kept out of this module so client
// components never pull supabase-js just for sorting/date utils).
export { pinSort, blogSort, groupAlbums, isVideo, ytId, readingTime, postText, fmtDate } from "./format";
