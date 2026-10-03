"use client";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./Providers";

/* Full-bleed themed image band between Home sections. The image follows the
   active world (same read pattern as WorldLayer: localStorage + data-theme +
   MutationObserver) and drifts a few pixels with the scroll for depth —
   skipped entirely for reduced-motion users and when fx is switched off. */

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

  // Gentle parallax: the image drifts as the band crosses the viewport center.
  useEffect(() => {
    const band = ref.current;
    const img = band?.querySelector<HTMLImageElement>("img");
    if (!band || !img) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (localStorage.getItem("fx") === "off") return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = band.getBoundingClientRect();
      const drift = (window.innerHeight / 2 - (r.top + r.height / 2)) * 0.08;
      img.style.transform = `translateY(${Math.min(60, Math.max(-60, drift))}px)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    // ThemeFab flips fx live (dispatches "fxchange"), so honor it mid-session.
    const onFx = () => {
      if (localStorage.getItem("fx") === "off") { if (raf) cancelAnimationFrame(raf); raf = 0; img.style.transform = ""; }
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
      img.style.transform = "";
    };
  }, []);

  return (
    <div className="world-break" ref={ref}>
      <img src={`/worlds/${theme}.jpg`} alt="" loading="lazy" />
      <div className="world-break-cap">
        <h2>{(TITLE[theme] || TITLE.cosmos)[lang]}</h2>
        <p>{(LINE[theme] || LINE.cosmos)[lang]}</p>
      </div>
    </div>
  );
}
