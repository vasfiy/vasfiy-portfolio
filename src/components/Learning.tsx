"use client";
import { pinSort } from "@/lib/format";
import { useLang } from "./Providers";
import { pick } from "@/lib/i18n";
import Reveal from "./Reveal";
import type { Course } from "@/lib/types";
import type { ReactNode } from "react";
import S from "./learning.module.css";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/* Line icons for the course badges — emoji read cheap at 52px against the mono /
   gradient design language. Known keys map to SVG; anything else the admin stored
   still renders as-is. */
const ICONS: Record<string, ReactNode> = {
  "📝": (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  ),
  "🐧": (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M7 9l3 3-3 3M12.5 15H17" />
    </svg>
  ),
  "🎓": (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 9.5L12 5l9.5 4.5L12 14 2.5 9.5Z" />
      <path d="M6.5 11.5V16c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.5M21 10v5" />
    </svg>
  ),
  "📘": (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
    </svg>
  ),
};

/* Links are stored for the static site ("aplus.html"); map them onto this app.
   Self-contained simulators live in /public as plain HTML; everything else is a route. */
const STATIC_PAGES = ["aplus", "ielts"];

const href = (raw?: string) => {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const slug = s.replace(/^\//, "").replace(/\.html$/i, "");
  return STATIC_PAGES.includes(slug.toLowerCase()) ? `/${slug}.html` : `/${slug}`;
};

/* Honest card meta: the real host for external links, the real path for
   internal ones — never an invented "level" or "duration". */
const sourceOf = (raw?: string) => {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) {
    try { return new URL(s).host; } catch { return s; }
  }
  return "/" + s.replace(/^\/+/, "");
};

/* Tag keyword families → pill/bar colour family. Matched against the tag in
   BOTH languages so a card keeps its colour when the reader switches;
   everything else falls back to the theme accent. */
const EXAM_RE = /exam|imtihon|simulat|simulyator|aplus|ielts/i;
const LAB_RE = /\blab/i;

const family = (c: Course): "exam" | "lab" | "accent" => {
  const hay = `${c.tag || ""} ${c.tagUz || ""}`;
  if (EXAM_RE.test(hay)) return "exam";
  if (LAB_RE.test(hay)) return "lab";
  return "accent";
};

const slugOf = (raw?: string) =>
  String(raw || "").trim().replace(/^\//, "").replace(/\.html$/i, "").toLowerCase();

/* UI strings that have no dict key yet (this component owns them; the shared
   dictionary is out of scope). */
const STR = {
  en: {
    courses: "courses", labs: "with labs", exams: "exam preps",
    soon: "Coming soon",
    simsLabel: "Exam simulators:",
    simA: "A+", simAI11y: "Open the CompTIA A+ exam simulator",
    simI: "IELTS", simII11y: "Open the IELTS exam simulator",
  },
  uz: {
    courses: "ta kurs", labs: "ta laboratoriya", exams: "ta imtihon",
    soon: "Tez orada",
    simsLabel: "Imtihon simulyatorlari:",
    simA: "A+", simAI11y: "CompTIA A+ imtihon simulyatorini ochish",
    simI: "IELTS", simII11y: "IELTS imtihon simulyatorini ochish",
  },
} as const;

export default function Learning({ courses }: { courses: Course[] }) {
  const { lang, t } = useLang();
  const list = pinSort(courses);
  const str = lang === "uz" ? STR.uz : STR.en;

  /* Stat chips — derived from the live data only: total courses, how many are
     tagged as labs, how many are exam preps (exam-ish tag, or aimed at one of
     the static exam-simulator pages). Zero-count chips are skipped rather
     than shown as fake progress. */
  const examCount = list.filter(
    (c) => EXAM_RE.test(`${c.tag || ""} ${c.tagUz || ""}`) || STATIC_PAGES.includes(slugOf(c.link)),
  ).length;
  const labCount = list.filter((c) => LAB_RE.test(`${c.tag || ""} ${c.tagUz || ""}`)).length;
  const chips = [
    { n: list.length, label: str.courses },
    ...(labCount > 0 ? [{ n: labCount, label: str.labs }] : []),
    ...(examCount > 0 ? [{ n: examCount, label: str.exams }] : []),
  ];

  return (
    <section className="section page-hero" id="learning">
      <div className="container">
        <Reveal className="section-head masthead">
          <span className="section-kicker"><span className="kicker-num">✶</span> <span>{t("learn.sub")}</span></span>
          <h1 className="section-title">{t("learn.title")}</h1>
          {chips.length > 0 && (
            <div className={S.chips}>
              {chips.map((ch) => (
                <span className={S.chip} key={ch.label}>
                  <b className={S.chipNum}>{ch.n}</b> {ch.label}
                </span>
              ))}
            </div>
          )}
        </Reveal>

        {list.length === 0 ? (
          <p className="empty-note">{t("learn.empty")}</p>
        ) : (
          <Reveal className={S.grid}>
            {list.map((c, i) => {
              const link = href(c.link);
              const linked = link !== "";
              const fam = family(c);
              const tag = pick(c, "tag", lang);
              /* Real meta only: the editor's own meta string, else the honest
                 link source (host for external, path for internal). */
              const meta = pick(c, "meta", lang) || sourceOf(c.link);
              const title = pick(c, "title", lang);
              const desc = pick(c, "desc", lang);
              const cls = cx(
                S.card,
                linked && S.cardLink,
                i === 0 && S.featured,
                fam === "exam" && S.famExam,
                fam === "lab" && S.famLab,
              );
              const body = (
                <>
                  <div className={S.top}>
                    <span className={S.iconBadge} aria-hidden="true">{ICONS[(c.icon || "").replace(/[\s\uFE0F]/g, "")] ?? (c.icon || "📘")}</span>
                    {tag && <span className={S.tag}>{tag}</span>}
                    {!linked && <span className={S.soon}>{str.soon}</span>}
                  </div>
                  {title && <h3 className={S.title}>{title}</h3>}
                  {desc && <p className={S.desc}>{desc}</p>}
                  {meta && <span className={S.meta}>{meta}</span>}
                  {linked && <span className={S.open}>{t("learn.open")}</span>}
                  <span className={S.bar} aria-hidden="true"><span className={S.barFill} /></span>
                </>
              );
              return linked ? (
                <a
                  className={cls}
                  key={c.__id || i}
                  href={link}
                  {...(/^https?:\/\//.test(link) ? { target: "_blank", rel: "noopener" } : {})}
                >
                  {body}
                </a>
              ) : (
                <div className={cls} key={c.__id || i}>{body}</div>
              );
            })}
          </Reveal>
        )}

        {/* The standalone exam simulators live as plain pages in /public. */}
        <Reveal className={S.sims}>
          <span className={S.simsLabel}>{str.simsLabel}</span>
          <a className={S.simsLink} href="/aplus.html" aria-label={str.simAI11y}>{str.simA}</a>
          <span className={S.simsDot} aria-hidden="true">·</span>
          <a className={S.simsLink} href="/ielts.html" aria-label={str.simII11y}>{str.simI}</a>
        </Reveal>
      </div>
    </section>
  );
}
