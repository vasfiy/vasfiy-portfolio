"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "./Providers";
import { pick } from "@/lib/i18n";
import type { Page } from "@/lib/types";

// Home section ids watched by the scrollspy (read from Home.tsx). Education has no nav
// link of its own but is watched so no link stays falsely active while it fills the band.
const SECTIONS = ["hero", "about", "skills", "experience", "projects", "education", "contact"];

export default function Navbar({ pages = [] }: { pages?: Page[] }) {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [sec, setSec] = useState("");
  const linksRef = useRef<HTMLElement>(null);
  const home = pathname === "/";

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
    // WCAG 2.4.3: the drawer follows the burger in DOM order, so move focus into
    // it when it opens (Escape close restores focus to the burger).
    if (open) requestAnimationFrame(() => el?.querySelector("a")?.focus());
  }, [open]);

  // Drawer open: close on Escape and lock body scroll (restored on close/unmount)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); (document.querySelector(".menu-btn") as HTMLElement | null)?.focus(); } };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // keep keyboard/touch focus OUT of the page behind the drawer (WCAG 2.4.3 / 1.3.2)
    const outside = Array.from(document.querySelectorAll<HTMLElement>("main, footer"));
    outside.forEach((el) => el.setAttribute("inert", ""));
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      outside.forEach((el) => el.removeAttribute("inert"));
    };
  }, [open]);

  // FAB gate (phones): the floating search/theme cluster stays out of the hero CTA
  // zone while any part of the hero occupies the viewport's bottom band.
  useEffect(() => {
    if (!home) { document.body.classList.remove("fab-gate"); return; }
    const hero = document.getElementById("hero");
    if (!hero) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => document.body.classList.toggle("fab-gate", e.isIntersecting)),
      { rootMargin: "0px 0px -90px 0px" }
    );
    io.observe(hero);
    return () => { io.disconnect(); document.body.classList.remove("fab-gate"); };
  }, [home]);

  // Scrollspy: on the home page the section crossing the viewport band drives .active
  useEffect(() => {
    if (!home) { setSec(""); return; }
    const els = SECTIONS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setSec(e.target.id); }), { rootMargin: "-45% 0px -50% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [home]);

  const close = () => setOpen(false);
  const secCls = (id: string) => (home && sec === id ? " active" : "");
  const routeCls = (href: string) => (pathname === href || pathname.startsWith(href + "/") ? " active" : "");
  const links = (
    <>
      <Link href="/#about" onClick={close} className={secCls("about")}>{t("nav.about")}</Link>
      <Link href="/#skills" onClick={close} className={secCls("skills")}>{t("nav.skills")}</Link>
      <Link href="/#experience" onClick={close} className={secCls("experience")}>{t("nav.experience")}</Link>
      <Link href="/#projects" onClick={close} className={secCls("projects")}>{t("nav.projects")}</Link>
      <Link href="/gallery" onClick={close} className={routeCls("/gallery")}>{t("nav.gallery")}</Link>
      <Link href="/blog" onClick={close} className={routeCls("/blog")}>{t("nav.journal")}</Link>
      <Link href="/library" onClick={close} className={routeCls("/library")}>{t("nav.library")}</Link>
      <Link href="/learning" onClick={close} className={routeCls("/learning")}>{t("nav.learning")}</Link>
      <Link href="/darslarim" onClick={close} className={routeCls("/darslarim")}>{t("nav.darslarim")}</Link>
      {pages.map((p) => <Link key={p.slug} href={`/p/${p.slug}`} onClick={close} className={routeCls(`/p/${p.slug}`)}>{p.icon ? p.icon + " " : ""}{pick(p, "title", lang) || p.slug}</Link>)}
      <Link href="/#contact" className={"contact-cta" + secCls("contact")} onClick={close}>{t("nav.contact")}</Link>
    </>
  );

  return (
    <>
      <div className="scroll-progress" id="scrollProgress" aria-hidden="true" />
      <header className={"navbar" + (scrolled ? " scrolled" : "")} id="navbar">
        {open && <div className="nav-scrim" onClick={close} aria-hidden="true" />}
        <div className="container nav-inner">
          <Link href="/" className={"brand" + (home && (sec === "hero" || !sec) ? " active" : "")} aria-label={t("nav.home")}>
            <span className="brand-mark">KT</span>
            <span className="brand-name">Kamoliddin<span className="brand-dot">.</span></span>
          </Link>
          <nav className={"nav-links" + (open ? " open" : "")} id="navLinks" ref={linksRef}>{links}</nav>
          <div className="nav-actions">
            <div className="lang-toggle" role="group" aria-label={t("nav.switchLang")}>
              <button type="button" className={"lang-opt" + (lang === "en" ? " active" : "")} onClick={() => setLang("en")} aria-pressed={lang === "en"}>EN</button>
              <span className="lang-sep">/</span>
              <button type="button" className={"lang-opt" + (lang === "uz" ? " active" : "")} onClick={() => setLang("uz")} aria-pressed={lang === "uz"}>UZ</button>
            </div>
            <button className={"menu-btn" + (open ? " open" : "")} onClick={() => setOpen((o) => !o)} aria-label={t("nav.menu")} aria-expanded={open} aria-controls="navLinks">
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
