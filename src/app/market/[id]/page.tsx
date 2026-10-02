import type { Metadata } from "next";
import MarketArchived from "@/components/market/MarketArchived";

export const metadata: Metadata = {
  title: "Vasfiy Market — on hold",
  robots: { index: false, follow: false },
};

/* The marketplace is archived: every product URL lands on the same notice. */
export default function ProductPage() {
  return <MarketArchived />;
}
