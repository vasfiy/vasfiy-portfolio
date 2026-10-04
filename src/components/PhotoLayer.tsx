"use client";
import { loadManifest } from "@/lib/worlds";
import { useCallback, useEffect, useRef, useState } from "react";
import s from "./photo-layer.module.css";

/* The global cinematic backdrop: ONE fixed, full-viewport photo layer behind
   the whole page (z-index -1) — a moody gallery crossfading under a constant
   --bg veil so text stays readable everywhere. It reads the active theme
   (localStorage + data-theme + MutationObserver, same contract the old canvas
   worlds used) and fetches /worlds/<theme>.json.

   The driver is PAGE SCROLL, not a timer: scroll progress —
   scrollY / (docHeight - viewportHeight), clamped 0..1 — maps straight onto
   the photo list (index = floor(progress * len), clamped), so as the visitor
   moves hero → about → … → contact the backdrop quietly morphs to the next
   mood photo. No strip, no captions: the fixed background itself evolves.
   Index changes use the same 1.8s two-slot crossfade as before (the outgoing
   img stays mounted while it fades out — never a blank flash), and both
   neighbours of the current photo stay preloaded. Ken Burns runs only when
   fx is on and the user hasn't asked for reduced motion; with fx off (or
   reduced motion) the layer still tracks scroll — it just swaps instantly,
   with no transitions and no zoom.

   PHONES (≤768px) get the calm compositing budget: no Ken Burns (the zoom
   transform is never applied inline), a short 650ms opacity fade instead of
   the 1.8s/9s pair (see photo-layer.module.css), no permanent will-change
   layers, a fire-and-forget img.decode() ahead of each swap, and a settle
   guard — while a scroll flick is active, index changes are HELD and applied
   once scrolling goes quiet, so the backdrop never animates against the
   gesture. Desktop keeps the live per-scroll crossfade and the Ken Burns
   look. */

type Photo = { src: string; pos: string };
type Slot = { photo: Photo; idx: number };
type Show = { a: Slot; b: Slot; active: "a" | "b"; cur: number };

const THEMES = ["cosmos", "ocean", "cyber", "matrix", "sunset"];
/* transform-origin rotates per slide so consecutive zooms drift differently */
const ORIGINS = ["50% 40%", "62% 46%", "38% 58%", "56% 34%", "44% 62%"];

/* Phones get the calm budget — must match the @media (max-width: 768px)
   block in photo-layer.module.css. */
const PHONE_Q = "(max-width: 768px)";
/* A scroll flick is "active" while scroll events arrive within this window;
   on phones, index changes during that window are held until it goes quiet. */
const SETTLE_MS = 150;
const srcFor = (src: string, phone: boolean) => (phone ? src.replace(/\.jpg$/, "-sm.webp") : src); // phones: lighter webp re-encodes, same pixels

/* scroll progress (0..1) -> photo index, clamped inside the list */
function indexFor(len: number, progress: number): number {
  if (len < 2) return 0;
  return Math.min(Math.floor(progress * len), len - 1);
}

function initialShow(photos: Photo[], idx0: number): Show | null {
  if (!photos.length) return null;
  const len = photos.length;
  const i = ((idx0 % len) + len) % len;
  const nb = len > 1 ? (i + 1) % len : 0;
  return {
    a: { photo: photos[i], idx: i },
    b: { photo: photos[nb], idx: nb },
    active: "a",
    cur: i,
  };
}

export default function PhotoLayer() {
  const [theme, setTheme] = useState("cosmos");
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [show, setShow] = useState<Show | null>(null);
  const advanced = useRef(false);
  const [fxOn, setFxOn] = useState(true);
  const [rm, setRm] = useState(false);
  // false -> true (just after a slide becomes front) starts the Ken Burns zoom
  const [zoom, setZoom] = useState(false);
  const motion = fxOn && !rm;

  // Phone breakpoint (PHONE_Q, same as the CSS media query). Kept in state
  // for rendering and mirrored in a ref for the passive scroll handler, so
  // rotating a device never re-subscribes its listeners.
  const [phone, setPhone] = useState(false);
  const phoneRef = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_Q);
    const sync = () => { phoneRef.current = mq.matches; setPhone(mq.matches); };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Scroll state lives in refs: the passive scroll handler only does cached
  // math (doc height is measured on mount/resize, never per scroll event).
  const progressRef = useRef(0);
  const curRef = useRef(0);
  // Phone settle guard: timestamp of the last scroll event and an index held
  // back while the flick is active (applied once scrolling goes quiet).
  const lastScrollAt = useRef(0);
  const pendingIdx = useRef<number | null>(null);
  // The two slot <img>s, for the phone decode() kick ahead of each swap.
  const aImg = useRef<HTMLImageElement | null>(null);
  const bImg = useRef<HTMLImageElement | null>(null);

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

  useEffect(() => {
    document.documentElement.classList.add("has-photo-layer");
    return () => document.documentElement.classList.remove("has-photo-layer");
  }, []);

  /* One manifest per theme. Null while loading or missing -> render nothing
     (the page keeps its plain --bg backdrop, nothing breaks). On a theme
     change mid-scroll the new theme's photo matching the CURRENT scroll
     index is shown (progress is kept in a ref, so no scroll is missed). */
  useEffect(() => {
    let dead = false;
    // keep the previous theme's photos mounted while fetching — no hard pop to --bg
    setZoom(false);
    pendingIdx.current = null; // a held pre-switch index must not flush into the new list
    loadManifest(theme)
      .then((data: any) => {
        if (dead) return;
        const list: Photo[] = Array.isArray(data?.photos)
          ? data.photos
              .filter((p: any) => p && typeof p.src === "string" && p.src)
              .map((p: any) => ({ src: p.src as string, pos: typeof p.pos === "string" ? p.pos : "50% 50%" }))
          : [];
        const i0 = indexFor(list.length, progressRef.current);
        curRef.current = i0;
        setPhotos(list);
        const warm = new Image();
        warm.onload = warm.onerror = () => { if (!dead) setShow(initialShow(list, i0)); };
        warm.src = srcFor(list[i0]?.src ?? "", phoneRef.current);
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [theme]);

  /* Crossfade to photos[target]: the back slot takes the target photo and
     fades in over the front, then the slots swap roles and the outgoing one
     is refilled with photos[target+1] — the non-active slot always preloads
     one step ahead. The outgoing img stays mounted while it fades out, so
     there is never a blank flash. */
  const goTo = useCallback(
    (target: number) => {
      advanced.current = true;
      const len = photos?.length ?? 0;
      if (len < 2) return;
      const t = Math.min(Math.max(target, 0), len - 1);
      if (t === curRef.current) return;
      curRef.current = t;
      setZoom(false);
      setShow((p) => {
        if (!p || t === p.cur) return p;
        const incoming: Slot = { photo: photos![t], idx: t };
        const refill: Slot = { photo: photos![(t + 1) % len], idx: (t + 1) % len };
        if (p.active === "a") return { a: refill, b: incoming, active: "b", cur: t };
        return { a: incoming, b: refill, active: "a", cur: t };
      });
    },
    [photos]
  );

  /* Page scroll is the driver: a passive, rAF-throttled listener maps scroll
     progress to a photo index; when the index changes the layer crossfades.
     It runs with fx off / reduced motion too — the CSS .still class simply
     makes those swaps instant. Doc height is measured on mount, resize and
     element resize only; the handler itself does no layout reads.

     Phone settle guard: while a flick is active — scroll events seen within
     the last SETTLE_MS — a changed index is HELD in pendingIdx and applied
     by a timer once no scroll event has arrived for SETTLE_MS. Mid-gesture
     the component never re-renders, so the compositor scrolls untouched and
     the photo settles into place right after the flick instead of fighting
     it. Desktop keeps the live per-scroll crossfade. */
  useEffect(() => {
    const measure = () => document.documentElement.scrollHeight - window.innerHeight;
    let maxScroll = measure();
    let raf = 0;
    let idleT = 0;
    const flush = () => {
      idleT = 0;
      const t = pendingIdx.current;
      if (t == null) return;
      pendingIdx.current = null;
      goTo(t);
    };
    // hold an index mid-flick: remember it and push the flush past the gesture
    const hold = (idx: number) => {
      pendingIdx.current = idx;
      if (idleT) clearTimeout(idleT);
      idleT = window.setTimeout(flush, SETTLE_MS + 20);
    };
    const apply = () => {
      const progress = Math.min(1, Math.max(0, window.scrollY / (maxScroll > 0 ? maxScroll : 1)));
      progressRef.current = progress;
      const len = photos?.length ?? 0;
      if (len < 2) return;
      const idx = indexFor(len, progress);
      if (idx !== curRef.current) {
        if (phoneRef.current && performance.now() - lastScrollAt.current < SETTLE_MS) {
          hold(idx); // mid-flick on a phone: settle once the gesture ends
        } else {
          pendingIdx.current = null;
          goTo(idx);
        }
      } else if (pendingIdx.current != null) {
        // scrolled back before the flush fired: the held target is obsolete
        pendingIdx.current = null;
        if (idleT) { clearTimeout(idleT); idleT = 0; }
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; apply(); });
    };
    const onScroll = () => {
      lastScrollAt.current = performance.now();
      const held = pendingIdx.current;
      if (held != null) hold(held); // keep pushing the flush past the flick
      schedule();
    };
    const onResize = () => { maxScroll = measure(); schedule(); };
    schedule(); // initial position (browsers restore scroll on reload)
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    // content height settling (fonts, images) re-measures via ResizeObserver,
    // keeping the progress mapping honest without per-scroll layout reads
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    if (ro) ro.observe(document.documentElement);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (idleT) clearTimeout(idleT);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (ro) ro.disconnect();
    };
  }, [goTo, photos]);

  /* Keep both neighbours of the current photo warm so a one-step scroll in
     either direction crossfades into an already-cached image. */
  useEffect(() => {
    const len = photos?.length ?? 0;
    if (len < 2 || !show) return;
    // warm AFTER the first-load critical window — the neighbour only matters
    // once the visitor starts scrolling, and on slow links it was stealing ~80KB
    const t = window.setTimeout(() => {
      for (const i of [(show.cur + 1) % len, ...(advanced.current ? [(show.cur - 1 + len) % len] : [])]) {
        const img = new Image();
        img.src = srcFor(photos![i].src, phoneRef.current);
      }
    }, 2200);
    return () => window.clearTimeout(t);
  }, [show, photos]);

  /* Phones: ask the browser to decode the newly-front image before its first
     faded frame paints. Fire-and-forget — the swap is never gated on it (a
     slow decode must not delay the flip); the incoming photo is already
     loaded (neighbours are pre-warmed above), so decode() is pure raster
     work, and on phones it runs at scroll-idle, off the gesture's back. */
  useEffect(() => {
    if (!phone || !show) return;
    const el = show.active === "a" ? aImg.current : bImg.current;
    if (el && el.complete && el.decode) el.decode().catch(() => {});
  }, [show, phone]);

  /* Ken Burns: flip zoom shortly after each slide change so the CSS
     transition always runs 1 -> 1.05 over its full 9s. Phones never run it —
     a 9s full-viewport transform is exactly the continuous compositing a
     mid-range GPU cannot spend while scrolling. */
  useEffect(() => {
    if (!motion || phone) return;
    const t = window.setTimeout(() => setZoom(true), 80);
    return () => window.clearTimeout(t);
  }, [motion, phone, show]);

  if (!show) return null;
  return (
    <div className={`photo-layer ${s.layer} ${motion ? s.motion : s.still}`} aria-hidden="true">
      {(["a", "b"] as const).map((k) => {
        const slot = show[k];
        const front = show.active === k;
        return (
          <img
            key={k}
            ref={k === "a" ? aImg : bImg}
            className={front ? `${s.img} ${s.front}` : s.img}
            fetchPriority={slot.idx === 0 ? "high" : undefined}
            src={srcFor(slot.photo.src, phone)}
            alt=""
            style={{
              objectPosition: slot.photo.pos,
              transformOrigin: ORIGINS[slot.idx % ORIGINS.length],
              // phones: the zoom transform is never applied — Ken Burns is a
              // desktop look; phone compositing stays static between swaps
              transform: motion && !phone ? (front && zoom ? "scale(1.05)" : "scale(1)") : undefined,
            }}
          />
        );
      })}
      <div className={s.veil} />
    </div>
  );
}
