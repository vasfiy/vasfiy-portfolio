"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./Providers";
import Reveal from "./Reveal";
import Counter from "./Counter";
import { pick } from "@/lib/i18n";
import { pinSort, blogSort, fmtDate, ytId, isVideo, readingTime } from "@/lib/format";
import { mediaUrl, onMediaError } from "@/lib/media";
import VoiceRecorder from "./VoiceRecorder";
import Icon from "./Icon";
import WorldBreak from "./WorldBreak";
import type { SiteData, Lang } from "@/lib/types";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

/* The hero visual is a few KB of 2D canvas now (was ~0.8 MB of Three.js):
   skipped on mobile and for reduced-motion users, deferred to browser idle. */
function HeroCanvasLazy() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.innerWidth < 768) return;
    const w = window as any;
    const id = w.requestIdleCallback ? w.requestIdleCallback(() => setShow(true), { timeout: 2500 }) : window.setTimeout(() => setShow(true), 1400);
    return () => { if (w.cancelIdleCallback) w.cancelIdleCallback(id); else clearTimeout(id); };
  }, []);
  return show ? <HeroCanvas /> : null;
}

export default function Home({ data }: { data: SiteData }) {
  const st = data.settings.siteText || {};
  return (
    <>
      <Hero data={data} st={st} />
      <WorldBreak slot={0} />
      <About data={data} st={st} />
      <Skills data={data} />
      <Experience data={data} />
      <Projects data={data} />
      <WorldBreak slot={1} />
      <JournalPreview data={data} />
      <GalleryPreview data={data} />
      <Education data={data} />
      <Explore data={data} />
      <WorldBreak slot={2} />
      <Contact st={st} />
    </>
  );
}

/* ---------------- Hero ---------------- */
function Hero({ data, st }: { data: SiteData; st: any }) {
  const { lang, t } = useLang();
  const rawRoles: string[] = (lang === "uz" ? st.heroRolesUz : st.heroRoles) || st.heroRoles || [];
  const roles = rawRoles.length ? rawRoles : ["SOC Analyst", "Blue-Team Defender", "Threat Hunter"]; // [] is truthy: don't let the typewriter loop forever
  const [typed, setTyped] = useState("");
  const [ri, setRi] = useState(0);

  useEffect(() => {
    const word = roles[ri % roles.length] || "";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setTyped(word); return; } // reduced motion: static full word
    let i = 0, del = false, to: any;
    const run = () => {
      if (!del) { setTyped(word.slice(0, i + 1)); i++; if (i === word.length) { del = true; to = setTimeout(run, 1600); return; } }
      else { setTyped(word.slice(0, i - 1)); i--; if (i === 0) { del = false; setRi((x) => x + 1); return; } }
      to = setTimeout(run, del ? 45 : 80);
    };
    to = setTimeout(run, 250);
    return () => clearTimeout(to);
  }, [ri, lang, roles.join("|")]); // eslint-disable-line

  const badge = pick(st, "heroBadge", lang) || (lang === "uz" ? "Yevropaga ishga joylashishga ochiq" : "Open to relocation · Europe");
  const desc = pick(st, "heroDesc", lang) || (lang === "uz" ? "Blue-team operatsiyalari, tahdid monitoringi va tarmoq tahlili bo‘yicha amaliy tajribaga ega istiqbolli SOC analitigi." : "Aspiring SOC Analyst with hands-on experience in blue-team operations, threat monitoring, and network analysis.");
  const soc = st;

  return (
    <section className="hero" id="hero">
      <div className="hero-canvas"><HeroCanvasLazy /></div>
      <div className="container hero-inner">
        <div className="hero-grid">
          <div className="hero-main">
            <div className="hero-badge"><span className="status-dot" /> <span data-edit="heroBadge">{badge}</span></div>
            <h1 className="hero-title">
              <span className="hero-hi">{t("hero.hi")}</span>
              <span className="hero-name">Kamoliddin Tilonboyev</span>
            </h1>
            <p className="hero-role-line"><span className="hero-role-prefix">{t("hero.iam")}</span> <span className="hero-role gradient-text" aria-hidden="true">{typed}</span><span className="caret" aria-hidden="true">|</span><span className="sr-only">{roles[0]}</span></p>
            <p className="hero-desc" data-edit="heroDesc">{desc}</p>
            <div className="hero-cta">
              <a href="#contact" className="btn btn-primary">{t("hero.cta")}</a>
              {data.settings.cvUrl
                ? <a className="btn btn-ghost" href={data.settings.cvUrl} download target="_blank" rel="noopener"><span aria-hidden="true">📄</span> {t("hero.cv")}</a>
                : <Link href="/cv" className="btn btn-ghost"><span aria-hidden="true">📄</span> {t("hero.cv")}</Link>}
              <a href="#projects" className="btn btn-ghost">{t("hero.work")}</a>
            </div>
            <div className="hero-socials">
              {soc.socialLinkedin && <a href={soc.socialLinkedin} target="_blank" rel="noopener" aria-label="LinkedIn" className="social-link"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21H9z" /></svg></a>}
              {soc.socialWebsite && <a href={soc.socialWebsite} target="_blank" rel="noopener" aria-label={t("hero.website")} className="social-link"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></svg></a>}
              {soc.socialEmail && <a href={"mailto:" + soc.socialEmail} aria-label="Email" className="social-link"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></a>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- About ---------------- */
function About({ data, st }: { data: SiteData; st: any }) {
  const { lang, t } = useLang();
  const photo = data.settings.profilePhoto;
  const stats = [1, 2, 3, 4].map((n) => ({ num: st["stat" + n + "Num"], suf: st["stat" + n + "Suffix"] || "", label: pick(st, "stat" + n + "Label", lang) }))
    .filter((s) => s.num != null && s.num !== "");
  return (
    <section className="section" id="about">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">01</span> <span>{t("about.kicker")}</span></span>
          <h2 className="section-title" data-edit="aboutTitle">{pick(st, "aboutTitle", lang) || "Defending systems, one alert at a time"}</h2>
        </Reveal>
        <div className="about-top">
          <Reveal className="photo-card glass">
            <div className="photo-frame"><span className="photo-ring" />
              {photo ? <img src={mediaUrl(photo, 800)} data-original={photo} onError={onMediaError} alt="Kamoliddin Tilonboyev" loading="lazy" decoding="async" /> : <span className="photo-fallback">KT</span>}
            </div>
          </Reveal>
          {["aboutP1", "aboutP2", "aboutP3"].some((k) => pick(st, k, lang)) && (
            <Reveal className="about-text glass">
              {["aboutP1", "aboutP2", "aboutP3"].map((k) => {
                const v = pick(st, k, lang);
                return v ? <p key={k} data-edit={k} dangerouslySetInnerHTML={{ __html: v }} /> : null;
              })}
            </Reveal>
          )}
        </div>
        {stats.length > 0 && (
          <Reveal className="about-stats">
            {stats.map((s, i) => (
              <div className="stat-card glass" key={i}>
                <Counter to={parseInt(String(s.num)) || 0} suffix={s.suf} />
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* ---------------- Skills ---------------- */
function Skills({ data }: { data: SiteData }) {
  const { lang, t } = useLang();
  const skills = pinSort(data.skills);
  const langs = pinSort(data.languages);
  if (!skills.length && !langs.length) return null; // no heading over an empty section
  return (
    <section className="section" id="skills">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">02</span> <span>{t("skills.kicker")}</span></span>
          <h2 className="section-title">{pick(data.settings.siteText, "skillsTitle", lang) || t("skills.title")}</h2>
        </Reveal>
        <div className="skills-grid">
          {skills.map((s, i) => (
            <Reveal className="skill-card glass" key={i}>
              <div className="skill-icon" aria-hidden="true">{s.icon || "🛠"}</div>
              <h3>{pick(s, "name", lang)}</h3>
              <div className="tags">{(s.tags || []).map((tg, j) => <span key={j}>{tg}</span>)}</div>
            </Reveal>
          ))}
        </div>
        {langs.length > 0 && (
          <Reveal className="lang-bars">
            <h3 className="lang-bars-title">{t("skills.langs")}</h3>
            {langs.map((l, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{pick(l, "label", lang)}</span>
                <div className="bar"><i style={{ ["--w" as any]: (parseInt(String(l.pct)) || 0) + "%" }} /></div>
              </div>
            ))}
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* ---------------- Experience ---------------- */
function Experience({ data }: { data: SiteData }) {
  const { lang, t } = useLang();
  const jobs = pinSort(data.experience);
  if (!jobs.length) return null; // no heading over an empty section
  return (
    <section className="section" id="experience">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">03</span> <span>{t("exp.kicker")}</span></span>
          <h2 className="section-title">{pick(data.settings.siteText, "expTitle", lang) || t("exp.title")}</h2>
        </Reveal>
        <div className="timeline">
          {jobs.map((j, i) => {
            const bullets = lang === "uz" && j.bulletsUz?.length ? j.bulletsUz : j.bullets || []; // [] is truthy: fall through to en bullets
            return (
              <Reveal className="tl-item" key={i}>
                <div className="tl-dot" />
                <div className="tl-card glass">
                  <div className="tl-top"><h3>{pick(j, "role", lang)}</h3><span className="tl-date">{j.date}</span></div>
                  <p className="tl-company">{j.company} · <span>{pick(j, "meta", lang)}</span></p>
                  <ul>{bullets.map((b, k) => <li key={k} dangerouslySetInnerHTML={{ __html: b }} />)}</ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Projects ---------------- */
function Projects({ data }: { data: SiteData }) {
  const { lang, t } = useLang();
  const [filter, setFilter] = useState("all");
  const all = pinSort(data.projects);
  if (!all.length) return null; // no heading over an empty section
  const cats = data.cats?.project || {};
  const present = Array.from(new Set(all.map((p) => p.cat).filter(Boolean))) as string[];
  const catLabel = (c: string) => { const m = cats[c]; return m ? (m.icon ? m.icon + " " : "") + (m[lang] || m.en || c) : c; };
  const projects = filter === "all" ? all : all.filter((p) => p.cat === filter);
  return (
    <section className="section" id="projects">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">04</span> <span>{t("proj.kicker")}</span></span>
          <h2 className="section-title">{pick(data.settings.siteText, "projTitle", lang) || t("proj.title")}</h2>
        </Reveal>
        {present.length > 0 && (
          <div className="filter-bar" style={{ marginBottom: 24 }}>
            <button className={"filter-chip" + (filter === "all" ? " active" : "")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("ui.all")}</button>
            {present.map((c) => <button key={c} className={"filter-chip" + (filter === c ? " active" : "")} aria-pressed={filter === c} onClick={() => setFilter(c)}>{catLabel(c)}</button>)}
          </div>
        )}
        <div className="projects-grid">
          {projects.map((p, i) => (
            <Reveal className="project-card glass" key={i}>
              <div className="project-head"><div className="project-icon" aria-hidden="true">{p.icon || "🔧"}</div><span className="project-period">{p.period}</span></div>
              <h3>{pick(p, "title", lang)}</h3>
              {pick(p, "sub", lang) && <p className="project-sub">{pick(p, "sub", lang)}</p>}
              <p className="project-desc">{pick(p, "desc", lang)}</p>
              <div className="tags">{(p.tags || []).map((tg, j) => <span key={j}>{tg}</span>)}</div>
              {p.linkUrl && <div className="project-links"><a href={p.linkUrl} target="_blank" rel="noopener">{pick(p, "linkLabel", lang) || t("proj.visit")}</a></div>}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Education ---------------- */
function Education({ data }: { data: SiteData }) {
  const { lang, t } = useLang();
  const edu = pinSort(data.education);
  const certs = pinSort(data.certs);
  const [viewing, setViewing] = useState<{ src: string; title: string; pdf: boolean } | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(0);
  const toggleFs = () => { const el = readerRef.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else el.requestFullscreen?.().catch(() => {}); };

  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.fullscreenElement) setViewing(null); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    lastFocus.current = document.activeElement as HTMLElement | null; // move focus into the dialog, restore it on close
    viewerRef.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; lastFocus.current?.focus(); lastFocus.current = null; };
  }, [viewing]);
  if (!edu.length && !certs.length) return null; // no heading over an empty section (kept after all hooks)

  // A site-hosted (/certs/…) or uploaded (Supabase) file is shown in-site; the verify URL goes to TryHackMe.
  const fileSrc = (c: any) => { const f = String(c.file || "").trim(); return /^(https?:\/\/|\/)/.test(f) ? f : ""; };
  const verifyUrl = (c: any) => { const u = String(c.url || "").trim(); return /^https?:\/\//.test(u) ? u : ""; };
  const isImg = (s: string) => /\.(png|jpe?g|gif|webp|svg|avif)($|\?)/i.test(s);
  // `img` is shared with the static site, where it is stored relative ("assets/certs/x.jpg").
  // Routes here are nested, so a relative value would resolve against the route — force root-relative.
  const imgSrc = (c: any) => { const s = String(c.img || "").trim(); if (!s) return ""; return /^https?:\/\//.test(s) || s.startsWith("/") ? s : "/" + s.replace(/^\.?\//, ""); };
  const slides = certs.filter((c) => imgSrc(c));
  const step = () => { const t = trackRef.current; const s = t?.querySelector<HTMLElement>(".cert-slide"); return s ? s.getBoundingClientRect().width + 22 : t?.clientWidth || 0; };
  const nudge = (dir: number) => trackRef.current?.scrollBy({ left: dir * step(), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  const onTrackScroll = () => { const t = trackRef.current; if (!t) return; const w = step(); if (w) setActive(Math.min(Math.round(t.scrollLeft / w), slides.length - 1)); };

  return (
    <section className="section" id="education">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">07</span> <span>{t("edu.kicker")}</span></span>
          <h2 className="section-title">{pick(data.settings.siteText, "eduTitle", lang) || t("edu.title")}</h2>
        </Reveal>
        <div className="edu-grid">
          <Reveal className="edu-col">
            <h3 className="edu-col-title">{t("edu.eduTitle")}</h3>
            {edu.map((e, i) => (
              <div className="edu-card glass" key={i}>
                <div className="tl-top"><h4>{pick(e, "degree", lang)}</h4><span className="tl-date">{pick(e, "date", lang)}</span></div>
                <p className="tl-company">{pick(e, "school", lang)}</p>
              </div>
            ))}
          </Reveal>
        </div>

        <Reveal className="cert-block">
          <h3 className="edu-col-title">{t("edu.certTitle")}</h3>
          <div className="cert-carousel">
            <button className="cert-nav cert-prev" type="button" aria-label={lang === "uz" ? "Oldingi" : "Previous"} onClick={() => nudge(-1)}>‹</button>
            <div className="cert-track" ref={trackRef} onScroll={onTrackScroll}>
              {slides.map((c, i) => {
                const name = pick(c, "name", lang);
                const img = imgSrc(c);
                const open = () => setViewing({ src: fileSrc(c) || img, title: name, pdf: !isImg(fileSrc(c) || img) });
                return (
                  <figure
                    className="cert-slide glass cert-clickable" key={c.__id || i}
                    onClick={open} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
                  >
                    <img src={mediaUrl(img, 800)} data-original={img} onError={onMediaError} alt={name} loading="lazy" decoding="async" />
                    <figcaption>
                      <h4>{name}</h4>
                      {c.badge ? <span className="cert-badge">{c.badge}</span> : null}
                      <p className="cert-meta">{pick(c, "meta", lang)}</p>
                      {verifyUrl(c) && <a className="cert-view-btn" href={verifyUrl(c)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>{lang === "uz" ? "Sertifikat sahifasi" : "View certificate"} ↗</a>}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
            <button className="cert-nav cert-next" type="button" aria-label={lang === "uz" ? "Keyingi" : "Next"} onClick={() => nudge(1)}>›</button>
          </div>
          <div className="cert-dots">
            {slides.map((c, i) => (
              <button
                key={c.__id || i} type="button" aria-label={pick(c, "name", lang)} aria-current={i === active ? "true" : undefined}
                className={i === active ? "active" : ""}
                onClick={() => trackRef.current?.scrollTo({ left: i * step(), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
              />
            ))}
          </div>
        </Reveal>
      </div>
      {viewing && (
        <div className="reader-modal open" role="dialog" aria-modal="true" aria-label={viewing.title} tabIndex={-1} ref={viewerRef} onClick={() => setViewing(null)}>
          <div className="reader-inner glass" ref={readerRef} onClick={(e) => e.stopPropagation()}>
            <div className="reader-bar">
              <span className="reader-title">{viewing.title}</span>
              <span className="reader-actions">
                <button className="btn btn-ghost btn-sm" onClick={toggleFs} title={lang === "uz" ? "To'liq ekran" : "Fullscreen"}>⛶</button>
                <a className="btn btn-ghost btn-sm" href={viewing.src} target="_blank" rel="noopener">↓ {lang === "uz" ? "Yuklab olish" : "Download"}</a>
                <button className="reader-close" aria-label={t("ui.close")} onClick={() => setViewing(null)}>×</button>
              </span>
            </div>
            {viewing.pdf
              ? <iframe src={viewing.src} title={viewing.title} />
              : <div className="cert-img-wrap"><img src={mediaUrl(viewing.src, 1400)} data-original={viewing.src} onError={onMediaError} alt={viewing.title} decoding="async" /></div>}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- Journal preview (latest posts) ---------------- */
function JournalPreview({ data }: { data: SiteData }) {
  const { lang, t } = useLang();
  const posts = blogSort(data.blog).slice(0, 3);
  if (!posts.length) return null;
  const thumb = (p: any, title: string) => {
    const blocks = Array.isArray(p.blocks) ? p.blocks : [];
    const img = blocks.find((b: any) => b.type === "image" && b.url);
    if (img) return <div className="bl-thumb"><img src={mediaUrl(img.url, 800)} data-original={img.url} onError={onMediaError} alt={title} loading="lazy" decoding="async" /></div>;
    const yt = blocks.find((b: any) => b.type === "youtube" && b.url);
    if (yt) return <div className="bl-thumb"><img src={`https://i.ytimg.com/vi/${ytId(yt.url)}/hqdefault.jpg`} alt={title} loading="lazy" decoding="async" /><span className="vid-badge" aria-hidden="true">▶</span></div>;
    if (p.type === "image" && p.media) return <div className="bl-thumb"><img src={mediaUrl(p.media, 800)} data-original={p.media} onError={onMediaError} alt={title} loading="lazy" decoding="async" /></div>;
    if (p.type === "video" && p.media) return <div className="bl-thumb bl-thumb-text" aria-hidden="true"><span>▶</span></div>;
    if (p.type === "youtube" && p.media) return <div className="bl-thumb"><img src={`https://i.ytimg.com/vi/${ytId(p.media)}/hqdefault.jpg`} alt={title} loading="lazy" /><span className="vid-badge" aria-hidden="true">▶</span></div>;
    return <div className="bl-thumb bl-thumb-text" aria-hidden="true"><span>📝</span></div>;
  };
  return (
    <section className="section" id="journal">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">05</span> <span>{t("nav.journal")}</span></span>
          <h2 className="section-title">{t("explore.journalDesc")}</h2>
        </Reveal>
        <Reveal className="bl-grid">
          {posts.map((p, i) => {
            const title = pick(p, "title", lang), body = pick(p, "body", lang);
            const full = pick(p, "full", lang) || body;
            return (
              <Link className="bl-card glass" key={p.__id || i} href={`/blog/${p.__id ?? i}`}>
                {p.pinned && <span className="pin-badge" aria-hidden="true">📌</span>}
                {thumb(p, title)}
                <div className="bl-body">
                  <div className="blog-meta"><span>{fmtDate(p.date, lang)}</span>{p.location && <span className="b-loc"><span aria-hidden="true">📍</span> {p.location}</span>}<span className="read-time"><span aria-hidden="true">⏱</span> {readingTime(full)} {t("blog.min")}</span></div>
                  <h3>{title}</h3><p>{body}</p><span className="bl-read">{t("blog.read")}</span>
                </div>
              </Link>
            );
          })}
        </Reveal>
        <Link className="btn btn-ghost blog-viewall" href="/blog">{t("blog.viewall")}</Link>
      </div>
    </section>
  );
}

/* ---------------- Gallery preview (latest photos) ---------------- */
function GalleryPreview({ data }: { data: SiteData }) {
  const { lang, t } = useLang();
  const httpOnly = (u?: string) => (u && /^https?:\/\//.test(u) ? u : undefined);
  const photos = pinSort(data.gallery).filter((p) => httpOnly(p.src)).slice(0, 8);
  if (!photos.length) return null;
  const keyOf = (it: any) => (it.album ? "a:" + it.album : it.cat ? "c:" + it.cat : "a:Gallery");
  return (
    <section className="section" id="gallery-preview">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">06</span> <span>{t("nav.gallery")}</span></span>
          <h2 className="section-title">{t("explore.galleryDesc")}</h2>
        </Reveal>
        <Reveal className="gprev-grid">
          {photos.map((p, i) => {
            const v = p.video || isVideo(p.src);
            return (
              <Link key={i} className="gprev-tile" href={`/gallery/${encodeURIComponent(keyOf(p))}`} aria-label={pick(p, "caption", lang) || t("gallery.photo")}>
                {v ? <div className="video-ph"><span className="vid-badge" aria-hidden="true">▶</span></div> : <img src={mediaUrl(p.src, 480)} data-original={p.src} onError={onMediaError} alt={pick(p, "caption", lang)} loading="lazy" decoding="async" />}
              </Link>
            );
          })}
        </Reveal>
        <Link className="btn btn-ghost blog-viewall" href="/gallery">{t("gallery.viewall")}</Link>
      </div>
    </section>
  );
}

/* ---------------- Explore (digests) ---------------- */

function Explore({ data }: { data: SiteData }) {
  const { lang, t } = useLang();
  const httpOnly = (u?: string) => (u && /^https?:\/\//.test(u) ? u : undefined);
  const ec = data.settings.exploreCovers || {}; // admin-set custom covers per card
  const cards = [
    { id: "library", href: "/library", icon: "library", title: t("nav.library"), desc: t("explore.libraryDesc"), meta: `${data.books.length} ${data.books.length === 1 ? t("explore.book") : t("explore.books")}`, cover: httpOnly(ec.library) || httpOnly(data.books.find((b) => httpOnly(b.cover))?.cover) },
    { id: "learning", href: "/learning", icon: "learning", title: t("nav.learning"), desc: t("explore.learnDesc"), meta: `${data.courses.length} ${data.courses.length === 1 ? t("explore.course") : t("explore.courses")}`, cover: httpOnly(ec.learning) },
    { id: "linux", href: "/linux", icon: "lab", title: t("nav.lab"), desc: t("explore.labDesc"), meta: t("explore.interactive"), cover: httpOnly(ec.linux) },
    { id: "tools", href: "/tools", icon: "tools", title: t("nav.tools"), desc: t("explore.toolsDesc"), meta: t("explore.toolsMeta"), cover: httpOnly(ec.tools) },
  ];
  return (
    <section className="section" id="explore">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">08</span> <span>{t("explore.kicker")}</span></span>
          <h2 className="section-title">{t("explore.title")}</h2>
        </Reveal>
        <div className="digest-grid">
          {cards.map((c, i) => {
            const inner = (
              <>
                {c.cover ? <img className="digest-cover" src={mediaUrl(c.cover, 800)} data-original={c.cover} onError={onMediaError} alt="" loading="lazy" decoding="async" /> : <div className="digest-cover ph"><Icon name={c.icon} size={34} /></div>}
                <div className="digest-body">
                  <div className="digest-icon"><Icon name={c.icon} /></div>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                  <span className="digest-meta">{c.meta}</span>
                  <span className="digest-open">{t("explore.open")} →</span>
                </div>
              </>
            );
            return <Reveal className="digest-wrap" key={i}><Link className="digest-card glass" href={c.href}>{inner}</Link></Reveal>;
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Contact ---------------- */
function Contact({ st }: { st: any }) {
  const { lang, t } = useLang();
  const [status, setStatus] = useState<{ kind: "" | "ok" | "err" | "send"; msg: string }>({ kind: "", msg: "" });
  const [voice, setVoice] = useState<Blob | null>(null);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const fd = new FormData(f);
    const msg = String(fd.get("message") || "").trim();
    if (!msg && !voice) { setStatus({ kind: "err", msg: t("contact.empty") }); f.querySelector<HTMLTextAreaElement>("[name=message]")?.focus(); return; }
    // form is noValidate: surface missing/invalid fields in the status line (the native bubble is transient)
    const missing = [!String(fd.get("name") || "").trim() && t("contact.name"), !/^\S+@\S+\.\S+$/.test(String(fd.get("email") || "").trim()) && t("contact.email")].filter(Boolean) as string[];
    if (missing.length) {
      setStatus({ kind: "err", msg: (lang === "uz" ? "Iltimos, to'ldiring: " : "Please fill in: ") + missing.join(", ") });
      f.querySelector<HTMLInputElement>(missing[0] === t("contact.name") ? "[name=name]" : "[name=email]")?.focus();
      return;
    }
    setStatus({ kind: "send", msg: t("contact.sending") });
    try {
      let voiceFail = false;
      const up = new FormData();
      up.set("name", String(fd.get("name") || ""));
      up.set("email", String(fd.get("email") || ""));
      up.set("message", msg);
      if (voice) up.set("audio", voice);
      const res = await fetch("/api/contact", { method: "POST", body: up }).then((r) => r.json()).catch(() => ({ ok: false }));
      if (!res.ok) throw new Error("send failed");
      if (voice && !res.voice) voiceFail = true;
      // fire-and-forget email notification (no-op unless RESEND env is set)
      fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: up.get("name"), email: up.get("email"), message: msg }) }).catch(() => {});
      setStatus({ kind: "ok", msg: t("contact.sent") + (voiceFail ? (lang === "uz" ? " (Ovozli xabar yuklanmadi — yozib yuboring.)" : " (Voice note failed to upload — please type it.)") : "") }); f.reset(); setVoice(null);
    } catch {
      setStatus({ kind: "err", msg: t("contact.error") });
    }
  };
  const mail = st.socialEmail, li = st.socialLinkedin;
  const loc = pick(st, "contactLocation", lang) || "Tashkent, Uzbekistan";
  const rel = pick(st, "contactRelocate", lang) || (lang === "uz" ? "Yevropaga ishga joylashishga ochiq (Yevropa)" : "Open to relocation (Europe)");
  return (
    <section className="section" id="contact">
      <div className="container">
        <Reveal className="contact-box glass">
          <span className="section-kicker center"><span className="kicker-num">09</span> <span>{t("contact.kicker")}</span></span>
          <h2 className="section-title center">{pick(st, "contactTitle", lang) || t("contact.title")}</h2>
          <p className="contact-desc">{pick(st, "contactDesc", lang)}</p>
          <form className="contact-form" onSubmit={onSubmit} noValidate>
            <div className="cf-row">
              <input type="text" name="name" required placeholder={t("contact.name")} />
              <input type="email" name="email" required placeholder={t("contact.email")} />
            </div>
            <textarea name="message" rows={4} placeholder={t("contact.message")} />
            <VoiceRecorder label={t("contact.voice")} onChange={setVoice} />
            <button type="submit" className="btn btn-primary" disabled={status.kind === "send"}>{status.kind === "send" ? t("contact.sending") : t("contact.send")}</button>
            <p className={"cf-status " + status.kind}>{status.msg}</p>
          </form>
          <div className="contact-actions">
            {mail && <a href={"mailto:" + mail} className="btn btn-ghost">✉️ {mail}</a>}
            {li && <a href={li} target="_blank" rel="noopener" className="btn btn-ghost">in · {li.replace(/^https?:\/\//, "")}</a>}
          </div>
          <div className="contact-meta">
            <span>📍 {loc}</span>
            {st.contactWebsite && <span>🌐 {st.contactWebsite}</span>}
            <span>🛬 {rel}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
