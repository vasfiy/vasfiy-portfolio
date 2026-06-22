"use client";
import { useLang } from "./Providers";
import { pick } from "@/lib/i18n";
import { pinSort } from "@/lib/data";
import type { SiteData } from "@/lib/types";

export default function CV({ data }: { data: SiteData }) {
  const { lang, t } = useLang();
  const st = data.settings.siteText || {};
  const cv = data.settings.cvUrl;
  const T = lang === "uz"
    ? { print: "🖨 Chop etish / PDF", download: "↓ CV (PDF)", summary: "Qisqacha", exp: "Tajriba", skills: "Ko'nikmalar", langs: "Tillar", edu: "Ta'lim", certs: "Sertifikatlar", proj: "Loyihalar" }
    : { print: "🖨 Print / Save PDF", download: "↓ CV (PDF)", summary: "Summary", exp: "Experience", skills: "Skills", langs: "Languages", edu: "Education", certs: "Certifications", proj: "Projects" };

  const jobs = pinSort(data.experience), skills = pinSort(data.skills), langs = pinSort(data.languages);
  const edu = pinSort(data.education), certs = pinSort(data.certs), projects = pinSort(data.projects);
  const summary = [pick(st, "aboutP1", lang), pick(st, "aboutP3", lang)].filter(Boolean).join(" ").replace(/<[^>]+>/g, "");
  const email = st.socialEmail, li = st.socialLinkedin, loc = pick(st, "contactLocation", lang);

  return (
    <section className="section cv-wrap">
      <div className="cv-actions">
        <button className="btn btn-primary" onClick={() => window.print()}>{T.print}</button>
        {cv && <a className="btn btn-ghost" href={cv} download>{T.download}</a>}
      </div>

      <article className="cv-page">
        <header className="cv-head">
          <div>
            <h1 className="cv-name">Kamoliddin Tilonboyev</h1>
            <p className="cv-role">{pick(st, "heroRoles", lang) ? (lang === "uz" ? st.heroRolesUz?.[0] : st.heroRoles?.[0]) || "SOC Analyst" : "SOC Analyst"}</p>
          </div>
          <ul className="cv-contact">
            {email && <li>✉ {email}</li>}
            {li && <li>in {li.replace(/^https?:\/\//, "")}</li>}
            {loc && <li>📍 {loc}</li>}
          </ul>
        </header>

        {summary && <section className="cv-sec"><h2>{T.summary}</h2><p>{summary}</p></section>}

        {jobs.length > 0 && (
          <section className="cv-sec"><h2>{T.exp}</h2>
            {jobs.map((j, i) => {
              const bullets = (lang === "uz" ? j.bulletsUz : j.bullets) || j.bullets || [];
              return (
                <div className="cv-job" key={i}>
                  <div className="cv-job-top"><b>{pick(j, "role", lang)}</b><span>{j.date}</span></div>
                  <p className="cv-job-meta">{j.company} · {pick(j, "meta", lang)}</p>
                  <ul>{bullets.map((b, k) => <li key={k} dangerouslySetInnerHTML={{ __html: b }} />)}</ul>
                </div>
              );
            })}
          </section>
        )}

        {skills.length > 0 && (
          <section className="cv-sec"><h2>{T.skills}</h2>
            <div className="cv-skills">{skills.map((s, i) => <p key={i}><b>{pick(s, "name", lang)}:</b> {(s.tags || []).join(", ")}</p>)}</div>
          </section>
        )}

        {langs.length > 0 && (
          <section className="cv-sec"><h2>{T.langs}</h2>
            <p>{langs.map((l) => pick(l, "label", lang)).join(" · ")}</p>
          </section>
        )}

        <div className="cv-cols">
          {edu.length > 0 && (
            <section className="cv-sec"><h2>{T.edu}</h2>
              {edu.map((e, i) => <div className="cv-edu" key={i}><b>{pick(e, "degree", lang)}</b><span>{pick(e, "school", lang)} · {pick(e, "date", lang)}</span></div>)}
            </section>
          )}
          {certs.length > 0 && (
            <section className="cv-sec"><h2>{T.certs}</h2>
              <ul className="cv-certs">{certs.map((c, i) => <li key={i}>{pick(c, "name", lang)}{pick(c, "meta", lang) ? ` — ${pick(c, "meta", lang)}` : ""}</li>)}</ul>
            </section>
          )}
        </div>

        {projects.length > 0 && (
          <section className="cv-sec"><h2>{T.proj}</h2>
            {projects.map((p, i) => <div className="cv-job" key={i}><div className="cv-job-top"><b>{pick(p, "title", lang)}</b><span>{p.period}</span></div><p>{pick(p, "desc", lang)}</p></div>)}
          </section>
        )}
      </article>
    </section>
  );
}
