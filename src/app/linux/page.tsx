import LinuxLab from "@/components/LinuxLab";
import { supabase } from "@/lib/data";
import type { Metadata } from "next";

export const revalidate = 30;
export const metadata: Metadata = {
  title: "Linux & Cybersecurity Lab — Kamoliddin Tilonboyev",
  description: "Daily Linux & cybersecurity lessons, CTF challenges + a real interactive in-browser terminal.",
};

async function getLabData() {
  const [items, cats, settings] = await Promise.all([
    supabase.from("items").select("*").in("kind", ["lesson", "challenge"]),
    supabase.from("categories").select("*").eq("kind", "lesson"),
    supabase.from("settings").select("key,value").in("key", ["archivedCats", "extraCats"]),
  ]);
  const sMap: Record<string, any> = {}; (settings.data || []).forEach((s: any) => { sMap[s.key] = s.value; });
  const arch: Record<string, string[]> = sMap.archivedCats || {};
  const extra: Record<string, Record<string, any>> = sMap.extraCats || {};
  const rows = (items.data || []).slice().sort((a: any, b: any) => (a.position || 0) - (b.position || 0)).filter((r: any) => !r.data?.archived);
  const lessons = rows.filter((r: any) => r.kind === "lesson").map((r: any) => ({ ...r.data, pinned: r.pinned, __id: r.id }));
  const challenges = rows.filter((r: any) => r.kind === "challenge").map((r: any) => ({ ...r.data, pinned: r.pinned, __id: r.id }));
  // Lesson categories from the table; CTF (challenge) categories from the extraCats setting.
  const catMap: Record<string, any> = {};
  (cats.data || []).forEach((c: any) => { if ((arch.lesson || []).includes(c.key)) return; catMap[c.key] = { en: c.en, uz: c.uz, icon: c.icon }; });
  const ctfCatMap: Record<string, any> = {};
  for (const key in (extra.challenge || {})) { if (!(arch.challenge || []).includes(key)) ctfCatMap[key] = extra.challenge[key]; }
  return { lessons, challenges, catMap, ctfCatMap };
}

export default async function LinuxPage() {
  const { lessons, challenges, catMap, ctfCatMap } = await getLabData();
  return <LinuxLab lessons={lessons} challenges={challenges} cats={catMap} challengeCats={ctfCatMap} />;
}
