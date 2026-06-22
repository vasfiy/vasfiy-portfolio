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
  const cats = Array.from(new Set(posts.map((p) => p.cat).filter(Boolean))) as string[];
  const items = blogSort(filter === "all" ? posts : posts.filter((p) => p.cat === filter));

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
        {cats.length > 0 && (
          <div className="filter-bar">
            <button className={"filter-chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>{t("blog.all")}</button>
            {cats.map((c) => <button key={c} className={"filter-chip" + (filter === c ? " active" : "")} onClick={() => setFilter(c)}>{c}</button>)}
          </div>
        )}
        {items.length === 0 ? <p className="empty-note">{t("blog.empty")}</p> : (
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
