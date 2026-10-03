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
  // the display bucket is a downscale CAP, never a quality loss: the largest
  // bucket serves near-original 1920px at q88 so nothing looks dim or soft
  p.set("width", String(width >= 1400 ? 1920 : width));
  p.set("quality", width >= 1400 ? "88" : width >= 800 ? "80" : "75");
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

/** onError fallback for <video>, mirroring onMediaError: revert once to the
    raw original kept in data-original (videos are normally served raw, so the
    revert is a no-op there), and when no original is left to try mark the
    element data-failed so the caller can swap in a placeholder card instead
    of a broken player. */
export function onVideoError(e: SyntheticEvent<HTMLVideoElement>) {
  const el = e.currentTarget;
  const orig = el.dataset.original;
  if (!orig) { el.dataset.failed = "1"; return; } // raw src only, or already reverted
  delete el.dataset.original;
  if (el.src !== orig) { el.src = orig; return; }
  el.dataset.failed = "1"; // original is the same src that just failed
}
