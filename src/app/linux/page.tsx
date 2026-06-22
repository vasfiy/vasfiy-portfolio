import LinuxLab from "@/components/LinuxLab";
import { getSiteData } from "@/lib/data";
import type { Metadata } from "next";

export const revalidate = 30;
export const metadata: Metadata = {
  title: "Linux & Cybersecurity Lab — Kamoliddin Tilonboyev",
  description: "Daily Linux & cybersecurity lessons + a real interactive in-browser terminal.",
};

async function getLessons() {
  // lessons live under items.kind = 'lesson'; categories under categories.kind = 'lesson'
  const { supabase } = await import("@/lib/data");
  const [items, cats] = await Promise.all([
    supabase.from("items").select("*").eq("kind", "lesson"),
    supabase.from("categories").select("*").eq("kind", "lesson"),
  ]);
  const lessons = (items.data || []).slice().sort((a: any, b: any) => (a.position || 0) - (b.position || 0)).map((r: any) => ({ ...r.data, pinned: r.pinned, __id: r.id }));
  const catMap: Record<string, any> = {};
  (cats.data || []).forEach((c: any) => { catMap[c.key] = { en: c.en, uz: c.uz, icon: c.icon }; });
  return { lessons, catMap };
}

export default async function LinuxPage() {
  const { lessons, catMap } = await getLessons();
  return <LinuxLab lessons={lessons} cats={catMap} />;
}
