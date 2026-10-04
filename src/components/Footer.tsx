"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "./Providers";

/* Local strings — these footer strings are not in the global DICT (src/lib/i18n.ts);
   same bilingual local-dict pattern as Tools/LinuxLab. */
const T = {
  en: { tag: "SOC analyst — blue-team operations, threat monitoring & network defense.", profile: "Profile", explore: "Explore", more: "More" },
  uz: { tag: "SOC analitik — blue-team operatsiyalari, tahdid monitoringi va tarmoq himoyasi.", profile: "Profil", explore: "Bo'limlar", more: "Qo'shimcha" },
};

export default function Footer() {
  const { t, lang } = useLang();
  const d = T[lang] || T.en;
  const year = new Date().getFullYear();

  // Floating back-to-top — appears only after the page is scrolled (~600px).
  // rAF-throttled like the Navbar scroll bar; setState bails out on same value.
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; setShowTop(window.scrollY > 600); });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const toTop = () => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-about">
          <div className="brand">
            <span className="brand-mark">KT</span>
            <span className="brand-name">Kamoliddin<span className="brand-dot">.</span></span>
          </div>
          <p className="footer-tag">{d.tag}</p>
        </div>
        <div className="footer-col">
          <h4>{d.profile}</h4>
          <ul>
            <li><Link href="/#about">{t("nav.about")}</Link></li>
            <li><Link href="/#skills">{t("nav.skills")}</Link></li>
            <li><Link href="/#experience">{t("nav.experience")}</Link></li>
            <li><Link href="/#projects">{t("nav.projects")}</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>{d.explore}</h4>
          <ul>
            <li><Link href="/blog">{t("nav.journal")}</Link></li>
            <li><Link href="/gallery">{t("nav.gallery")}</Link></li>
            <li><Link href="/library">{t("nav.library")}</Link></li>
            <li><Link href="/learning">{t("nav.learning")}</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>{d.more}</h4>
          <ul>
            <li><Link href="/linux">{t("nav.lab")}</Link></li>
            <li><Link href="/tools">{t("nav.tools")}</Link></li>
            <li><Link href="/cv">{t("hero.cv")}</Link></li>
            <li><Link href="/#contact">{t("nav.contact")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {year} Kamoliddin Tilonboyev</span>
      </div>
      <button
        className={"to-top-fab" + (showTop ? " show" : "")}
        aria-label={t("footer.top")}
        tabIndex={showTop ? 0 : -1}
        onClick={toTop}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
      </button>
    </footer>
  );
}
