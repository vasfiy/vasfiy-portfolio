"use client";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./Providers";

/* Full-bleed themed image band between Home sections — mood-first: the photo
   IS the strip, melting into the page via --bg gradients. Each instance
   consumes the SAME /worlds/<theme>.json manifest as the global PhotoLayer
   but shows a DIFFERENT photo per `slot` (photos[slot % len]), so the three
   bands never repeat each other or the hero mood. Theme read follows the
   same pattern as WorldLayer/PhotoLayer (localStorage + data-theme +
   MutationObserver); the outgoing photo stays mounted underneath while the
   new one fades in on theme swaps. Motion (slow zoom + scroll parallax) runs
   only when fx is on and the user hasn't asked for reduced motion, and
   reacts live to "fxchange" and media-query changes. The old html[data-fx]
   CSS gates are dead code (nothing sets that attribute), so fx-off is
   enforced here in JS via inline animation:none. If the manifest is
   missing/empty for a theme the band renders nothing — the PhotoLayer
   carries the mood alone. */

const THEMES = ["cosmos", "ocean", "cyber", "matrix", "sunset"];

type Photo = { src: string; pos: string };

const TITLE: Record<string, { en: string; uz: string }> = {
  cosmos: { en: "Written in the stars", uz: "Yulduzlar yozgan hikoya" },
  ocean: { en: "Quiet in the deep", uz: "Chuqurlikda tinchlik" },
  cyber: { en: "Sharper than a circuit", uz: "Zanjirdan ham aniqroq" },
  matrix: { en: "Every glyph tells a story", uz: "Har belgi — bir hikoya" },
  sunset: { en: "Golden hour, every day", uz: "Oltin soat — har kuni" },
};

const LINE: Record<string, { en: string; uz: string }> = {
  cosmos: { en: "Long shifts under a very big sky.", uz: "Katta osmon ostida uzoq smenalar." },
  ocean: { en: "Calm is something you practice.", uz: "Tinchlik ham mashq talab qiladi." },
  cyber: { en: "The grid hums for those who listen.", uz: "Tinglay olganlar uchun panjara ham gapiradi." },
  matrix: { en: "Every log is a story, if you read it slowly.", uz: "Har log — hikoya, sekin o‘qisangiz." },
  sunset: { en: "Even a screen glows warmer at golden hour.", uz: "Oltin soatda ekran ham iliqroq nur taratadi." },
};

export default function WorldBreak({ slot = 0 }: { slot?: number }) {
  const { lang } = useLang();
  const [theme, setTheme] = useState("cosmos");
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  // keeps the outgoing band image mounted underneath while the new one fades in
  const [scene, setScene] = useState<{ prev: Photo | null; cur: Photo | null }>({ prev: null, cur: null });
  const [motion, setMotion] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const syncFx = () => setMotion(localStorage.getItem("fx") !== "off" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    syncFx();
    window.addEventListener("fxchange", syncFx);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", syncFx);
    return () => {
      window.removeEventListener("fxchange", syncFx);
      media.removeEventListener("change", syncFx);
    };
  }, []);

  // Same manifest as PhotoLayer. On theme change the previous theme's photos
  // stay up until the new manifest arrives (then crossfade); a missing
  // manifest drops the band to null (render nothing).
  useEffect(() => {
    let dead = false;
    fetch(`/worlds/${theme}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: any) => {
        if (dead) return;
        const list: Photo[] = Array.isArray(data?.photos)
          ? data.photos
              .filter((p: any) => p && typeof p.src === "string" && p.src)
              .map((p: any) => ({ src: p.src as string, pos: typeof p.pos === "string" ? p.pos : "50% 50%" }))
          : [];
        setPhotos(list.length ? list : null);
      })
      .catch(() => { if (!dead) setPhotos(null); });
    return () => {
      dead = true;
    };
  }, [theme]);

  // Pick this band's photo: photos[slot % len]. Swap keeps prev mounted for
  // the crossfade; a missing/empty manifest clears the band entirely.
  useEffect(() => {
    const target = photos && photos.length ? photos[((slot % photos.length) + photos.length) % photos.length] : null;
    setScene((s) => (s.cur === target ? s : { prev: s.cur, cur: target }));
  }, [photos, slot]);

  // Gentle parallax: the whole image layer drifts as the band crosses the
  // viewport center. The slow zoom lives on the imgs in CSS, so the transform
  // must be applied to this wrapper, never to the imgs themselves.
  useEffect(() => {
    const band = ref.current;
    const media = band?.querySelector<HTMLDivElement>(".world-break-media");
    if (!band || !media || !motion) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = band.getBoundingClientRect();
      const drift = (window.innerHeight / 2 - (r.top + r.height / 2)) * 0.08;
      media.style.transform = `translateY(${Math.min(60, Math.max(-60, drift))}px)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      media.style.transform = "";
    };
  }, [motion]);

  if (!scene.cur) return null;
  const still = !motion;
  const imgStyle = (p: Photo) => ({ objectPosition: p.pos, animation: still ? ("none" as const) : undefined });
  return (
    <div className="world-break" ref={ref}>
      <div className="world-break-media" aria-hidden="true">
        {scene.prev && scene.prev.src !== scene.cur.src && <img key={scene.prev.src} src={scene.prev.src} alt="" loading="lazy" style={imgStyle(scene.prev)} />}
        <img key={scene.cur.src} src={scene.cur.src} alt="" loading="lazy" style={imgStyle(scene.cur)} />
      </div>
      <div className="world-break-cap">
        <h2 className="on-photo">{(TITLE[theme] || TITLE.cosmos)[lang]}</h2>
        <p className="on-photo">{(LINE[theme] || LINE.cosmos)[lang]}</p>
      </div>
    </div>
  );
}
