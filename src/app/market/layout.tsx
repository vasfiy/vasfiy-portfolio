import MarketFrame from "@/components/market/MarketFrame";
import { MARKET_URL } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vasfiy Market — Europe ⇄ Uzbekistan",
  description: "Quality goods between Europe and Uzbekistan, both directions. Yevropa va O'zbekiston o'rtasida sifatli mahsulotlar. Товары между Европой и Узбекистаном. Waren zwischen Europa und Usbekistan.",
  // The same pages answer on vasfiy.com/market and market.vasfiy.com — point search
  // engines at the marketplace host so the duplicate never competes with itself.
  alternates: { canonical: MARKET_URL },
  openGraph: { url: MARKET_URL, title: "Vasfiy Market — Europe ⇄ Uzbekistan", type: "website" },
};

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return <MarketFrame>{children}</MarketFrame>;
}