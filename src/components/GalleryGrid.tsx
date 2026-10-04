"use client";
import Link from "next/link";
import { useState } from "react";
import { useLang } from "./Providers";
import Reveal from "./Reveal";
import { pinSort, groupAlbums } from "@/lib/format";
import { mediaUrl, onMediaError } from "@/lib/media";
import PhotoGrid from "./PhotoGrid";
import styles from "./gallery.module.css";
import type { Photo, Category, Album } from "@/lib/types";

export default function GalleryGrid({ photos, cats }: { photos: Photo[]; cats: Record<string, Category> }) {
  const { lang, t } = useLang();
  const [filter, setFilter] = useState("all");
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
        {/* Desktop scope (gallery.module.css): contains head, controls
            and grids on one 1400px axis at >=900px. */}
        <div className={styles.gallery}>
          <Reveal className="section-head masthead">
            <span className="section-kicker"><span className="kicker-num">✶</span> <span>{t("gallery.sub")}</span></span>
            <h1 className="section-title">{t("gallery.title")}</h1>
          </Reveal>
          {items.length > 0 && present.length > 0 && (
            <div className="gallery-controls">
              <div className="filter-bar">
                <button className={"filter-chip" + (filter === "all" ? " active" : "")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("gallery.all")}</button>
                {present.map((c) => <button key={c} className={"filter-chip" + (filter === c ? " active" : "")} aria-pressed={filter === c} onClick={() => setFilter(c)}>{(cats[c] && (cats[c][lang] || cats[c].en)) || c}</button>)}
              </div>
            </div>
          )}
          {items.length === 0 ? <p className="empty-note">{t("gallery.empty")}</p> : (
            <>
              {albums.length > 0 && (
                <div className="album-section">
                  <h2 className="gallery-subhead">{t("gallery.albums")}</h2>
                  <div className="album-grid">
                    {albums.map((a) => {
                      const cover = a.photos.find((x) => x.pinned) || a.photos[0];
                      const nm = albumName(a);
                      return (
                        <Link className="album-card" href={`/gallery/${encodeURIComponent(a.key)}`} key={a.key}>
                          {cover?.src ? <img src={mediaUrl(cover.src, 480)} data-original={cover.src} onError={onMediaError} alt={nm} loading="lazy" decoding="async" /> : <div className="ph">🖼️</div>}
                          <div className="album-overlay"><h3>{nm}</h3><span className="album-count">{a.photos.length} {a.photos.length === 1 ? t("gallery.photo") : t("gallery.photos")}</span></div>
                          <span className="album-go" aria-hidden="true">→</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="allphotos-section">
                <h2 className="gallery-subhead">{t("gallery.allPhotos")}</h2>
                <PhotoGrid photos={pinSort(items)} />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
