"use client";
import { useLang } from "./Providers";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span className="footer-brand">Kamoliddin Tilonboyev</span>
        <span className="footer-copy">© {new Date().getFullYear()}</span>
        <a href="#" className="footer-top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("nav.portfolio")} ↑</a>
      </div>
    </footer>
  );
}
