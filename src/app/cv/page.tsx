import CV from "@/components/CV";
import { getSiteData } from "@/lib/data";
import type { Metadata } from "next";

export const revalidate = 30;
export const metadata: Metadata = {
  title: "CV — Kamoliddin Tilonboyev",
  description: "Résumé of Kamoliddin Tilonboyev — aspiring SOC Analyst.",
};

export default async function CvPage() {
  const data = await getSiteData();
  return <CV data={data} />;
}
