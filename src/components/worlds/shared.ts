"use client";

/* Shared engine for the theme "worlds" (WorldLayer scenes).
   Contract for every world component:
   - default-export a component that renders ONE <canvas> (plus optional
     DOM accents from its own .module.css)
   - call runAmbientCanvas(canvas, ["--cyan", ...], draw) in a useEffect
   - draw(a: Ambient) clears and paints the whole frame; it receives live
     viewport size, elapsed time, theme token colors and a mobile flag
   - never touch globals.css or other worlds — styles go in your .module.css
   The engine handles: DPR cap (2), resize (with a fresh static paint),
   tab-hidden pause, reduced-motion (single static frame, no loop). */

import { prefersReducedMotion } from "./rm";

export interface Ambient {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  dpr: number;
  t: number; // seconds since mount
  dt: number; // seconds since previous frame (clamped to 50ms)
  colors: Record<string, string>; // requested CSS custom properties, live
  mobile: boolean; // viewport < 768px — halve particle counts
}

export function runAmbientCanvas(
  canvas: HTMLCanvasElement,
  colorNames: string[],
  draw: (a: Ambient) => void,
  opts?: { fps?: number },
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  let reduced = prefersReducedMotion();
  const minFrame = opts?.fps ? 1000 / opts.fps : 0;
  let raf = 0;
  let running = false;
  let last = performance.now();
  const start = last;
  const state: Ambient = {
    ctx,
    w: 0,
    h: 0,
    dpr: 1,
    t: 0,
    dt: 0,
    colors: {},
    mobile: false,
  };

  const resize = () => {
    state.dpr = Math.min(2, window.devicePixelRatio || 1);
    state.w = window.innerWidth;
    state.h = window.innerHeight;
    state.mobile = window.innerWidth < 768;
    canvas.width = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    canvas.style.width = state.w + "px";
    canvas.style.height = state.h + "px";
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    const cs = getComputedStyle(document.documentElement);
    for (const n of colorNames) state.colors[n] = cs.getPropertyValue(n).trim();
    try { draw(state); } catch {} // immediate static paint — the ONLY paint under reduced motion
  };

  const frame = (now: number) => {
    state.dt = Math.min(0.05, (now - last) / 1000);
    state.t = (now - start) / 1000;
    last = now;
    try { draw(state); } catch {} // one bad frame degrades, never freezes the scene
    raf = requestAnimationFrame(frame);
  };

  // fps-throttled loop start/stop (HeroCanvas-style 30fps cap is welcome)
  const tick = (now: number) => {
    if (now - last >= minFrame) {
      state.dt = Math.min(0.05, (now - last) / 1000);
      state.t = (now - start) / 1000;
      last = now;
      try { draw(state); } catch {}
    }
    raf = requestAnimationFrame(tick);
  };
  const startLoop = () => {
    if (reduced || running) return;
    running = true;
    last = performance.now();
    raf = minFrame ? requestAnimationFrame(tick) : requestAnimationFrame(frame);
  };
  const stopLoop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  const visibility = () => {
    if (document.hidden) stopLoop();
    else startLoop();
  };

  resize();
  // coalesce resize bursts (window drag, iOS URL-bar) — full rebuilds are pricey
  let resizeT: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 150); };
  const onReduced = (e: MediaQueryListEvent) => {
    reduced = e.matches;
    if (reduced) { stopLoop(); try { draw(state); } catch {} }
    else startLoop();
  };
  const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
  window.addEventListener("resize", onResize);
  rm.addEventListener?.("change", onReduced);
  document.addEventListener("visibilitychange", visibility);
  startLoop();
  return () => {
    stopLoop();
    clearTimeout(resizeT);
    window.removeEventListener("resize", onResize);
    rm.removeEventListener?.("change", onReduced);
    document.removeEventListener("visibilitychange", visibility);
  };
}

/** Deterministic pseudo-random generator so a world looks the same on every
    visit (seeded particles, stable constellation layouts). */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
