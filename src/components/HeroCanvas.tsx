"use client";
import { useEffect, useRef } from "react";

/* The hero backdrop: a slow constellation of drifting nodes joined by hairlines.
   A few KB of 2D canvas — replaced the ~0.8 MB Three.js particle field. Tinted
   by the active theme accent, throttled to ~30fps, paused when the tab hides OR
   the hero scrolls offscreen, and skipped entirely for reduced-motion users.
   Phones (≤768px) are NOT skipped: they run a halved field with the backing
   store capped at dpr 1.5 to keep the canvas cheap on mid-range GPUs. */
export default function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (localStorage.getItem("fx") === "off") return; // live fx disabled from the theme panel
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const readColor = (): [number, number, number] => {
      const hex = getComputedStyle(document.documentElement).getPropertyValue("--cyan").trim() || "#2dd4ea";
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [45, 212, 234];
    };

    const FRAME = 1000 / 30; // the field drifts slowly — display refresh (60-120Hz) is wasted work
    const BUCKETS = 5;       // link alphas quantized into buckets: ~5 stroke calls instead of hundreds
    const LINK = 130;
    let w = 0, h = 0, raf = 0, visible = true, inView = true, last = 0, resizeT = 0;
    let [r, g, b] = readColor();
    let linkStyles: string[] = [], dotStyle = "", segs: number[][] = [];
    type P = { x: number; y: number; vx: number; vy: number };
    let pts: P[] = [];

    // Precompute the handful of colors the theme accent implies (no per-frame string churn)
    const retint = () => {
      [r, g, b] = readColor();
      dotStyle = `rgba(${r},${g},${b},0.5)`;
      linkStyles = Array.from({ length: BUCKETS }, (_, i) =>
        `rgba(${r},${g},${b},${(((i + 1) / BUCKETS) * 0.14).toFixed(3)})`);
      segs = Array.from({ length: BUCKETS }, () => [] as number[]);
    };

    const applyResize = () => {
      // re-read per resize: zoom / monitor changes must not leave a soft canvas.
      // Phones (≤768px, the photo layer's breakpoint) cap at 1.5 — the field is
      // hairlines and 1.3px dots; raster at dpr 2-3 is invisible GPU cost.
      const dpr = Math.min(window.innerWidth <= 768 ? 1.5 : 2, window.devicePixelRatio || 1);
      const rect = canvas.parentElement?.getBoundingClientRect();
      w = Math.max(1, rect?.width || window.innerWidth);
      h = Math.max(1, rect?.height || window.innerHeight);
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cosmic = document.documentElement.getAttribute("data-theme") === "cosmos";
      const small = Math.min(w, window.innerWidth) < 700; // phones / narrow windows: half the field
      const div = (cosmic ? 20000 : 17000) * (small ? 2 : 1);
      const n = Math.min((cosmic ? 70 : 110) / (small ? 2 : 1), Math.floor((w * h) / div));
      if (pts.length !== n) {
        pts = Array.from({ length: n }, () => ({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        }));
      } else {
        // same density: fold existing points into the new bounds instead of rebuilding
        for (const p of pts) {
          if (p.x > w + 20) p.x = Math.random() * w;
          if (p.y > h + 20) p.y = Math.random() * h;
        }
      }
    };
    // Resizes fire continuously (window drags, mobile URL bar) — debounce the reallocating rebuild
    const resize = () => { clearTimeout(resizeT); resizeT = window.setTimeout(applyResize, 150); };

    const tick = (ts: number) => {
      if (!visible || !inView || document.hidden) { raf = 0; return; } // IO / visibilitychange restart us
      raf = requestAnimationFrame(tick);
      if (ts - last < FRAME) return;
      last = ts - ((ts - last) % FRAME);
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
      }
      for (const s of segs) s.length = 0;
      const L2 = LINK * LINK;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const dx = a.x - pts[j].x, dy = a.y - pts[j].y, d2 = dx * dx + dy * dy;
          if (d2 < L2) {
            const t = 1 - Math.sqrt(d2) / LINK;
            segs[Math.min(BUCKETS - 1, (t * BUCKETS) | 0)].push(a.x, a.y, pts[j].x, pts[j].y);
          }
        }
      }
      ctx.lineWidth = 1;
      for (let k = 0; k < BUCKETS; k++) {
        const s = segs[k];
        if (!s.length) continue;
        ctx.strokeStyle = linkStyles[k];
        ctx.beginPath();
        for (let m = 0; m < s.length; m += 4) { ctx.moveTo(s[m], s[m + 1]); ctx.lineTo(s[m + 2], s[m + 3]); }
        ctx.stroke();
      }
      ctx.fillStyle = dotStyle;
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2); ctx.fill(); }
    };

    const kick = () => { if (!raf && visible && inView && !document.hidden) raf = requestAnimationFrame(tick); };
    const onVis = () => {
      visible = document.visibilityState === "visible";
      if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; } else kick();
    };
    // Live retint + density change when the visitor switches color theme
    const themeMo = new MutationObserver(() => { retint(); applyResize(); });
    themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    // Stop the loop entirely while the hero is scrolled away (was: full-refresh forever)
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView) kick();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0 });
    io.observe(canvas);
    retint();
    applyResize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    kick();
    return () => {
      cancelAnimationFrame(raf); clearTimeout(resizeT);
      io.disconnect(); themeMo.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" />;
}
