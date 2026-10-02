"use client";
import Link from "next/link";
import { useLang } from "./Providers";

export default function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-about">
          <div className="brand">
            <span className="brand-mark">KT</span>
            <span className="brand-name">Kamoliddin<span className="brand-dot">.</span></span>
          </div>
          <p className="footer-tag">SOC analyst — blue-team operations, threat monitoring &amp; network defense.</p>
        </div>
        <div className="footer-col">
          <h4>Profile</h4>
          <ul>
            <li><Link href="/#about">{t("nav.about")}</Link></li>
            <li><Link href="/#skills">{t("nav.skills")}</Link></li>
            <li><Link href="/#experience">{t("nav.experience")}</Link></li>
            <li><Link href="/#projects">{t("nav.projects")}</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Explore</h4>
          <ul>
            <li><Link href="/blog">{t("nav.journal")}</Link></li>
            <li><Link href="/gallery">{t("nav.gallery")}</Link></li>
            <li><Link href="/library">{t("nav.library")}</Link></li>
            <li><Link href="/learning">{t("nav.learning")}</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>More</h4>
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
        <span>{t("footer.built")}</span>
        <button className="footer-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑ Top</button>
      </div>
    </footer>
  );
}
