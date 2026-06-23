"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "./Providers";
import { groupAlbums, getSiteData } from "@/lib/data";
import { pick } from "@/lib/i18n";
import type { SiteData, Lang } from "@/lib/types";

interface Hit { kind: string; icon: string; title: string; sub: string; href: string; text: string; }

function buildIndex(data: SiteData, lang: Lang): Hit[] {
  const hits: Hit[] = [];
  data.blog.forEach((p) => hits.push({ kind: "Journal", icon: "📝", title: pick(p, "title", lang), sub: p.date || "", href: `/blog/${p.__id}`, text: [pick(p, "title", lang), pick(p, "body", lang), pick(p, "full", lang)].join(" ") }));
  groupAlbums(data.gallery).forEach((a) => { const nm = a.album || (a.cat ? (data.galleryCats[a.cat]?.[lang] || data.galleryCats[a.cat]?.en || a.cat) : "Gallery"); hits.push({ kind: "Gallery", icon: "🖼️", title: nm, sub: `${a.photos.length} photos`, href: `/gallery/${encodeURIComponent(a.key)}`, text: nm + " " + a.photos.map((p) => pick(p, "caption", lang)).join(" ") }); });
  data.books.forEach((b) => hits.push({ kind: "Library", icon: "📚", title: pick(b, "title", lang), sub: b.author || "", href: "/library", text: [pick(b, "title", lang), b.author, pick(b, "desc", lang)].join(" ") }));
  data.projects.forEach((p) => hits.push({ kind: "Project", icon: "🚀", title: pick(p, "title", lang), sub: p.period || "", href: "/#projects", text: [pick(p, "title", lang), pick(p, "desc", lang), (p.tags || []).join(" ")].join(" ") }));
  data.skills.forEach((s) => hits.push({ kind: "Skill", icon: "🧠", title: pick(s, "name", lang), sub: (s.tags || []).join(", "), href: "/#skills", text: pick(s, "name", lang) + " " + (s.tags || []).join(" ") }));
  data.experience.forEach((j) => hits.push({ kind: "Experience", icon: "💼", title: pick(j, "role", lang), sub: j.company || "", href: "/#experience", text: [pick(j, "role", lang), j.company, ((lang === "uz" ? j.bulletsUz : j.bullets) || []).join(" ")].join(" ") }));
  return hits;
}

export default function Search() {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [data, setData] = useState<SiteData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const index = useMemo(() => (data ? buildIndex(data, lang) : []), [data, lang]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (open) { if (!data) getSiteData().then(setData).catch(() => {}); setTimeout(() => inputRef.current?.focus(), 50); } else setQ(""); }, [open, data]);

  const results = q.trim().length < 2 ? [] : index.filter((h) => h.text.toLowerCase().includes(q.toLowerCase())).slice(0, 12);

  return (
    <>
      <button className="search-fab" aria-label={t("search.label")} onClick={() => setOpen(true)} title={t("search.label")}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      </button>
      {open && (
        <div className="search-overlay" onClick={() => setOpen(false)}>
          <div className="search-box glass" onClick={(e) => e.stopPropagation()}>
            <div className="search-inp">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search.placeholder")} />
              <kbd>Esc</kbd>
            </div>
            <div className="search-results">
              {q.trim().length >= 2 && results.length === 0 && <p className="search-empty">{t("search.none")}</p>}
              {results.map((h, i) => (
                <Link key={i} href={h.href} className="search-hit" onClick={() => setOpen(false)}>
                  <span className="search-hit-ic">{h.icon}</span>
                  <span className="search-hit-main"><b>{h.title || "—"}</b>{h.sub && <span>{h.sub}</span>}</span>
                  <span className="search-hit-kind">{h.kind}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
