"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./Providers";
import Reveal from "./Reveal";
import Counter from "./Counter";
import { pick } from "@/lib/i18n";
import { pinSort, groupAlbums, blogSort, fmtDate, ytId, isVideo, readingTime, uploadVoice } from "@/lib/data";
import { supabase } from "@/lib/data";
import VoiceRecorder from "./VoiceRecorder";
import Icon from "./Icon";
import type { SiteData, Lang } from "@/lib/types";

const Hero3D = dynamic(() => import("./Hero3D"), { ssr: false });

/* Load the ~0.8 MB Three.js hero only when it's worth it: skip on mobile and for
   reduced-motion users, and defer to browser idle so it never blocks first paint. */
function Hero3DLazy() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.innerWidth < 768) return;
    const w = window as any;
    const id = w.requestIdleCallback ? w.requestIdleCallback(() => setShow(true), { timeout: 2500 }) : window.setTimeout(() => setShow(true), 1400);
    return () => { if (w.cancelIdleCallback) w.cancelIdleCallback(id); else clearTimeout(id); };
  }, []);
  return show ? <Hero3D /> : null;
}

export default function Home({ data }: { data: SiteData }) {
  const st = data.settings.siteText || {};
  return (
    <>
      <Hero data={data} st={st} />
      <About data={data} st={st} />
      <Skills data={data} />
      <Experience data={data} />
      <Projects data={data} />
      <JournalPreview data={data} />
      <GalleryPreview data={data} />
      <Education data={data} />
      <MarketPreview data={data} />
      <Explore data={data} />
      <Contact st={st} />
    </>
  );
}

/* ---------------- Hero ---------------- */
function Hero({ data, st }: { data: SiteData; st: any }) {
  const { lang, t } = useLang();
  const roles: string[] = (lang === "uz" ? st.heroRolesUz : st.heroRoles) || st.heroRoles || ["SOC Analyst", "Blue-Team Defender", "Threat Hunter"];
  const [typed, setTyped] = useState("");
  const [ri, setRi] = useState(0);

  useEffect(() => {
    const word = roles[ri % roles.length] || "";
    let i = 0, del = false, to: any;
    const run = () => {
      if (!del) { setTyped(word.slice(0, i + 1)); i++; if (i === word.length) { del = true; to = setTimeout(run, 1600); return; } }
      else { setTyped(word.slice(0, i - 1)); i--; if (i === 0) { del = false; setRi((x) => x + 1); return; } }
      to = setTimeout(run, del ? 45 : 80);
    };
    to = setTimeout(run, 250);
    return () => clearTimeout(to);
  }, [ri]); // eslint-disable-line

  const badge = pick(st, "heroBadge", lang) || "Open to relocation · Europe";
  const desc = pick(st, "heroDesc", lang) || "Aspiring SOC Analyst with hands-on experience in blue-team operations, threat monitoring, and network analysis.";
  const soc = st;

  return (
    <section className="hero" id="hero">
      <div className="hero-canvas"><Hero3DLazy /></div>
      <div className="container hero-inner">
        <div className="hero-badge"><span className="dot" /> <span data-edit="heroBadge">{badge}</span></div>
        <h1 className="hero-title">
          <span className="hero-hi">Hi, I&apos;m</span>
          <span className="gradient-text">Kamoliddin Tilonboyev</span>
        </h1>
        <p className="hero-role-line"><span className="hero-role-prefix">I&apos;m a</span> <span className="hero-role gradient-text">{typed}</span><span className="caret">|</span></p>
        <p className="hero-desc" data-edit="heroDesc">{desc}</p>
        <div className="hero-cta">
          <a href="#contact" className="btn btn-primary">{t("hero.cta")}</a>
          <Link href="/cv" className="btn btn-ghost">📄 {t("hero.cv")}</Link>
          <a href="#projects" className="btn btn-ghost">{t("hero.work")}</a>
        </div>
        <div className="hero-socials">
          {soc.socialLinkedin && <a href={soc.socialLinkedin} target="_blank" rel="noopener" aria-label="LinkedIn" className="social-link"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21H9z" /></svg></a>}
          {soc.socialWebsite && <a href={soc.socialWebsite} target="_blank" rel="noopener" aria-label="Website" className="social-link"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></svg></a>}
          {soc.socialEmail && <a href={"mailto:" + soc.socialEmail} aria-label="Email" className="social-link"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></a>}
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
              {photo ? <img src={photo} alt="Kamoliddin Tilonboyev" /> : <span className="photo-fallback">KT</span>}
            </div>
          </Reveal>
          <Reveal className="about-text glass">
            {["aboutP1", "aboutP2", "aboutP3"].map((k) => {
              const v = pick(st, k, lang);
              return v ? <p key={k} data-edit={k} dangerouslySetInnerHTML={{ __html: v }} /> : null;
            })}
          </Reveal>
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
  return (
    <section className="section" id="skills">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">02</span> <span>{t("skills.kicker")}</span></span>
          <h2 className="section-title">{t("skills.title")}</h2>
        </Reveal>
        <div className="skills-grid">
          {skills.map((s, i) => (
            <Reveal className="skill-card glass" key={i}>
              <div className="skill-icon">{s.icon || "🛠"}</div>
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
  return (
    <section className="section" id="experience">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">03</span> <span>{t("exp.kicker")}</span></span>
          <h2 className="section-title">{t("exp.title")}</h2>
        </Reveal>
        <div className="timeline">
          {jobs.map((j, i) => {
            const bullets = (lang === "uz" ? j.bulletsUz : j.bullets) || j.bullets || [];
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
  const cats = data.cats?.project || {};
  const present = Array.from(new Set(all.map((p) => p.cat).filter(Boolean))) as string[];
  const catLabel = (c: string) => { const m = cats[c]; return m ? (m.icon ? m.icon + " " : "") + (m[lang] || m.en || c) : c; };
  const projects = filter === "all" ? all : all.filter((p) => p.cat === filter);
  return (
    <section className="section" id="projects">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">04</span> <span>{t("proj.kicker")}</span></span>
          <h2 className="section-title">{t("proj.title")}</h2>
        </Reveal>
        {present.length > 0 && (
          <div className="filter-bar" style={{ marginBottom: 24 }}>
            <button className={"filter-chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>{lang === "uz" ? "Hammasi" : "All"}</button>
            {present.map((c) => <button key={c} className={"filter-chip" + (filter === c ? " active" : "")} onClick={() => setFilter(c)}>{catLabel(c)}</button>)}
          </div>
        )}
        <div className="projects-grid">
          {projects.map((p, i) => (
            <Reveal className="project-card glass" key={i}>
              <div className="project-head"><div className="project-icon">{p.icon || "🔧"}</div><span className="project-period">{p.period}</span></div>
              <h3>{pick(p, "title", lang)}</h3>
              {pick(p, "sub", lang) && <p className="project-sub">{pick(p, "sub", lang)}</p>}
              <p className="project-desc">{pick(p, "desc", lang)}</p>
              <div className="tags">{(p.tags || []).map((tg, j) => <span key={j}>{tg}</span>)}</div>
              {p.linkUrl && <div className="project-links"><a href={p.linkUrl} target="_blank" rel="noopener">{pick(p, "linkLabel", lang) || "Visit ↗"}</a></div>}
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
  const [active, setActive] = useState(0);
  const toggleFs = () => { const el = readerRef.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else el.requestFullscreen?.().catch(() => {}); };

  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.fullscreenElement) setViewing(null); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [viewing]);

  // A site-hosted (/certs/…) or uploaded (Supabase) file is shown in-site; the verify URL goes to TryHackMe.
  const fileSrc = (c: any) => { const f = String(c.file || "").trim(); return /^(https?:\/\/|\/)/.test(f) ? f : ""; };
  const verifyUrl = (c: any) => { const u = String(c.url || "").trim(); return /^https?:\/\//.test(u) ? u : ""; };
  const isImg = (s: string) => /\.(png|jpe?g|gif|webp|svg|avif)($|\?)/i.test(s);
  // `img` is shared with the static site, where it is stored relative ("assets/certs/x.jpg").
  // Routes here are nested, so a relative value would resolve against the route — force root-relative.
  const imgSrc = (c: any) => { const s = String(c.img || "").trim(); if (!s) return ""; return /^https?:\/\//.test(s) || s.startsWith("/") ? s : "/" + s.replace(/^\.?\//, ""); };
  const slides = certs.filter((c) => imgSrc(c));
  const step = () => { const t = trackRef.current; const s = t?.querySelector<HTMLElement>(".cert-slide"); return s ? s.getBoundingClientRect().width + 22 : t?.clientWidth || 0; };
  const nudge = (dir: number) => trackRef.current?.scrollBy({ left: dir * step(), behavior: "smooth" });
  const onTrackScroll = () => { const t = trackRef.current; if (!t) return; const w = step(); if (w) setActive(Math.min(Math.round(t.scrollLeft / w), slides.length - 1)); };

  return (
    <section className="section" id="education">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">05</span> <span>{t("edu.kicker")}</span></span>
          <h2 className="section-title">{t("edu.title")}</h2>
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
                    className="cert-slide glass" key={c.__id || i}
                    onClick={open} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
                  >
                    <img src={img} alt={name} loading="lazy" />
                    <figcaption>
                      <h4>{name}</h4>
                      <p className="cert-meta">{pick(c, "meta", lang)}</p>
                      {verifyUrl(c) && <a className="cert-view-btn" href={verifyUrl(c)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>{lang === "uz" ? "Sertifikat sahifasi" : "View certificate"} ↗</a>}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
            <button className="cert-nav cert-next" type="button" aria-label={lang === "uz" ? "Keyingi" : "Next"} onClick={() => nudge(1)}>›</button>
          </div>
          <div className="cert-dots" role="tablist" aria-label={t("edu.certTitle")}>
            {slides.map((c, i) => (
              <button
                key={c.__id || i} type="button" role="tab" aria-label={`${i + 1}`}
                className={i === active ? "active" : ""}
                onClick={() => trackRef.current?.scrollTo({ left: i * step(), behavior: "smooth" })}
              />
            ))}
          </div>
        </Reveal>
      </div>
      {viewing && (
        <div className="reader-modal open" role="dialog" aria-modal onClick={() => setViewing(null)}>
          <div className="reader-inner glass" ref={readerRef} onClick={(e) => e.stopPropagation()}>
            <div className="reader-bar">
              <span className="reader-title">{viewing.title}</span>
              <span className="reader-actions">
                <button className="btn btn-ghost btn-sm" onClick={toggleFs} title={lang === "uz" ? "To'liq ekran" : "Fullscreen"}>⛶</button>
                <a className="btn btn-ghost btn-sm" href={viewing.src} target="_blank" rel="noopener">↓ {lang === "uz" ? "Yuklab olish" : "Download"}</a>
                <button className="reader-close" aria-label="Close" onClick={() => setViewing(null)}>×</button>
              </span>
            </div>
            {viewing.pdf
              ? <iframe src={viewing.src} title={viewing.title} />
              : <div className="cert-img-wrap"><img src={viewing.src} alt={viewing.title} /></div>}
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
    if (img) return <div className="bl-thumb"><img src={img.url} alt={title} loading="lazy" /></div>;
    const yt = blocks.find((b: any) => b.type === "youtube" && b.url);
    if (yt) return <div className="bl-thumb"><img src={`https://i.ytimg.com/vi/${ytId(yt.url)}/hqdefault.jpg`} alt={title} loading="lazy" /><span className="vid-badge">▶</span></div>;
    if (p.type === "image" && p.media) return <div className="bl-thumb"><img src={p.media} alt={title} loading="lazy" /></div>;
    if (p.type === "video" && p.media) return <div className="bl-thumb"><video src={p.media} muted preload="metadata" /><span className="vid-badge">▶</span></div>;
    if (p.type === "youtube" && p.media) return <div className="bl-thumb"><img src={`https://i.ytimg.com/vi/${ytId(p.media)}/hqdefault.jpg`} alt={title} loading="lazy" /><span className="vid-badge">▶</span></div>;
    return <div className="bl-thumb bl-thumb-text"><span>📝</span></div>;
  };
  return (
    <section className="section" id="journal">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">07</span> <span>{t("nav.journal")}</span></span>
          <h2 className="section-title">{t("explore.journalDesc")}</h2>
        </Reveal>
        <Reveal className="bl-grid">
          {posts.map((p, i) => {
            const title = pick(p, "title", lang), body = pick(p, "body", lang);
            const full = pick(p, "full", lang) || body;
            return (
              <Link className="bl-card glass" key={p.__id || i} href={`/blog/${p.__id ?? i}`}>
                {p.pinned && <span className="pin-badge">📌</span>}
                {thumb(p, title)}
                <div className="bl-body">
                  <div className="blog-meta"><span>{fmtDate(p.date, lang)}</span>{p.location && <span className="b-loc">📍 {p.location}</span>}<span className="read-time">⏱ {readingTime(full)} {t("blog.min")}</span></div>
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
          <span className="section-kicker"><span className="kicker-num">08</span> <span>{t("nav.gallery")}</span></span>
          <h2 className="section-title">{t("explore.galleryDesc")}</h2>
        </Reveal>
        <Reveal className="gprev-grid">
          {photos.map((p, i) => {
            const v = p.video || isVideo(p.src);
            return (
              <Link key={i} className="gprev-tile" href={`/gallery/${encodeURIComponent(keyOf(p))}`} aria-label={pick(p, "caption", lang) || "photo"}>
                {v ? <><video src={p.src} muted preload="metadata" /><span className="vid-badge">▶</span></> : <img src={p.src!} alt={pick(p, "caption", lang)} loading="lazy" />}
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
/* ---------------- Market preview (latest products; hidden until any exist) ---------------- */
function MarketPreview({ data }: { data: SiteData }) {
  const { lang, t } = useLang();
  const items = pinSort(data.products).slice(0, 4);
  if (!items.length) return null;
  const fmtP = (p = "", cur = "") => { const n = Number(String(p).replace(/[^\d.]/g, "")); return n ? `${n.toLocaleString("en-US").replace(/,/g, " ")} ${cur}`.trim() : (p ? `${p} ${cur}` : ""); };
  return (
    <section className="section" id="market">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">07</span> <span>{t("market.title")}</span></span>
          <h2 className="section-title">{t("market.sub")}</h2>
        </Reveal>
        <div className="mkt-grid mkt-preview-grid">
          {items.map((p, i) => {
            const img = (p.images || [])[0]?.url;
            return (
              <Reveal key={p.__id || i} className="digest-wrap">
                <a className="mkt-card glass" href={`https://market.vasfiy.com/${p.__id}`}>
                  <div className="mkt-card-img">{img ? <img src={img} alt={pick(p, "title", lang)} loading="lazy" /> : <span className="mkt-ph">📦</span>}
                    {p.origin && <span className="mkt-origin">{p.origin}</span>}
                  </div>
                  <div className="mkt-card-body">
                    <h3>{pick(p, "title", lang)}</h3>
                    <div className="mkt-card-meta"><span className="mkt-price">{fmtP(p.price, p.currency)}</span></div>
                  </div>
                </a>
              </Reveal>
            );
          })}
        </div>
        <div className="mkt-preview-more"><a className="btn btn-ghost" href="https://market.vasfiy.com">{t("market.viewall")}</a></div>
      </div>
    </section>
  );
}

function Explore({ data }: { data: SiteData }) {
  const { lang, t } = useLang();
  const albums = groupAlbums(data.gallery);
  const posts = blogSort(data.blog);
  const httpOnly = (u?: string) => (u && /^https?:\/\//.test(u) ? u : undefined);
  const ec = data.settings.exploreCovers || {}; // admin-set custom covers per card
  void albums; void posts;
  const cards = [
    { id: "market", href: "https://market.vasfiy.com", icon: "market", title: t("market.title"), desc: t("explore.marketDesc"), meta: "EN · UZ · RU · DE", cover: httpOnly(ec.market) || httpOnly((data.products.find((p) => (p.images || [])[0]?.url)?.images || [])[0]?.url), raw: true },
    { id: "library", href: "/library", icon: "library", title: t("nav.library"), desc: t("explore.libraryDesc"), meta: `${data.books.length} ${data.books.length === 1 ? "book" : "books"}`, cover: httpOnly(ec.library) || httpOnly(data.books.find((b) => httpOnly(b.cover))?.cover) },
    { id: "learning", href: "/learning", icon: "learning", title: t("nav.learning"), desc: t("explore.learnDesc"), meta: `${data.courses.length} ${data.courses.length === 1 ? "course" : "courses"}`, cover: httpOnly(ec.learning) },
    { id: "linux", href: "/linux", icon: "lab", title: t("nav.lab"), desc: t("explore.labDesc"), meta: "Interactive", cover: httpOnly(ec.linux) },
    { id: "tools", href: "/tools", icon: "tools", title: t("nav.tools"), desc: t("explore.toolsDesc"), meta: "QR · Password · Base64", cover: httpOnly(ec.tools) },
  ];
  return (
    <section className="section" id="explore">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">06</span> <span>{t("explore.kicker")}</span></span>
          <h2 className="section-title">{t("explore.title")}</h2>
        </Reveal>
        <div className="digest-grid">
          {cards.map((c, i) => {
            const inner = (
              <>
                {c.cover ? <img className="digest-cover" src={c.cover} alt="" loading="lazy" /> : <div className="digest-cover ph"><Icon name={c.icon} size={34} /></div>}
                <div className="digest-body">
                  <div className="digest-icon"><Icon name={c.icon} /></div>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                  <span className="digest-meta">{c.meta}</span>
                  <span className="digest-open">{t("explore.open")} →</span>
                </div>
              </>
            );
            return (c as any).raw
              ? <Reveal className="digest-wrap" key={i}><a className="digest-card glass" href={c.href}>{inner}</a></Reveal>
              : <Reveal className="digest-wrap" key={i}><Link className="digest-card glass" href={c.href}>{inner}</Link></Reveal>;
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
    if (!msg && !voice) { setStatus({ kind: "err", msg: t("contact.empty") }); return; }
    setStatus({ kind: "send", msg: t("contact.sending") });
    try {
      let audio: string | null = null;
      if (voice) { try { audio = await uploadVoice(voice); } catch {} }
      const payload: any = { name: String(fd.get("name") || ""), email: String(fd.get("email") || ""), message: msg, audio };
      const { error } = await supabase.from("messages").insert(payload);
      if (error) throw error;
      // fire-and-forget email notification (no-op unless RESEND env is set)
      fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
      setStatus({ kind: "ok", msg: t("contact.sent") }); f.reset(); setVoice(null);
    } catch {
      setStatus({ kind: "err", msg: t("contact.error") });
    }
  };
  const mail = st.socialEmail, li = st.socialLinkedin;
  const loc = pick(st, "contactLocation", lang) || "Tashkent, Uzbekistan";
  const rel = pick(st, "contactRelocate", lang) || "Open to relocation (Europe)";
  return (
    <section className="section" id="contact">
      <div className="container">
        <Reveal className="contact-box glass">
          <span className="section-kicker center"><span className="kicker-num">07</span> <span>{t("contact.kicker")}</span></span>
          <h2 className="section-title center">{pick(st, "contactTitle", lang) || t("contact.title")}</h2>
          <p className="contact-desc">{pick(st, "contactDesc", lang)}</p>
          <form className="contact-form" onSubmit={onSubmit}>
            <div className="cf-row">
              <input type="text" name="name" required placeholder={t("contact.name")} />
              <input type="email" name="email" required placeholder={t("contact.email")} />
            </div>
            <textarea name="message" rows={4} placeholder={t("contact.message")} />
            <VoiceRecorder label={t("contact.voice")} onChange={setVoice} />
            <button type="submit" className="btn btn-primary" disabled={status.kind === "send"}>{t("contact.send")}</button>
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
