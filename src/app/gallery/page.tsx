import GalleryGrid from "@/components/GalleryGrid";
import { getSiteData } from "@/lib/data";
import type { Metadata } from "next";

export const revalidate = 30;
export const metadata: Metadata = {
  title: "Gallery — Kamoliddin Tilonboyev",
  description: "Albums, moments and snapshots.",
};

export default async function GalleryPage() {
  const data = await getSiteData();
  return <GalleryGrid photos={data.gallery} cats={data.galleryCats} />;
}
