"use client";
import Link from "next/link";
import { useLang } from "./Providers";
import PhotoGrid from "./PhotoGrid";
import type { Photo } from "@/lib/types";

export default function AlbumView({ name, nameUz, photos }: { name: string; nameUz?: string; photos: Photo[] }) {
  const { lang, t } = useLang();

  if (!photos.length) return (
    <article className="post-page container">
      <Link className="post-back" href="/gallery">{t("gallery.back")}</Link>
      <p className="empty-note">{t("gallery.empty")}</p>
    </article>
  );

  return (
    <article className="post-page container album-page">
      <Link className="post-back" href="/gallery">{t("gallery.back")}</Link>
      <h1 className="post-title album-title">{lang === "uz" && nameUz ? nameUz : name}</h1>
      <PhotoGrid photos={photos} />
    </article>
  );
}
