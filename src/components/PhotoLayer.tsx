"use client";
import { useCallback, useEffect, useState } from "react";
import s from "./photo-layer.module.css";

/* The global cinematic backdrop: ONE fixed, full-viewport photo layer behind
   the whole page (z-index -1) — a moody gallery slowly crossfading under a
   constant --bg veil so text stays readable everywhere. It reads the active
   theme (localStorage + data-theme + MutationObserver, same contract the old
   canvas worlds used), fetches /worlds/<theme>.json, and swaps photos[i] ->
   photos[i+1] every 9s with a 1.8s crossfade, preloading exactly one step
   ahead. Ken Burns runs only when fx is on and the user hasn't asked for
   reduced motion; with fx off the layer is a static photo (no transitions).
   Replaces the old canvas worlds as the global background. */

type Photo = { src: string; pos: string };
type Slot = { photo: Photo; idx: number };
type Show = { a: Slot; b: Slot; active: "a" | "b"; cur: number };

const THEMES = ["cosmos", "ocean", "cyber", "matrix", "sunset"];
const HOLD_MS = 9000;
/* transform-origin rotates per slide so consecutive zooms drift differently */
const ORIGINS = ["50% 40%", "62% 46%", "38% 58%", "56% 34%", "44% 62%"];

function initialShow(photos: Photo[]): Show | null {
  if (!photos.length) return null;
  const b = photos.length > 1 ? 1 : 0;
  return {
    a: { photo: photos[0], idx: 0 },
    b: { photo: photos[b], idx: b },
    active: "a",
    cur: 0,
  };
}

export default function PhotoLayer() {
  const [theme, setTheme] = useState("cosmos");
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [show, setShow] = useState<Show | null>(null);
  const [fxOn, setFxOn] = useState(true);
  const [rm, setRm] = useState(false);
  // false -> true (just after a slide becomes front) starts the 9s Ken Burns
  const [zoom, setZoom] = useState(false);
  const [hidden, setHidden] = useState(false);
  const motion = fxOn && !rm;

  /* Theme: same read pattern as the old WorldLayer (localStorage first, then
     the html attribute, kept live via MutationObserver, clamped to the five
     known worlds). */
  useEffect(() => {
    const el = document.documentElement;
    const read = () => {
      const t = localStorage.getItem("theme") || el.getAttribute("data-theme") || "cosmos";
      setTheme(THEMES.includes(t) ? t : "cosmos");
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  /* fx + reduced motion, both live: ThemeFab dispatches "fxchange", and the
     media query fires "change" if the OS setting flips mid-session. */
  useEffect(() => {
    const syncFx = () => setFxOn(localStorage.getItem("fx") !== "off");
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncRm = () => setRm(media.matches);
    syncFx();
    syncRm();
    window.addEventListener("fxchange", syncFx);
    media.addEventListener("change", syncRm);
    return () => {
      window.removeEventListener("fxchange", syncFx);
      media.removeEventListener("change", syncRm);
    };
  }, []);

  /* No timers while the tab is hidden: visibilitychange gates the slideshow. */
  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  /* One manifest per theme. Null while loading or missing -> render nothing
     (the page keeps its plain --bg backdrop, nothing breaks). */
  useEffect(() => {
    let dead = false;
    // keep the previous theme's photos mounted while fetching — no hard pop to --bg
    setZoom(false);
    fetch(`/worlds/${theme}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: any) => {
        if (dead) return;
        const list: Photo[] = Array.isArray(data?.photos)
          ? data.photos
              .filter((p: any) => p && typeof p.src === "string" && p.src)
              .map((p: any) => ({ src: p.src as string, pos: typeof p.pos === "string" ? p.pos : "50% 50%" }))
          : [];
        setPhotos(list);
        setShow(initialShow(list));
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [theme]);

  /* Crossfade to the next photo: the back slot (already preloaded) fades in
     over the front, then they swap roles. The outgoing img keeps its src
     while it fades out, so there is never a blank flash. */
  const advance = useCallback(() => {
    setZoom(false);
    setShow((p) => {
      const len = photos?.length ?? 0;
      if (!p || len < 2) return p;
      const next = (p.cur + 1) % len;
      const slotNext = { photo: photos![next], idx: next };
      if (p.active === "a") return { a: slotNext, b: p.b, active: "b", cur: next };
      return { a: p.a, b: slotNext, active: "a", cur: next };
    });
  }, [photos]);

  /* Slideshow heart: every 9s, preload the next photo (one step ahead, so
     only current + next are ever in memory), then advance. Paused entirely
     when motion is off, the tab is hidden, or the theme has a single photo. */
  useEffect(() => {
    if (!motion || hidden || !show || !photos || photos.length < 2) return;
    let dead = false;
    const timer = window.setTimeout(() => {
      const slot = show.active === "a" ? show.b : show.a; // the upcoming photo
      let started = false;
      const go = () => {
        if (!dead && !started) {
          started = true;
          advance();
        }
      };
      const img = new Image();
      img.onload = go;
      img.onerror = go;
      img.src = slot.photo.src;
      if (img.complete) go();
    }, HOLD_MS);
    return () => {
      dead = true;
      window.clearTimeout(timer);
    };
  }, [motion, hidden, show, photos, advance]);

  /* Ken Burns: flip zoom shortly after each slide change so the CSS
     transition always runs 1 -> 1.05 over its full 9s. */
  useEffect(() => {
    if (!motion) return;
    const t = window.setTimeout(() => setZoom(true), 80);
    return () => window.clearTimeout(t);
  }, [motion, show]);

  if (!show) return null;
  return (
    <div className={`photo-layer ${s.layer} ${motion ? s.motion : s.still}`} aria-hidden="true">
      {(["a", "b"] as const).map((k) => {
        const slot = show[k];
        const front = show.active === k;
        return (
          <img
            key={k}
            className={front ? `${s.img} ${s.front}` : s.img}
            src={slot.photo.src}
            alt=""
            style={{
              objectPosition: slot.photo.pos,
              transformOrigin: ORIGINS[slot.idx % ORIGINS.length],
              transform: motion ? (front && zoom ? "scale(1.05)" : "scale(1)") : undefined,
            }}
          />
        );
      })}
      <div className={s.veil} />
    </div>
  );
}
