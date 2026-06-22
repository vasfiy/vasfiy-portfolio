"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "./Providers";
import Reveal from "./Reveal";
import Counter from "./Counter";
import { pick } from "@/lib/i18n";
import { pinSort, groupAlbums, blogSort } from "@/lib/data";
import { supabase } from "@/lib/data";
import type { SiteData, Lang } from "@/lib/types";

const Hero3D = dynamic(() => import("./Hero3D"), { ssr: false });

export default function Home({ data }: { data: SiteData }) {
  const st = data.settings.siteText || {};
  return (
    <>
      <Hero data={data} st={st} />
      <About data={data} st={st} />
      <Skills data={data} />
      <Experience data={data} />
      <Projects data={data} />
      <Education data={data} />
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
  const cv = data.settings.cvUrl;
  const soc = st;

  return (
    <section className="hero" id="hero">
      <div className="hero-canvas"><Hero3D /></div>
      <div className="container hero-inner">
        <div className="hero-badge"><span className="dot" /> <span>{badge}</span></div>
        <h1 className="hero-title">
          <span className="hero-hi">Hi, I&apos;m</span>
          <span className="gradient-text">Kamoliddin Tilonboyev</span>
        </h1>
        <p className="hero-role-line"><span className="hero-role-prefix">I&apos;m a</span> <span className="hero-role gradient-text">{typed}</span><span className="caret">|</span></p>
        <p className="hero-desc">{desc}</p>
        <div className="hero-cta">
          <a href="#contact" className="btn btn-primary">{t("hero.cta")}</a>
          {cv && <a href={cv} download className="btn btn-ghost">↓ {t("hero.cv")}</a>}
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
          <h2 className="section-title">{pick(st, "aboutTitle", lang) || "Defending systems, one alert at a time"}</h2>
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
              return v ? <p key={k} dangerouslySetInnerHTML={{ __html: v }} /> : null;
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
  const projects = pinSort(data.projects);
  return (
    <section className="section" id="projects">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">04</span> <span>{t("proj.kicker")}</span></span>
          <h2 className="section-title">{t("proj.title")}</h2>
        </Reveal>
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
          <Reveal className="edu-col">
            <h3 className="edu-col-title">{t("edu.certTitle")}</h3>
            <div className="cert-list">
              {certs.map((c, i) => (
                <div className="cert-card glass" key={i}>
                  <div className="cert-badge">{c.badge}</div>
                  <div className="cert-info"><h4>{pick(c, "name", lang)}</h4><p className="cert-meta">{pick(c, "meta", lang)}</p></div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Explore (digests) ---------------- */
function Explore({ data }: { data: SiteData }) {
  const { lang, t } = useLang();
  const albums = groupAlbums(data.gallery);
  const posts = blogSort(data.blog);
  const httpOnly = (u?: string) => (u && /^https?:\/\//.test(u) ? u : undefined);
  const cards = [
    { href: "/gallery", icon: "🖼️", title: t("nav.gallery"), desc: t("explore.galleryDesc"), meta: `${albums.length} ${albums.length === 1 ? "album" : "albums"} · ${data.gallery.length} ${t("gallery.photos")}`, cover: httpOnly(albums.map((a) => a.photos.find((p) => httpOnly(p.src)))[0]?.src) },
    { href: "/blog", icon: "📝", title: t("nav.journal"), desc: t("explore.journalDesc"), meta: `${posts.length} ${posts.length === 1 ? "post" : "posts"}`, cover: httpOnly(posts.find((p) => p.type === "image" && httpOnly(p.media))?.media) },
    { href: "/library", icon: "📚", title: t("nav.library"), desc: t("explore.libraryDesc"), meta: `${data.books.length} ${data.books.length === 1 ? "book" : "books"}`, cover: httpOnly(data.books.find((b) => httpOnly(b.cover))?.cover) },
    { href: "/linux", icon: "🐧", title: t("nav.lab"), desc: t("explore.labDesc"), meta: "Interactive", cover: undefined as string | undefined },
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
                {c.cover ? <img className="digest-cover" src={c.cover} alt="" loading="lazy" /> : <div className="digest-cover ph">{c.icon}</div>}
                <div className="digest-body">
                  <div className="digest-icon">{c.icon}</div>
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
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const fd = new FormData(f);
    const payload = { name: String(fd.get("name") || ""), email: String(fd.get("email") || ""), message: String(fd.get("message") || "") };
    setStatus({ kind: "send", msg: t("contact.sending") });
    try {
      const { error } = await supabase.from("messages").insert(payload);
      if (error) throw error;
      setStatus({ kind: "ok", msg: t("contact.sent") }); f.reset();
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
            <textarea name="message" rows={4} required placeholder={t("contact.message")} />
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
