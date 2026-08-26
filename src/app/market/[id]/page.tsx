import ProductView from "@/components/market/ProductView";
import { getSiteData } from "@/lib/data";
import { notFound } from "next/navigation";
import { MARKET_URL } from "@/lib/site";
import type { Metadata } from "next";

export const revalidate = 30;

async function findProduct(id: string) {
  const data = await getSiteData();
  return data.products.find((p) => String(p.__id) === id) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await findProduct(id);
  if (!p) return { title: "Product — Vasfiy Market" };
  const title = p.title || p.titleUz || p.titleRu || "Product";
  const img = (p.images || [])[0]?.url;
  const url = `${MARKET_URL}/${id}`;
  return {
    title: `${title} — Vasfiy Market`,
    description: (p.desc || p.descUz || p.descRu || "").slice(0, 160),
    alternates: { canonical: url },
    openGraph: { title, url, images: img ? [img] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await findProduct(id);
  if (!product) notFound();
  return <ProductView product={product} />;
}