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
        // Documents (browser navigations) are never cacheable — a cached page
        // names build-specific asset hashes that stop existing after a rebuild,
        // which is exactly how phones ended up with raw unstyled HTML.
        source: "/:path*",
        has: [{ type: "header", key: "accept", value: ".*text/html.*" }],
        headers: [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://ogdgvnnjbjwrbaobharh.supabase.co https://i.ytimg.com; media-src 'self' https://ogdgvnnjbjwrbaobharh.supabase.co; frame-src https://www.youtube.com https://www.youtube-nocookie.com; connect-src 'self' https://ogdgvnnjbjwrbaobharh.supabase.co wss://ogdgvnnjbjwrbaobharh.supabase.co; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'; upgrade-insecure-requests" },
        ],
      },
    ];
  },
};

export default nextConfig;
