"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ThemeFab from "./ThemeFab";
import Search from "./Search";
import Tracker from "./Tracker";
import EditMode from "./EditMode";
import type { Page } from "@/lib/types";

export default function SiteFrame({ children, navPages = [] }: { children: React.ReactNode; navPages?: Page[] }) {
  const p = usePathname() || "";
  const [bareHost, setBareHost] = useState(false);
  // admin.*/market.* hosts serve their apps via a transparent rewrite, so usePathname() stays "/" — detect by host too
  useEffect(() => { const h = window.location.hostname; setBareHost(h.startsWith("admin.") || h.startsWith("market.")); }, []);
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
