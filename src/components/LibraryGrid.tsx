"use client";
import { useState, type SyntheticEvent } from "react";
import { useLang } from "./Providers";
import Reveal from "./Reveal";
import { pinSort } from "@/lib/format";
import { mediaUrl, onMediaError } from "@/lib/media";
import { pick } from "@/lib/i18n";
import BookReader, { downloadFile } from "./BookReader";
import type { Book, Category } from "@/lib/types";

export default function LibraryGrid({ books, cats }: { books: Book[]; cats: Record<string, Category> }) {
  const { lang, t } = useLang();
  const [filter, setFilter] = useState("all");
  // The reader owns its whole modal shell (focus trap, scroll lock, Escape,
  // fullscreen); the grid only remembers which book is open. `id` is the
  // stable position-memory key (book __id, falling back to the file URL).
  const [reading, setReading] = useState<{ file: string; title: string; id: string } | null>(null);

  const present = Array.from(new Set(books.map((b) => b.cat).filter(Boolean))) as string[];
  const items = pinSort(filter === "all" ? books : books.filter((b) => b.cat === filter));

  const fileName = (title: string) => (title ? title.replace(/[^\w]+/g, "_") : "document");
  // after onMediaError consumed data-original, a further error means the original is gone too — hide the img
  const coverError = (e: SyntheticEvent<HTMLImageElement>) => { const el = e.currentTarget; if (el.dataset.original) onMediaError(e); else el.style.display = "none"; };

  return (
    <section className="section page-hero">
      <div className="container">
        <Reveal className="section-head masthead">
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
              return (
                <Reveal className="book-card glass" key={b.__id || i}>
                  <div className="book-cover">{cover ? <img src={mediaUrl(cover, 800)} data-original={cover} onError={coverError} alt={title ? "" : "cover"} loading="lazy" decoding="async" /> : <span className="book-emoji">{b.cover || "📕"}</span>}</div>
                  <div className="book-info">
                    <h3>{title}</h3>
                    {b.author && <p className="book-author">{t("library.by")} {b.author}</p>}
                    {desc && <p className="book-desc">{desc}</p>}
                    <div className="book-actions">
                      {file ? <>
                        {/* every file opens the reader: PDFs render page-by-page
                            on canvas, other formats get the open-in-new-tab
                            fallback screen inside the same shell */}
                        <button className="btn btn-primary btn-sm" onClick={() => setReading({ file, title, id: b.__id || file })}>{t("library.read")}</button>
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

      {reading && <BookReader file={reading.file} title={reading.title} bookId={reading.id} onClose={() => setReading(null)} />}
    </section>
  );
}
