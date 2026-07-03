import Market from "@/components/market/Market";
import { getSiteData } from "@/lib/data";

export const revalidate = 30;

export default async function MarketPage() {
  const data = await getSiteData();
  return <Market products={data.products} cats={data.cats.product || {}} />;
}