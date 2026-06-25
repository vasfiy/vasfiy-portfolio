"use client";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./Providers";
import Reveal from "./Reveal";
import { pinSort } from "@/lib/data";
import { pick } from "@/lib/i18n";
import type { Book, Category } from "@/lib/types";

async function downloadFile(url: string, name: string) {
  try {
    const r = await fetch(url);
    const b = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  } catch {
    window.open(url + (url.includes("?") ? "&" : "?") + "download", "_blank");
  }
}

export default function LibraryGrid({ books, cats }: { books: Book[]; cats: Record<string, Category> }) {
  const { lang, t } = useLang();
  const [filter, setFilter] = useState("all");
  const [reading, setReading] = useState<{ url: string; title: string } | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const toggleFs = () => { const el = readerRef.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else el.requestFullscreen?.().catch(() => {}); };
  const present = Array.from(new Set(books.map((b) => b.cat).filter(Boolean))) as string[];
  const items = pinSort(filter === "all" ? books : books.filter((b) => b.cat === filter));

  useEffect(() => {
    document.body.style.overflow = reading ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setReading(null); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [reading]);

  const fileName = (url: string, title: string) => (title ? title.replace(/[^\w]+/g, "_") : "document") + (url.match(/\.\w+(?=$|\?)/)?.[0] || ".pdf");

  return (
    <section className="section page-hero">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">✶</span> <span>{t("library.sub")}</span></span>
          <h1 className="section-title">{t("library.title")}</h1>
        </Reveal>
        {present.length > 0 && (
          <div className="filter-bar">
            <button className={"filter-chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>{t("gallery.all")}</button>
            {present.map((c) => <button key={c} className={"filter-chip" + (filter === c ? " active" : "")} onClick={() => setFilter(c)}>{(cats[c] && (cats[c][lang] || cats[c].en)) || c}</button>)}
          </div>
        )}
        {items.length === 0 ? <p className="empty-note">{t("library.empty")}</p> : (
          <div className="books-grid">
            {items.map((b, i) => {
              const title = pick(b, "title", lang);
              const desc = pick(b, "desc", lang);
              const file = b.file && /^https?:\/\//.test(b.file) ? b.file : null;
              const cover = b.cover && /^https?:\/\//.test(b.cover) ? b.cover : null;
              const isPdf = file && /\.pdf(\?|$)/i.test(file);
              return (
                <Reveal className="book-card glass" key={b.__id || i}>
                  <div className="book-cover">{cover ? <img src={cover} alt={title} loading="lazy" /> : <span className="book-emoji">📕</span>}</div>
                  <div className="book-info">
                    <h3>{title}</h3>
                    {b.author && <p className="book-author">{t("library.by")} {b.author}</p>}
                    {desc && <p className="book-desc">{desc}</p>}
                    <div className="book-actions">
                      {file ? <>
                        {isPdf
                          ? <button className="btn btn-primary btn-sm" onClick={() => setReading({ url: file, title })}>{t("library.read")}</button>
                          : <a className="btn btn-primary btn-sm" href={file} target="_blank" rel="noopener">{t("library.read")}</a>}
                        <button className="btn btn-ghost btn-sm" onClick={() => downloadFile(file, fileName(file, title))}>↓ {t("library.download")}</button>
                      </> : <span className="book-nofile">—</span>}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>

      {reading && (
        <div className="reader-modal open" onClick={(e) => { if (e.target === e.currentTarget) setReading(null); }}>
          <div className="reader-inner glass" ref={readerRef}>
            <div className="reader-bar">
              <span className="reader-title">{reading.title}</span>
              <span className="reader-actions">
                <button className="btn btn-ghost btn-sm" onClick={toggleFs} title={lang === "uz" ? "To'liq ekran" : "Fullscreen"}>⛶</button>
                <button className="btn btn-ghost btn-sm" onClick={() => downloadFile(reading.url, fileName(reading.url, reading.title))}>↓ {t("library.download")}</button>
                <button className="reader-close" aria-label="Close" onClick={() => setReading(null)}>×</button>
              </span>
            </div>
            <iframe src={reading.url} title={reading.title} />
          </div>
        </div>
      )}
    </section>
  );
}
