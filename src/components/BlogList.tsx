"use client";
import Link from "next/link";
import { useState } from "react";
import { useLang } from "./Providers";
import Reveal from "./Reveal";
import { pick } from "@/lib/i18n";
import { blogSort, fmtDate, ytId, readingTime, postText } from "@/lib/format";
import { mediaUrl, onMediaError } from "@/lib/media";
import type { Post, Category } from "@/lib/types";

export default function BlogList({ posts, cats = {} }: { posts: Post[]; cats?: Record<string, Category> }) {
  const { lang, t } = useLang();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const present = Array.from(new Set(posts.map((p) => p.cat).filter(Boolean))) as string[];
  const catLabel = (c: string) => { const m = cats[c]; return m ? (m.icon ? m.icon + " " : "") + (m[lang] || m.en || c) : c; };
  const matched = blogSort(
    posts
      .filter((p) => filter === "all" || p.cat === filter)
      .filter((p) => { const s = q.trim().toLowerCase(); return !s || (pick(p, "title", lang) + " " + pick(p, "body", lang) + " " + postText(p, lang) + " " + (p.cat || "")).toLowerCase().includes(s); })
  );
  const showFeatured = !q.trim() && filter === "all" && matched.length > 1 && !!matched[0].__id;
  const featured = showFeatured ? matched[0] : null;
  const items = (showFeatured ? matched.slice(1) : matched).filter((p) => p.__id);

  const thumb = (p: Post, title: string) => {
    // New block model: cover = first image block (else first video/youtube).
    const blocks = Array.isArray(p.blocks) ? p.blocks : [];
    const img = blocks.find((b) => b.type === "image" && b.url);
    if (img) return <div className="bl-thumb"><img src={mediaUrl(img.url, 800)} data-original={img.url} onError={onMediaError} alt={title} loading="lazy" decoding="async" /></div>;
    const vid = blocks.find((b) => b.type === "video" && b.url);
    if (vid) return <div className="bl-thumb bl-thumb-text"><span aria-hidden="true">▶</span></div>;
    const yt = blocks.find((b) => b.type === "youtube" && b.url);
    if (yt) return <div className="bl-thumb"><img src={`https://i.ytimg.com/vi/${ytId(yt.url!)}/hqdefault.jpg`} alt={title} loading="lazy" decoding="async" /><span className="vid-badge" aria-hidden="true">▶</span></div>;
    if (p.type === "image" && p.media) return <div className="bl-thumb"><img src={mediaUrl(p.media, 800)} data-original={p.media} onError={onMediaError} alt={title} loading="lazy" decoding="async" /></div>;
    if (p.type === "video" && p.media) return <div className="bl-thumb bl-thumb-text"><span aria-hidden="true">▶</span></div>;
    if (p.type === "youtube" && p.media) return <div className="bl-thumb"><img src={`https://i.ytimg.com/vi/${ytId(p.media)}/hqdefault.jpg`} alt={title} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = "none"; }} /><span className="vid-badge" aria-hidden="true">▶</span></div>;
    return <div className="bl-thumb bl-thumb-text"><span aria-hidden="true">📝</span></div>;
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
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === "uz" ? "Postlarni qidirish…" : "Search posts…"} aria-label={t("blog.searchAria")} />
            {q && <button className="bl-search-x" onClick={() => setQ("")} aria-label={t("blog.clear")}>×</button>}
          </div>
          {present.length > 0 && (
            <div className="filter-bar">
              <button className={"filter-chip" + (filter === "all" ? " active" : "")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("blog.all")}</button>
              {present.map((c) => <button key={c} className={"filter-chip" + (filter === c ? " active" : "")} aria-pressed={filter === c} onClick={() => setFilter(c)}>{catLabel(c)}</button>)}
            </div>
          )}
        </div>

        {featured && (() => {
          const title = pick(featured, "title", lang);
          const body = pick(featured, "body", lang);
          const text = postText(featured, lang);
          return (
            <Link className="bl-featured glass" href={`/blog/${featured.__id}`}>
              {thumb(featured, title)}
              <div className="bl-feat-body">
                <span className="bl-feat-tag"><span aria-hidden="true">★</span> {lang === "uz" ? "Tanlangan" : "Featured"}</span>
                <div className="blog-meta"><span>{fmtDate(featured.date, lang)}</span>{featured.location && <span className="b-loc"><span aria-hidden="true">📍</span> {featured.location}</span>}<span className="read-time"><span aria-hidden="true">⏱</span> {readingTime(text)} {t("blog.min")}</span></div>
                <h2>{title}</h2>
                {body && <p>{body}</p>}
                <span className="bl-read">{t("blog.read")}</span>
              </div>
            </Link>
          );
        })()}

        {items.length === 0 && !featured ? <p className="empty-note">{q.trim() ? t("search.none") : filter !== "all" ? t("blog.nomatch") : t("blog.empty")}</p> : (
          <div className="bl-grid">
            {items.map((p, i) => {
              const title = pick(p, "title", lang);
              const body = pick(p, "body", lang);
              const href = `/blog/${p.__id!}`;
              return (
                <Link className="bl-card glass" href={href} key={p.__id || i}>
                  {p.pinned && <span className="pin-badge" aria-hidden="true">📌</span>}
                  {thumb(p, title)}
                  <div className="bl-body">
                    <div className="blog-meta"><span>{fmtDate(p.date, lang)}</span>{p.location && <span className="b-loc"><span aria-hidden="true">📍</span> {p.location}</span>}<span className="read-time"><span aria-hidden="true">⏱</span> {readingTime(postText(p, lang))} {t("blog.min")}</span></div>
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
