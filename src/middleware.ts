import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* Host-based routing: admin.vasfiy.com serves the /admin app. */
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();
  if (host.startsWith("admin.vasfiy.com") && !req.nextUrl.pathname.startsWith("/admin")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin"; // any path on the admin host serves the admin app
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  // run on pages only (skip _next internals, api, and files with extensions)
  matcher: ["/((?!_next/|api/|.*\\.).*)"],
};
