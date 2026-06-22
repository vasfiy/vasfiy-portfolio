import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-only Next.js indicator badge (bottom-left "N")
  devIndicators: false,
  // Allow remote images (Supabase storage + YouTube thumbnails)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ogdgvnnjbjwrbaobharh.supabase.co" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
