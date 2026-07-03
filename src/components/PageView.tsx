"use client";
import Link from "next/link";
import { useLang } from "./Providers";
import { pick } from "@/lib/i18n";
import AdminEditLink from "./AdminEditLink";
import type { Page } from "@/lib/types";

export default function PageView({ page }: { page: Page | null }) {
  const { lang } = useLang();
  if (!page) return (
    <article className="post-page container">
      <Link className="post-back" href="/">← {lang === "uz" ? "Bosh sahifa" : "Home"}</Link>
      <p className="empty-note">{lang === "uz" ? "Sahifa topilmadi." : "Page not found."}</p>
    </article>
  );
  const title = pick(page, "title", lang);
  const body = pick(page, "body", lang);
  return (
    <article className="post-page container">
      <Link className="post-back" href="/">← {lang === "uz" ? "Bosh sahifa" : "Home"}</Link>
      {page.__id && <AdminEditLink hash={`pages?edit=${page.__id}`} label={lang === "uz" ? "Sahifani tahrirlash" : "Edit page"} />}
      <h1 className="post-title">{page.icon ? page.icon + " " : ""}{title}</h1>
      <div className="post-text">
        {body
          ? <div className="post-rich" dangerouslySetInnerHTML={{ __html: body }} />
          : <p className="empty-note">{lang === "uz" ? "Kontent hali yo'q." : "No content yet."}</p>}
      </div>
    </article>
  );
}
