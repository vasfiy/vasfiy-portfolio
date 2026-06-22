"use client";
import { useState } from "react";
import { useLang } from "./Providers";
import Reveal from "./Reveal";
import { pinSort } from "@/lib/data";
import { pick } from "@/lib/i18n";
import type { Book, Category } from "@/lib/types";

export default function LibraryGrid({ books, cats }: { books: Book[]; cats: Record<string, Category> }) {
  const { lang, t } = useLang();
  const [filter, setFilter] = useState("all");
  const present = Array.from(new Set(books.map((b) => b.cat).filter(Boolean))) as string[];
  const items = pinSort(filter === "all" ? books : books.filter((b) => b.cat === filter));

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
              return (
                <Reveal className="book-card glass" key={b.__id || i}>
                  <div className="book-cover">{cover ? <img src={cover} alt={title} loading="lazy" /> : <span className="book-emoji">📕</span>}</div>
                  <div className="book-info">
                    <h3>{title}</h3>
                    {b.author && <p className="book-author">{t("library.by")} {b.author}</p>}
                    {desc && <p className="book-desc">{desc}</p>}
                    <div className="book-actions">
                      {file ? <>
                        <a className="btn btn-primary btn-sm" href={file} target="_blank" rel="noopener">{t("library.read")}</a>
                        <a className="btn btn-ghost btn-sm" href={file} download>{t("library.download")}</a>
                      </> : <span className="book-nofile">—</span>}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
