"use client";
import Link from "next/link";
import { useLang } from "@/components/Providers";

export default function NotFound() {
  const { t } = useLang();
  return (
    <section className="section page-hero nf-page">
      <div className="container nf-inner">
        <p className="nf-code">404</p>
        <h1 className="section-title">{t("nf.title")}</h1>
        <p className="hero-desc">{t("nf.desc")}</p>
        <div className="nf-actions">
          <Link className="btn btn-primary" href="/">{t("nf.home")}</Link>
          <Link className="btn btn-ghost" href="/blog">{t("nav.journal")}</Link>
          <Link className="btn btn-ghost" href="/gallery">{t("nav.gallery")}</Link>
        </div>
      </div>
    </section>
  );
}
