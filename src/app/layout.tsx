import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import SiteFrame from "@/components/SiteFrame";

export const metadata: Metadata = {
  metadataBase: new URL("https://vasfiy.uz"),
  title: "Kamoliddin Tilonboyev — SOC Analyst",
  description: "Aspiring SOC Analyst — blue-team operations, threat monitoring & network analysis. TryHackMe certified, global top 1%.",
  openGraph: {
    title: "Kamoliddin Tilonboyev — SOC Analyst",
    description: "Aspiring SOC Analyst — blue-team operations, threat monitoring & network analysis.",
    images: ["/og-image.jpg"],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2300e5ff'/%3E%3Cstop offset='1' stop-color='%237c5cff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M50 6 L86 20 V48 C86 72 70 88 50 96 C30 88 14 72 14 48 V20 Z' fill='url(%23g)'/%3E%3Ctext x='50' y='62' font-family='Arial' font-size='34' font-weight='bold' fill='%230a0e1a' text-anchor='middle'%3EKT%3C/text%3E%3C/svg%3E" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="ocean" data-mode="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="bg-wrap" aria-hidden="true">
          <div className="bg-grid" /><div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
        </div>
        <Providers>
          <SiteFrame>{children}</SiteFrame>
        </Providers>
      </body>
    </html>
  );
}
