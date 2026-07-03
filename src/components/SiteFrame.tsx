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
  const [adminHost, setAdminHost] = useState(false);
  // admin.* host serves /admin via a transparent rewrite, so usePathname() stays "/" — detect by host too
  useEffect(() => { setAdminHost(window.location.hostname.startsWith("admin.")); }, []);
  // Admin gets a bare frame (its own chrome); public pages get navbar/footer/theme fab/search
  if (p.startsWith("/admin") || adminHost) return <>{children}</>;
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
