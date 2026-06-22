"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useLang } from "./Providers";
import { isVideo } from "@/lib/data";
import { pick } from "@/lib/i18n";
import type { Photo } from "@/lib/types";

export default function AlbumView({ name, photos }: { name: string; photos: Photo[] }) {
  const { lang, t } = useLang();
  const [lb, setLb] = useState(-1);

  const close = useCallback(() => setLb(-1), []);
  const step = useCallback((d: number) => setLb((i) => { const n = i + d; return n < 0 ? photos.length - 1 : n >= photos.length ? 0 : n; }), [photos.length]);

  useEffect(() => {
    document.body.style.overflow = lb >= 0 ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => { if (lb < 0) return; if (e.key === "Escape") close(); if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [lb, close, step]);

  if (!photos.length) return (
    <article className="post-page container">
      <Link className="post-back" href="/gallery">{t("gallery.back")}</Link>
      <p className="empty-note">{t("gallery.empty")}</p>
    </article>
  );

  const cur = lb >= 0 ? photos[lb] : null;
  const curCap = cur ? pick(cur, "caption", lang) : "";
  const curVid = cur ? (cur.video || isVideo(cur.src)) : false;

  return (
    <article className="post-page container">
      <Link className="post-back" href="/gallery">{t("gallery.back")}</Link>
      <h1 className="post-title album-title">{name}</h1>
      <div className="album-photos">
        {photos.map((g, i) => {
          const cap = pick(g, "caption", lang);
          const vid = g.video || isVideo(g.src);
          return (
            <figure className="album-tile" key={i} onClick={() => setLb(i)}>
              {vid ? <><video src={g.src} muted playsInline preload="metadata" /><span className="vid-badge">▶</span></> : <img src={g.src} alt={cap} loading="lazy" />}
              {cap && <figcaption>{cap}</figcaption>}
            </figure>
          );
        })}
      </div>

      {cur && (
        <div className="lightbox open" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <button className="lightbox-close" aria-label="Close" onClick={close}>×</button>
          {curVid ? <video src={cur.src} controls playsInline autoPlay style={{ display: "block" }} /> : <img src={cur.src} alt={curCap} style={{ display: "block" }} />}
          <div className="lightbox-cap">{curCap} <span className="lb-count">{lb + 1} / {photos.length}</span></div>
        </div>
      )}
    </article>
  );
}
