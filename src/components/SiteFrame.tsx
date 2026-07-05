"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ThemeFab from "./ThemeFab";
import Search from "./Search";
import Tracker from "./Tracker";
import EditMode from "./EditMode";
import type { Page } from "@/lib/types";

export default function SiteFrame({ children, navPages = [] }: { children: React.ReactNode; navPages?: Page[] }) {
  const p = usePathname() || "";
  // admin.*/market.* hosts serve their apps via a transparent rewrite: the server
  // sees the rewritten pathname (/admin, /market) but the browser URL stays "/".
  // Host detection must therefore be synchronous on the very first client render —
  // doing it in useEffect made the hydration render include the public chrome while
  // the server HTML was bare, which is exactly React error #418.
  const [bareHost] = useState(() => {
    if (typeof window === "undefined") return false;
    const h = window.location.hostname;
    return h.startsWith("admin.") || h.startsWith("market.");
  });
  // Admin and Market bring their own chrome; public pages get navbar/footer/theme fab/search
  if (p.startsWith("/admin") || p.startsWith("/market") || bareHost) return <>{children}</>;
  return (
    <>
      <Navbar pages={navPages} />
      <main>{children}</main>
      <Footer />
      <ThemeFab />
      <Search />
      <Tracker />
      <EditMode />
    </>
  );
}
