"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ThemeFab from "./ThemeFab";

export default function SiteFrame({ children }: { children: React.ReactNode }) {
  const p = usePathname() || "";
  // Admin gets a bare frame (its own chrome); public pages get navbar/footer/theme fab
  if (p.startsWith("/admin")) return <>{children}</>;
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <ThemeFab />
    </>
  );
}
