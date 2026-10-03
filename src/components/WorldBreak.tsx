"use client";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./Providers";

/* Full-bleed themed image band between Home sections — mood-first: the photo
   IS the strip, melting into the page via --bg gradients. The image follows
   the active world (same read pattern as WorldLayer: localStorage + data-theme
   + MutationObserver), crossfades on theme swaps, zooms almost imperceptibly,
   and drifts a few pixels with the scroll for depth. All motion is skipped for
   reduced-motion users and when fx is switched off (CSS + the fxchange hook). */

const THEMES = ["cosmos", "ocean", "cyber", "matrix", "sunset"];

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

export default function WorldBreak() {
  const { lang } = useLang();
  const [theme, setTheme] = useState("cosmos");
  // keeps the outgoing band image mounted underneath while the new one fades in
  const [scene, setScene] = useState({ prev: "cosmos", cur: "cosmos" });
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
    setScene((s) => (s.cur === theme ? s : { prev: s.cur, cur: theme }));
  }, [theme]);

  // Gentle parallax: the whole image layer drifts as the band crosses the
  // viewport center. The slow zoom lives on the imgs in CSS, so the transform
  // must be applied to this wrapper, never to the imgs themselves.
  useEffect(() => {
    const band = ref.current;
    const media = band?.querySelector<HTMLDivElement>(".world-break-media");
    if (!band || !media) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (localStorage.getItem("fx") === "off") return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = band.getBoundingClientRect();
      const drift = (window.innerHeight / 2 - (r.top + r.height / 2)) * 0.08;
      media.style.transform = `translateY(${Math.min(60, Math.max(-60, drift))}px)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    // ThemeFab flips fx live (dispatches "fxchange"), so honor it mid-session.
    const onFx = () => {
      if (localStorage.getItem("fx") === "off") { if (raf) cancelAnimationFrame(raf); raf = 0; media.style.transform = ""; }
      else update();
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("fxchange", onFx);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("fxchange", onFx);
      media.style.transform = "";
    };
  }, []);

  return (
    <div className="world-break" ref={ref}>
      <div className="world-break-media" aria-hidden="true">
        {scene.prev !== scene.cur && <img key={scene.prev} src={`/worlds/band-${scene.prev}.jpg`} alt="" loading="lazy" />}
        <img key={scene.cur} src={`/worlds/band-${scene.cur}.jpg`} alt="" loading="lazy" />
      </div>
      <div className="world-break-cap">
        <h2>{(TITLE[theme] || TITLE.cosmos)[lang]}</h2>
        <p>{(LINE[theme] || LINE.cosmos)[lang]}</p>
      </div>
    </div>
  );
}
