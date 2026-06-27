"use client";
import Link from "next/link";
import { useState } from "react";
import { useLang } from "./Providers";
import Reveal from "./Reveal";
import { pick } from "@/lib/i18n";
import { blogSort, fmtDate, ytId, readingTime } from "@/lib/data";
import type { Post } from "@/lib/types";

export default function BlogList({ posts }: { posts: Post[] }) {
  const { lang, t } = useLang();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const cats = Array.from(new Set(posts.map((p) => p.cat).filter(Boolean))) as string[];
  const matched = blogSort(
    posts
      .filter((p) => filter === "all" || p.cat === filter)
      .filter((p) => { const s = q.trim().toLowerCase(); return !s || (pick(p, "title", lang) + " " + pick(p, "body", lang) + " " + (p.cat || "")).toLowerCase().includes(s); })
  );
  const showFeatured = !q.trim() && filter === "all" && matched.length > 1;
  const featured = showFeatured ? matched[0] : null;
  const items = showFeatured ? matched.slice(1) : matched;

  const thumb = (p: Post, title: string) => {
    if (p.type === "image" && p.media) return <div className="bl-thumb"><img src={p.media} alt={title} loading="lazy" /></div>;
    if (p.type === "video" && p.media) return <div className="bl-thumb"><video src={p.media} muted preload="metadata" /><span className="vid-badge">▶</span></div>;
    if (p.type === "youtube" && p.media) return <div className="bl-thumb"><img src={`https://i.ytimg.com/vi/${ytId(p.media)}/hqdefault.jpg`} alt={title} loading="lazy" /><span className="vid-badge">▶</span></div>;
    return <div className="bl-thumb bl-thumb-text"><span>📝</span></div>;
  };

  return (
    <section className="section page-hero">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">✶</span> <span>{t("blog.sub")}</span></span>
          <h1 className="section-title">{t("blog.title")}</h1>
        </Reveal>
        <div className="bl-controls">
          <div className="bl-search">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === "uz" ? "Postlarni qidirish…" : "Search posts…"} aria-label="Search posts" />
            {q && <button className="bl-search-x" onClick={() => setQ("")} aria-label="Clear">×</button>}
          </div>
          {cats.length > 0 && (
            <div className="filter-bar">
              <button className={"filter-chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>{t("blog.all")}</button>
              {cats.map((c) => <button key={c} className={"filter-chip" + (filter === c ? " active" : "")} onClick={() => setFilter(c)}>{c}</button>)}
            </div>
          )}
        </div>

        {featured && (() => {
          const title = pick(featured, "title", lang);
          const body = pick(featured, "body", lang);
          const full = pick(featured, "full", lang) || body;
          return (
            <Link className="bl-featured glass" href={`/blog/${featured.__id ?? 0}`}>
              {thumb(featured, title)}
              <div className="bl-feat-body">
                <span className="bl-feat-tag">★ {lang === "uz" ? "Tanlangan" : "Featured"}</span>
                <div className="blog-meta"><span>{fmtDate(featured.date, lang)}</span>{featured.location && <span className="b-loc">📍 {featured.location}</span>}<span className="read-time">⏱ {readingTime(full)} {t("blog.min")}</span></div>
                <h2>{title}</h2>
                {body && <p>{body}</p>}
                <span className="bl-read">{t("blog.read")}</span>
              </div>
            </Link>
          );
        })()}

        {items.length === 0 && !featured ? <p className="empty-note">{q.trim() ? t("search.none") : t("blog.empty")}</p> : (
          <div className="bl-grid">
            {items.map((p, i) => {
              const title = pick(p, "title", lang);
              const body = pick(p, "body", lang);
              const full = pick(p, "full", lang) || body;
              const href = `/blog/${p.__id ?? i}`;
              return (
                <Link className="bl-card glass" href={href} key={p.__id || i}>
                  {p.pinned && <span className="pin-badge">📌</span>}
                  {thumb(p, title)}
                  <div className="bl-body">
                    <div className="blog-meta"><span>{fmtDate(p.date, lang)}</span>{p.location && <span className="b-loc">📍 {p.location}</span>}<span className="read-time">⏱ {readingTime(full)} {t("blog.min")}</span></div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                    <span className="bl-read">{t("blog.read")}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
