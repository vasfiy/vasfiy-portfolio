import MarketFrame from "@/components/market/MarketFrame";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vasfiy Market — Europe ⇄ Uzbekistan",
  description: "Quality goods between Europe and Uzbekistan, both directions. Yevropa va O'zbekiston o'rtasida sifatli mahsulotlar. Товары между Европой и Узбекистаном. Waren zwischen Europa und Usbekistan.",
};

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return <MarketFrame>{children}</MarketFrame>;
}