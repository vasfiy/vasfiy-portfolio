"use client";
import Link from "next/link";
import { useState } from "react";
import { useLang } from "./Providers";
import Reveal from "./Reveal";
import { pinSort, groupAlbums } from "@/lib/data";
import PhotoGrid from "./PhotoGrid";
import type { Photo, Category, Album } from "@/lib/types";

export default function GalleryGrid({ photos, cats }: { photos: Photo[]; cats: Record<string, Category> }) {
  const { lang, t } = useLang();
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"albums" | "all">("albums");
  const present = Array.from(new Set(photos.map((p) => p.cat).filter(Boolean))) as string[];

  const albumName = (a: Album) => {
    if (a.album) return lang === "uz" ? (a.albumUz || a.album) : a.album;
    if (a.cat) return (cats[a.cat] && (cats[a.cat][lang] || cats[a.cat].en)) || a.cat;
    return t("nav.gallery");
  };

  const items = filter === "all" ? photos : photos.filter((p) => p.cat === filter);
  const albums = groupAlbums(pinSort(items));

  return (
    <section className="section page-hero">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">✶</span> <span>{t("gallery.sub")}</span></span>
          <h1 className="section-title">{t("gallery.title")}</h1>
        </Reveal>
        <div className="gallery-controls">
          <div className="seg-toggle">
            <button className={"seg" + (view === "albums" ? " active" : "")} onClick={() => setView("albums")}>{lang === "uz" ? "Albomlar" : "Albums"}</button>
            <button className={"seg" + (view === "all" ? " active" : "")} onClick={() => setView("all")}>{lang === "uz" ? "Barcha rasmlar" : "All photos"}</button>
          </div>
          {present.length > 0 && (
            <div className="filter-bar">
              <button className={"filter-chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>{t("gallery.all")}</button>
              {present.map((c) => <button key={c} className={"filter-chip" + (filter === c ? " active" : "")} onClick={() => setFilter(c)}>{(cats[c] && (cats[c][lang] || cats[c].en)) || c}</button>)}
            </div>
          )}
        </div>
        {items.length === 0 ? <p className="empty-note">{t("gallery.empty")}</p> : view === "all" ? (
          <PhotoGrid photos={pinSort(items)} />
        ) : (
          <div className="album-grid">
            {albums.map((a) => {
              const cover = a.photos.find((x) => x.pinned) || a.photos[0];
              const nm = albumName(a);
              return (
                <Link className="album-card" href={`/gallery/${encodeURIComponent(a.key)}`} key={a.key}>
                  {cover?.src ? <img src={cover.src} alt={nm} loading="lazy" /> : <div className="ph">🖼️</div>}
                  <div className="album-overlay"><h3>{nm}</h3><span className="album-count">{a.photos.length} {a.photos.length === 1 ? t("gallery.photo") : t("gallery.photos")}</span></div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
