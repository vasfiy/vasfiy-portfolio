"use client";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useLang } from "./Providers";
import Reveal from "./Reveal";
import { pinSort } from "@/lib/format";
import { mediaUrl, onMediaError } from "@/lib/media";
import { pick } from "@/lib/i18n";
import type { Book, Category } from "@/lib/types";

async function downloadFile(url: string, bare: string) {
  try {
    const r = await fetch(url);
    const b = await r.blob();
    // extension comes from the served MIME type when the name lacks one (.pdf last resort)
    const name = /\.\w+$/.test(bare) ? bare : bare + "." + ((b.type.split("/")[1] || "pdf").split(";")[0].trim() || "pdf");
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

  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    document.body.style.overflow = reading ? "hidden" : "";
    const prev = reading ? document.activeElement as HTMLElement | null : null;
    if (reading) closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.fullscreenElement) setReading(null); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus?.(); };
  }, [reading]);

  const fileName = (title: string) => (title ? title.replace(/[^\w]+/g, "_") : "document");
  // after onMediaError consumed data-original, a further error means the original is gone too — hide the img
  const coverError = (e: SyntheticEvent<HTMLImageElement>) => { const el = e.currentTarget; if (el.dataset.original) onMediaError(e); else el.style.display = "none"; };

  return (
    <section className="section page-hero">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">✶</span> <span>{t("library.sub")}</span></span>
          <h1 className="section-title">{t("library.title")}</h1>
        </Reveal>
        {present.length > 0 && (
          <div className="filter-bar">
            <button className={"filter-chip" + (filter === "all" ? " active" : "")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("gallery.all")}</button>
            {present.map((c) => <button key={c} className={"filter-chip" + (filter === c ? " active" : "")} aria-pressed={filter === c} onClick={() => setFilter(c)}>{(cats[c] && (cats[c][lang] || cats[c].en)) || c}</button>)}
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
                  <div className="book-cover">{cover ? <img src={mediaUrl(cover, 800)} data-original={cover} onError={coverError} alt={title ? "" : "cover"} loading="lazy" decoding="async" /> : <span className="book-emoji">📕</span>}</div>
                  <div className="book-info">
                    <h3>{title}</h3>
                    {b.author && <p className="book-author">{t("library.by")} {b.author}</p>}
                    {desc && <p className="book-desc">{desc}</p>}
                    <div className="book-actions">
                      {file ? <>
                        {isPdf
                          ? <button className="btn btn-primary btn-sm" onClick={() => setReading({ url: file, title })}>{t("library.read")}</button>
                          : <a className="btn btn-primary btn-sm" href={file} target="_blank" rel="noopener">{t("library.read")}</a>}
                        <button className="btn btn-ghost btn-sm" onClick={() => downloadFile(file, fileName(title))}>↓ {t("library.download")}</button>
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
          <div className="reader-inner glass" role="dialog" aria-modal="true" aria-label={reading.title} ref={readerRef}>
            <div className="reader-bar">
              <span className="reader-title">{reading.title}</span>
              <span className="reader-actions">
                <button className="btn btn-ghost btn-sm" onClick={toggleFs} title={lang === "uz" ? "To'liq ekran" : "Fullscreen"}>⛶</button>
                <a className="btn btn-ghost btn-sm" href={reading.url} target="_blank" rel="noopener">{t("lib.readOnline")}</a>
                <button className="btn btn-ghost btn-sm" onClick={() => downloadFile(reading.url, fileName(reading.title))}>↓ {t("library.download")}</button>
                <button className="reader-close" aria-label={t("ui.close")} ref={closeRef} onClick={() => setReading(null)}>×</button>
              </span>
            </div>
            <iframe src={reading.url} title={reading.title} />
          </div>
        </div>
      )}
    </section>
  );
}
