"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./Providers";
import { pick } from "@/lib/i18n";
import type { Page } from "@/lib/types";

export default function Navbar({ pages = [] }: { pages?: Page[] }) {
  const { t, lang, toggle } = useLang();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const linksRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const bar = document.getElementById("scrollProgress");
      if (bar) bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Inline transform guarantees the drawer slides regardless of cascade quirks
  useEffect(() => {
    const el = linksRef.current;
    if (el) el.style.transform = open ? "translateX(0)" : "";
  }, [open]);

  const close = () => setOpen(false);
  const links = (
    <>
      <Link href="/#about" onClick={close}>{t("nav.about")}</Link>
      <Link href="/#skills" onClick={close}>{t("nav.skills")}</Link>
      <Link href="/#experience" onClick={close}>{t("nav.experience")}</Link>
      <Link href="/#projects" onClick={close}>{t("nav.projects")}</Link>
      <Link href="/gallery" onClick={close}>{t("nav.gallery")}</Link>
      <Link href="/blog" onClick={close}>{t("nav.journal")}</Link>
      <Link href="/library" onClick={close}>{t("nav.library")}</Link>
      {pages.map((p) => <Link key={p.slug} href={`/p/${p.slug}`} onClick={close}>{p.icon ? p.icon + " " : ""}{pick(p, "title", lang) || p.slug}</Link>)}
      <Link href="/#contact" onClick={close}>{t("nav.contact")}</Link>
    </>
  );

  return (
    <>
      <div className="scroll-progress" id="scrollProgress" aria-hidden="true" />
      <header className={"navbar" + (scrolled ? " scrolled" : "")} id="navbar">
        <div className="container nav-inner">
          <Link href="/" className="brand" aria-label="Home">
            <span className="brand-mark">KT</span>
            <span className="brand-name">Kamoliddin<span className="brand-dot">.</span></span>
          </Link>
          <nav className={"nav-links" + (open ? " open" : "")} id="navLinks" ref={linksRef}>{links}</nav>
          <div className="nav-actions">
            <button className="lang-toggle" onClick={toggle} aria-label="Switch language">
              <span className={"lang-opt" + (lang === "en" ? " active" : "")}>EN</span>
              <span className="lang-sep">/</span>
              <span className={"lang-opt" + (lang === "uz" ? " active" : "")}>UZ</span>
            </button>
            <button className={"menu-btn" + (open ? " open" : "")} onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
