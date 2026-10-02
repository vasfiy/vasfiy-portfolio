import { isVideo } from "./data";
import type { SyntheticEvent } from "react";

/* Media URL helper: site images live in Supabase Storage, whose raw
   /object/public/ files are full-size originals (up to ~1 MB each). The
   /render/image/ endpoint serves on-the-fly transforms (verified:
   webp 1,052,447 B → webp 41,012 B at width=800&quality=70&format=webp). */

const OBJECT = "/object/public/";
const RENDER = "/render/image/public/";
// vector + animated formats must not pass through the raster transform endpoint
const PASSTHROUGH = /\.(svg|gif)($|\?)/i;

/** Rewrite a Supabase Storage public image URL into a transformed one:
    /object/public/… → /render/image/public/…?width=<w>&quality=70&format=webp.
    Width buckets: thumbs 480 (gallery grids/previews) · cards 800 (blog/cert/
    book covers) · detail 1400 (lightbox/certificate viewer).
    Non-Supabase URLs, videos and svg/gif pass through unchanged. */
export function mediaUrl(url: string | undefined, width: number): string | undefined {
  const u = String(url ?? "");
  const i = u.indexOf(OBJECT);
  if (!u || i === -1 || isVideo(u) || PASSTHROUGH.test(u)) return url;
  const [bare, query] = (u.slice(0, i) + RENDER + u.slice(i + OBJECT.length)).split("?");
  const p = new URLSearchParams(query || "");
  p.set("width", String(width));
  p.set("quality", "70");
  p.set("format", "webp");
  return `${bare}?${p.toString()}`;
}

/** onError fallback for transformed <img>s: revert once to the original URL
    kept in data-original, so a failed transform can never break an image. */
export function onMediaError(e: SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  const orig = el.dataset.original;
  if (!orig) return; // non-Supabase src, or already reverted — no retry loop
  delete el.dataset.original;
  if (el.src !== orig) el.src = orig;
}
