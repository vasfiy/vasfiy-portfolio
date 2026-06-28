import { getSiteData } from "@/lib/data";
import PageView from "@/components/PageView";
import type { Metadata } from "next";
import type { Page } from "@/lib/types";

export const revalidate = 30;

async function findPage(rawSlug: string): Promise<Page | null> {
  const slug = decodeURIComponent(rawSlug);
  const data = await getSiteData();
  return data.pages.find((p) => p.slug === slug) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await findPage(slug);
  const title = page?.title || page?.titleUz || "Page";
  return { title: `${title} — Kamoliddin Tilonboyev`, description: `${title} — Kamoliddin Tilonboyev.` };
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await findPage(slug);
  return <PageView page={page} />;
}
