"use client";

import { useLang } from "./Providers";
import Reveal from "./Reveal";
import S from "./learning.module.css";

/* Darslarim — the live platforms from Kamoliddin's own English classes.
   Mirrors the Learning hub's card system (same module, same tokens) so the
   two sections read as siblings; new lesson platforms append as new cards. */
const STR = {
  en: {
    tag: "Live platform",
    fTitle: "Speaking Daftari",
    fDesc: "Vocabulary, flashcards, quizzes and pronunciation drills from my speaking classes — American-voice audio, spaced repetition and daily goals.",
    more: "New lessons are added after every class.",
  },
  uz: {
    tag: "Jonli platforma",
    fTitle: "Speaking Daftari",
    fDesc: "Speaking darslarimning lug'atlari, flashkartalar, testlar va talaffuz mashqlari — amerikacha ovoz, takrorlash tizimi va kunlik maqsadlar bilan.",
    more: "Yangi darslar har darsdan keyin qo'shiladi.",
  },
} as const;

export default function Darslarim() {
  const { lang, t } = useLang();
  const str = lang === "uz" ? STR.uz : STR.en;

  return (
    <section className="section page-hero" id="darslarim">
      <div className="container">
        <Reveal className="section-head masthead">
          <span className="section-kicker"><span className="kicker-num">✶</span> <span>{t("dars.sub")}</span></span>
          <h1 className="section-title">{t("dars.title")}</h1>
        </Reveal>

        <Reveal className={S.grid}>
          <a className={`${S.card} ${S.cardLink} ${S.featured}`} href="/speaking-daftari.html">
            <div className={S.top}>
              <span className={S.iconBadge} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3.5" y="6.5" width="13" height="14" rx="2.5" />
                  <path d="M8 3.5h10.5A2.5 2.5 0 0 1 21 6v11" />
                </svg>
              </span>
              <span className={S.tag}>{str.tag}</span>
            </div>
            <h3 className={S.title}>{str.fTitle}</h3>
            <p className={S.desc}>{str.fDesc}</p>
            <span className={S.meta}>/speaking-daftari.html</span>
            <span className={S.open}>{t("learn.open")}</span>
            <span className={S.bar} aria-hidden="true"><span className={S.barFill} /></span>
          </a>
        </Reveal>

        <Reveal className={S.sims}>
          <span className={S.simsLabel}>{str.more}</span>
        </Reveal>
      </div>
    </section>
  );
}
