"use client";
import { useLang } from "./Providers";
import { pick } from "@/lib/i18n";
import Reveal from "./Reveal";
import type { Course } from "@/lib/types";

function pinSort<T extends { pinned?: boolean }>(arr: T[]): T[] {
  return arr.map((x, i) => [x, i] as const)
    .sort((a, b) => (b[0].pinned ? 1 : 0) - (a[0].pinned ? 1 : 0) || a[1] - b[1])
    .map(([x]) => x);
}

export default function Learning({ courses }: { courses: Course[] }) {
  const { lang, t } = useLang();
  const list = pinSort(courses);
  // Links are stored for the static site ("aplus.html"); map them onto this app.
  // Self-contained simulators live in /public as plain HTML; everything else is a route.
  const STATIC_PAGES = ["aplus", "ielts"];
  const href = (raw?: string) => {
    const s = String(raw || "").trim();
    if (!s) return "#";
    if (/^https?:\/\//.test(s)) return s;
    const slug = s.replace(/^\//, "").replace(/\.html$/i, "");
    return STATIC_PAGES.includes(slug.toLowerCase()) ? `/${slug}.html` : `/${slug}`;
  };

  return (
    <section className="section page-hero" id="learning">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">✶</span> <span>{t("learn.sub")}</span></span>
          <h1 className="section-title">{t("learn.title")}</h1>
        </Reveal>
        <Reveal className="course-grid">
          {list.map((c, i) => (
            <a className="course-card glass" key={c.__id || i} href={href(c.link)}>
              <span className="course-icon">{c.icon || "📘"}</span>
              <div className="course-body">
                {(pick(c, "tag", lang) || c.tag) && <span className="course-tag">{pick(c, "tag", lang) || c.tag}</span>}
                <h3>{pick(c, "title", lang)}</h3>
                <p>{pick(c, "desc", lang)}</p>
                {pick(c, "meta", lang) && <span className="course-meta">{pick(c, "meta", lang)}</span>}
              </div>
              <span className="course-go">{t("learn.open")}</span>
            </a>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
