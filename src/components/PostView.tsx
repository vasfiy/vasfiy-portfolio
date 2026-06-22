"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "./Providers";
import { pick } from "@/lib/i18n";
import { fmtDate, ytId, readingTime } from "@/lib/data";
import type { Post } from "@/lib/types";

export default function PostView({ post, related }: { post: Post | null; related: Post[] }) {
  const { lang, t } = useLang();
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { setUrl(window.location.href.split("#")[0]); }, []);

  if (!post) return (
    <article className="post-page container">
      <Link className="post-back" href="/blog">{t("blog.back")}</Link>
      <p className="empty-note">{t("blog.notfound")}</p>
    </article>
  );

  const title = pick(post, "title", lang);
  const full = pick(post, "full", lang) || pick(post, "body", lang);
  const paras = full.split(/\n\n+/).filter((s) => s.trim());

  const media = () => {
    if (post.type === "image" && post.media) return <div className="post-media"><img src={post.media} alt={title} /></div>;
    if (post.type === "video" && post.media) return <div className="post-media"><video src={post.media} controls preload="metadata" /></div>;
    if (post.type === "youtube" && post.media) return <div className="post-media post-media-video"><iframe src={`https://www.youtube.com/embed/${ytId(post.media)}`} title={title} allowFullScreen allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" /></div>;
    return null;
  };

  const u = encodeURIComponent(url), x = encodeURIComponent(title);
  const shares: [string, string, string][] = [
    ["Telegram", `https://t.me/share/url?url=${u}&text=${x}`, "M9.8 16.6 9.6 13l6.7-6c.3-.3-.1-.4-.5-.2L7.6 12 4 10.9c-.8-.2-.8-.8.2-1.2l14-5.4c.7-.3 1.3.2 1 1.2l-2.4 11.3c-.2.8-.6 1-1.3.6l-3.6-2.7-1.7 1.7c-.2.2-.4.4-.8.4z"],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21H9z"],
    ["X", `https://twitter.com/intent/tweet?url=${u}&text=${x}`, "M18.9 2H22l-7.5 8.6L23 22h-6.8l-5.3-7-6.1 7H1.7l8-9.2L1 2h7l4.8 6.3L18.9 2zm-2.4 18h1.9L7.6 4H5.6l10.9 16z"],
    ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`, "M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20z"],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`, "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"],
  ];

  return (
    <article className="post-page container">
      <Link className="post-back" href="/blog">{t("blog.back")}</Link>
      {media()}
      <div className="post-text">
        <div className="blog-meta"><span>{fmtDate(post.date, lang)}</span>{post.location && <span className="b-loc">📍 {post.location}</span>}<span className="read-time">⏱ {readingTime(full)} {t("blog.min")}</span></div>
        <h1 className="post-title">{title}</h1>
        {paras.map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: p.replace(/\n/g, "<br>") }} />)}
      </div>
      <div className="post-share">
        <span className="post-share-label">{t("blog.share")}</span>
        <div className="share-row">
          {shares.map(([name, href, path]) => (
            <a className="share-btn" key={name} href={href} target="_blank" rel="noopener" aria-label={name} title={name}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d={path} /></svg></a>
          ))}
          <button className={"share-btn share-copy" + (copied ? " ok" : "")} aria-label={t("blog.copy")} title={copied ? t("blog.copied") : t("blog.copy")} onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {} }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
          </button>
        </div>
      </div>
      {related.length > 0 && (
        <div className="post-related">
          <h3>{t("blog.more")}</h3>
          <div className="related-grid">
            {related.map((p, i) => (
              <Link className="related-card glass" key={p.__id || i} href={`/blog/${p.__id ?? i}`}>
                <span className="related-date">{fmtDate(p.date, lang)}</span>
                <h4>{pick(p, "title", lang)}</h4>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
