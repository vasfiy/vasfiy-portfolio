import type { Metadata } from "next";
import MarketArchived from "@/components/market/MarketArchived";

export const metadata: Metadata = {
  title: "Vasfiy Market — on hold",
  description: "The marketplace is on hold for now. Bozor bo'limi hozircha arxivda.",
  robots: { index: false, follow: false },
};

export default function MarketPage() {
  return <MarketArchived />;
}
