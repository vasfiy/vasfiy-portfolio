"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ThemeFab from "./ThemeFab";
import Search from "./Search";

export default function SiteFrame({ children }: { children: React.ReactNode }) {
  const p = usePathname() || "";
  // Admin gets a bare frame (its own chrome); public pages get navbar/footer/theme fab/search
  if (p.startsWith("/admin")) return <>{children}</>;
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <ThemeFab />
      <Search />
    </>
  );
}
