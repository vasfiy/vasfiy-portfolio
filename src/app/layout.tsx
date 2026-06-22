import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import SiteFrame from "@/components/SiteFrame";
import PWARegister from "@/components/PWARegister";

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
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Kamoliddin" },
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};

export const viewport: Viewport = { themeColor: "#0a0e1a" };

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
        <PWARegister />
      </body>
    </html>
  );
}
