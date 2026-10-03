"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "./Providers";
import { groupAlbums } from "@/lib/format";
import { pick, tr } from "@/lib/i18n";
import type { SiteData, Lang } from "@/lib/types";

interface Hit { kind: string; icon: string; title: string; sub: string; href: string; text: string; }

function buildIndex(data: SiteData, lang: Lang): Hit[] {
  const hits: Hit[] = [];
  data.blog.forEach((p) => hits.push({ kind: tr(lang, "search.kindJournal"), icon: "📝", title: pick(p, "title", lang), sub: p.date || "", href: `/blog/${p.__id}`, text: [pick(p, "title", lang), pick(p, "body", lang), pick(p, "full", lang)].join(" ") }));
  groupAlbums(data.gallery).forEach((a) => { const nm = a.album ? (lang === "uz" ? a.albumUz || a.album : a.album) : a.cat ? (data.galleryCats[a.cat]?.[lang] || data.galleryCats[a.cat]?.en || a.cat) : tr(lang, "nav.gallery"); hits.push({ kind: tr(lang, "search.kindGallery"), icon: "🖼️", title: nm, sub: `${a.photos.length} ${tr(lang, a.photos.length === 1 ? "gallery.photo" : "gallery.photos")}`, href: `/gallery/${encodeURIComponent(a.key)}`, text: nm + " " + a.photos.map((p) => pick(p, "caption", lang)).join(" ") }); });
  data.books.forEach((b) => hits.push({ kind: tr(lang, "search.kindLibrary"), icon: "📚", title: pick(b, "title", lang), sub: b.author || "", href: "/library", text: [pick(b, "title", lang), b.author, pick(b, "desc", lang)].join(" ") }));
  data.projects.forEach((p) => hits.push({ kind: tr(lang, "search.kindProject"), icon: "🚀", title: pick(p, "title", lang), sub: p.period || "", href: "/#projects", text: [pick(p, "title", lang), pick(p, "desc", lang), (p.tags || []).join(" ")].join(" ") }));
  data.skills.forEach((s) => hits.push({ kind: tr(lang, "search.kindSkill"), icon: "🧠", title: pick(s, "name", lang), sub: (s.tags || []).join(", "), href: "/#skills", text: pick(s, "name", lang) + " " + (s.tags || []).join(" ") }));
  data.experience.forEach((j) => hits.push({ kind: tr(lang, "search.kindExperience"), icon: "💼", title: pick(j, "role", lang), sub: j.company || "", href: "/#experience", text: [pick(j, "role", lang), j.company, ((lang === "uz" ? j.bulletsUz : j.bullets) || []).join(" ")].join(" ") }));
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
  useEffect(() => { if (open) { if (!data) fetch("/api/site-data").then((r) => r.json()).then((d) => setData(d as SiteData)).catch(() => {}); setTimeout(() => inputRef.current?.focus(), 50); } else setQ(""); }, [open, data]);

  const results = q.trim().length < 2 ? [] : index.filter((h) => h.text.toLowerCase().includes(q.toLowerCase())).slice(0, 12);

  return (
    <>
      <button className="search-fab" aria-label={t("search.label")} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} title={t("search.label")}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      </button>
      {open && (
        <div className="search-overlay" onClick={() => setOpen(false)}>
          <div className="search-box glass" role="dialog" aria-modal="true" aria-label={t("search.label")} onClick={(e) => e.stopPropagation()}>
            <div className="search-inp">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search.placeholder")} />
              <kbd>Esc</kbd>
            </div>
            <div className="search-results">
              {q.trim().length >= 2 && data && results.length === 0 && <p className="search-empty" role="status">{t("search.none")}</p>}
              {q.trim().length >= 2 && !data && <p className="search-empty" role="status">{lang === "uz" ? "Qidirilmoqda…" : "Searching…"}</p>}
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
