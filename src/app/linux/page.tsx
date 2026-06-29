import LinuxLab from "@/components/LinuxLab";
import { supabase } from "@/lib/data";
import type { Metadata } from "next";

export const revalidate = 30;
export const metadata: Metadata = {
  title: "Linux & Cybersecurity Lab — Kamoliddin Tilonboyev",
  description: "Daily Linux & cybersecurity lessons, CTF challenges + a real interactive in-browser terminal.",
};

async function getLabData() {
  const [items, cats, setting] = await Promise.all([
    supabase.from("items").select("*").in("kind", ["lesson", "challenge"]),
    supabase.from("categories").select("*").in("kind", ["lesson", "challenge"]),
    supabase.from("settings").select("value").eq("key", "archivedCats").maybeSingle(),
  ]);
  const arch: Record<string, string[]> = (setting.data?.value as any) || {};
  const rows = (items.data || []).slice().sort((a: any, b: any) => (a.position || 0) - (b.position || 0)).filter((r: any) => !r.data?.archived);
  const lessons = rows.filter((r: any) => r.kind === "lesson").map((r: any) => ({ ...r.data, pinned: r.pinned, __id: r.id }));
  const challenges = rows.filter((r: any) => r.kind === "challenge").map((r: any) => ({ ...r.data, pinned: r.pinned, __id: r.id }));
  const catMap: Record<string, any> = {};
  const ctfCatMap: Record<string, any> = {};
  (cats.data || []).forEach((c: any) => { if ((arch[c.kind] || []).includes(c.key)) return; (c.kind === "challenge" ? ctfCatMap : catMap)[c.key] = { en: c.en, uz: c.uz, icon: c.icon }; });
  return { lessons, challenges, catMap, ctfCatMap };
}

export default async function LinuxPage() {
  const { lessons, challenges, catMap, ctfCatMap } = await getLabData();
  return <LinuxLab lessons={lessons} challenges={challenges} cats={catMap} challengeCats={ctfCatMap} />;
}
