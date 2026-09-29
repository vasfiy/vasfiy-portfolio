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
  /* Security headers. These belong here rather than in netlify.toml: pages are
     served by the Next runtime as function responses, which netlify.toml's
     header rules don't reach (only /public files get those). */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
