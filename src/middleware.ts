import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* Host-based routing: admin.vasfiy.com serves the /admin app,
   market.vasfiy.com serves the /market marketplace. */
/* The admin HTML must never be served from a shared cache. A stale admin
   document pins the panel to the JS chunks it was built against, so newly
   shipped admin features silently fail to appear until the cache expires. */
const NO_STORE = "no-store, no-cache, must-revalidate, max-age=0";

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();
  const { pathname } = req.nextUrl;
  const isAdminHost = host.startsWith("admin.vasfiy.com");

  if (isAdminHost && !pathname.startsWith("/admin")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin"; // any path on the admin host serves the admin app
    const res = NextResponse.rewrite(url);
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
  if (host.startsWith("market.vasfiy.com") && !pathname.startsWith("/market")) {
    const url = req.nextUrl.clone();
    url.pathname = "/market" + (pathname === "/" ? "" : pathname); // / → catalog, /<id> → product
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  // run on pages only (skip _next internals, api, and files with extensions)
  matcher: ["/((?!_next/|api/|.*\\.).*)"],
};
