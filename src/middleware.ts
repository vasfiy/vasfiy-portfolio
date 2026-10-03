import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* Host-based routing: admin.vasfiy.com serves the /admin app,
   market.vasfiy.com serves the /market marketplace. */
/* The admin HTML must never be served from a shared cache. A stale admin
   document pins the panel to the JS chunks it was built against, so newly
   shipped admin features silently fail to appear until the cache expires. */
const NO_STORE = "no-store, no-cache, must-revalidate, max-age=0";

export function middleware(req: NextRequest) {
  // Exact parsed hostname (host header minus port) — never a startsWith/endsWith
  // match, which a hostile Host header like "admin.vasfiy.com.evil.com" would pass.
  const hostname = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  const { pathname } = req.nextUrl;
  const isAdminHost = hostname === "admin.vasfiy.com";
  const isMarketHost = hostname === "market.vasfiy.com";
  // keep local dev working: localhost may still serve /admin directly
  const isLocal = hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "0.0.0.0";

  if (isAdminHost && !pathname.startsWith("/admin")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin"; // any path on the admin host serves the admin app
    const res = NextResponse.rewrite(url);
    res.headers.set("Cache-Control", NO_STORE);
    res.headers.set("Netlify-CDN-Cache-Control", NO_STORE);
    return res;
  }
  // The admin app lives on its own subdomain only: /admin requested from any
  // other (non-dev) host is redirected to the real one instead of served.
  if (!isAdminHost && !isLocal && pathname.startsWith("/admin")) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = "admin.vasfiy.com";
    url.port = "";
    const res = NextResponse.redirect(url);
    res.headers.set("Cache-Control", NO_STORE);
    res.headers.set("Netlify-CDN-Cache-Control", NO_STORE);
    return res;
  }
  if (isAdminHost || pathname.startsWith("/admin")) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", NO_STORE);
    res.headers.set("Netlify-CDN-Cache-Control", NO_STORE);
    return res;
  }
  if (isMarketHost && !pathname.startsWith("/market")) {
    const url = req.nextUrl.clone();
    url.pathname = "/market" + (pathname === "/" ? "" : pathname); // / → catalog, /<id> → product
    return NextResponse.rewrite(url);
  }
  /* Public documents must never be cacheable. Next's ISR default puts
     "s-maxage=30, stale-while-revalidate=31535970" on page HTML; after a
     redeploy a phone still holding that document requests the JS/CSS hashes
     it names — deleted in the new build — and renders raw unstyled HTML.
     Trade-off, accepted for this personal site: HTML is now uncacheable in
     browsers AND the public CDN (Netlify-CDN-Cache-Control), while ISR still
     works server-side (x-nextjs-cache), so responses stay cheap to render.
     Only documents are affected: /_next/static assets keep Next's built-in
     immutable year-long caching (next.config.ts deliberately adds nothing). */
  if (
    req.method === "GET" &&
    !isMarketHost && // market host keeps its rewrite path above; its documents fall through unchanged
    (req.headers.get("accept") || "").includes("text/html") &&
    !(pathname.split("/").pop() || "").includes(".") // navigation, not a file — the matcher below also enforces this
  ) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", NO_STORE);
    res.headers.set("Netlify-CDN-Cache-Control", NO_STORE);
    return res;
  }
  return NextResponse.next();
}

export const config = {
  // run on pages only (skip _next internals, api, and files with extensions)
  matcher: ["/((?!_next/|api/|.*\\.).*)"],
};
