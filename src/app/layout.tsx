import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import SiteFrame from "@/components/SiteFrame";
import PWARegister from "@/components/PWARegister";
import { getNavPages } from "@/lib/data";

// Self-hosted, optimized fonts (no render-blocking Google Fonts request, no FOUT).
const display = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--f-display", display: "swap" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://vasfiy.com"),
  title: "Kamoliddin Tilonboyev — SOC Analyst",
  description: "Aspiring SOC Analyst — blue-team operations, threat monitoring & network analysis. TryHackMe certified, global top 1%.",
  openGraph: {
    title: "Kamoliddin Tilonboyev — SOC Analyst",
    description: "Aspiring SOC Analyst — blue-team operations, threat monitoring & network analysis.",
    images: ["/og-image.jpg"],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Kamoliddin" },
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};

export const viewport: Viewport = { themeColor: "#0a0e1a" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const navPages = await getNavPages();
  return (
    <html lang="en" data-theme="ocean" data-mode="dark" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <div className="bg-wrap" aria-hidden="true">
          <div className="bg-grid" /><div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
        </div>
        <Providers>
          <SiteFrame navPages={navPages}>{children}</SiteFrame>
        </Providers>
        <PWARegister />
      </body>
    </html>
  );
}
