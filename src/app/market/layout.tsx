import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vasfiy Market — on hold",
  description: "The marketplace is on hold for now. Bozor bo'limi hozircha arxivda.",
  robots: { index: false, follow: false },
};

/* Archived market: a plain frame — the marketplace chrome comes back with it. */
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return <main className="mkt-arch-main">{children}</main>;
}
