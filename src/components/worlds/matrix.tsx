"use client";
import { useEffect, useRef } from "react";
import { runAmbientCanvas, seeded, type Ambient } from "./shared";
import { prefersReducedMotion } from "./rm";
import styles from "./matrix.module.css";

/* MATRIX world — digital glyph rain behind the page (data-theme="matrix").
   Transparent canvas over the site, so trails are per-glyph alpha from a
   precomputed per-column profile (no translucent-rect fading possible).
   Restraint is the design: 12px mono glyphs, peak alpha <= 0.55, trails
   far fainter — this renders behind readable text. The engine (shared.ts)
   owns DPR, resize repaints, tab-hidden pause and the 30fps throttle. */

// One pre-split single-character string per glyph: fillText draws these
// directly — no string is ever built per frame.
const GLYPHS: string[] = (
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>[]{}=+*#$%&@"
).split("");

const FONT = '12px "JetBrains Mono", monospace';
const CELL_H = 19;        // vertical pitch: 12px font * 1.6 leading
const RING = 32;          // per-column glyph ring length (power of two)
const RING_MASK = RING - 1;
const MAX_TRAIL = 14;     // trails are 8..14 cells
// Trail alpha profile quantized into 5 buckets, head-adjacent first.
// Head peaks at 0.30-0.55; trails stay far below — restraint over the page.
const TRAIL_A = [0.34, 0.24, 0.16, 0.1, 0.055];
const TRAIL_A_BURST = [0.4, 0.28, 0.19, 0.12, 0.066]; // "burst" columns, brighter
const GLITCH_MS = 0.1;    // glitch line lasts 100ms

interface Col {
  x: number;              // px, fixed per rebuild
  y: number;              // head position in px (slides down; starts negative)
  speed: number;          // px/s, 60..160
  chars: string[];        // glyph ring — head writes a fresh glyph per cell entered
  dither: Float32Array;   // per-ring-cell 0.75..1 — drops out a few faint cells
  buckets: Uint8Array;    // alpha bucket per trail distance, index 1..trail-1
  trail: number;          // trail length in cells
  cell: number;           // current head cell index (drives ring writes)
  tier: number;           // head brightness tier 0..2
  burst: boolean;         // brighter + faster until next respawn
  staticY: number;        // fixed head y for the reduced-motion frame
}

export default function MatrixWorld() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduced = prefersReducedMotion();

    // --- state (rebuilt per resize, read-only in the hot path) ---
    let cols: Col[] = [];
    let glitchChars: string[] = [];
    let cellW = 7.2;
    let trailNorm: string[] = [];
    let trailBurst: string[] = [];
    let headTiers: string[] = [];
    let headBurst = "";
    let glitchStyle = "";
    let nextBurstAt = 6;
    let nextGlitchAt = 30;
    let glitchUntil = -1;
    let glitchY = 0;
    let lastW = -1, lastH = -1, lastMobile: boolean | null = null;
    let lastA: Ambient | null = null;
    // Layout rng re-seeded every rebuild so the reduced-motion frame is a
    // stable function of geometry; a separate stream drives runtime events.
    const rt = seeded(0x67452301);

    // --- colors: parsed once per rebuild/theme flip, styles as strings ---
    const parseHex = (s: string, fb: [number, number, number]): [number, number, number] => {
      const m = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(s.trim());
      if (!m) return fb;
      let h = m[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    const rgba = (c: [number, number, number], a: number) =>
      "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
    const mix = (a: [number, number, number], b: [number, number, number], f: number): [number, number, number] => [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f),
    ];

    const applyColors = (greenStr: string, bgStr: string) => {
      const green = parseHex(greenStr, [0x3d, 0xdc, 0x97]);
      const bg = parseHex(bgStr, [0x04, 0x06, 0x0d]);
      const lum = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
      const light = lum > 124;
      // Head is white-green on the dark page; dark ink-green on light mode
      // (a white head would vanish on #eef1f9).
      const headTint = light ? mix(green, [7, 16, 24], 0.55) : mix(green, [240, 255, 246], 0.62);
      const headTintStrong = light ? mix(green, [7, 16, 24], 0.72) : mix(green, [240, 255, 246], 0.8);
      trailNorm = TRAIL_A.map((a) => rgba(green, a));
      trailBurst = TRAIL_A_BURST.map((a) => rgba(green, a));
      headTiers = [0.3, 0.4, 0.5].map((a) => rgba(headTint, a));
      headBurst = rgba(headTintStrong, 0.55);
      glitchStyle = rgba(headTintStrong, 0.5);
    };

    const rebuild = (a: Ambient) => {
      lastW = a.w; lastH = a.h; lastMobile = a.mobile;
      applyColors(a.colors["--green"] || "", a.colors["--bg"] || "");
      const { ctx, w, h, mobile } = a;
      ctx.font = FONT;
      cellW = ctx.measureText("0").width || 7.2; // measured once per resize
      const lr = seeded(0x4d415452); // deterministic layout per geometry
      const n0 = Math.min(70, Math.max(40, Math.round(w / 40))); // 40-70 desktop
      const n = mobile ? Math.max(16, n0 >> 1) : n0;             // halved on mobile
      const slotW = Math.max(w / n, cellW * 1.7);
      cols = [];
      glitchChars = new Array(n);
      for (let i = 0; i < n; i++) {
        const trail = 8 + ((lr() * 7) | 0);
        const chars: string[] = new Array(RING);
        const dither = new Float32Array(RING);
        for (let j = 0; j < RING; j++) {
          chars[j] = GLYPHS[(lr() * GLYPHS.length) | 0];
          dither[j] = 0.75 + lr() * 0.25;
        }
        const buckets = new Uint8Array(MAX_TRAIL);
        for (let d = 1; d < MAX_TRAIL; d++) buckets[d] = Math.min(4, (((d - 1) * 5) / trail) | 0);
        const y = lr() * (h + 160) - 80; // staggered over and beyond the viewport
        cols.push({
          x: Math.round((i + 0.1 + 0.8 * lr()) * slotW),
          y,
          speed: 60 + lr() * 100,
          chars, dither, buckets, trail,
          cell: Math.floor(y / CELL_H),
          tier: (lr() * 3) | 0,
          burst: false,
          staticY: Math.round(h * (0.14 + 0.72 * lr())),
        });
        glitchChars[i] = GLYPHS[(lr() * GLYPHS.length) | 0];
      }
      nextBurstAt = 5 + lr() * 6;     // then every 8-15s
      nextGlitchAt = 25 + lr() * 15;  // then every 25-40s
      glitchUntil = -1;
    };

    // In-place respawn — hot path stays allocation-free.
    const respawn = (c: Col, h: number) => {
      c.burst = false;
      c.y = -20 - rt() * h * 0.55; // staggered above the top
      c.speed = 60 + rt() * 100;
      c.trail = 8 + ((rt() * 7) | 0);
      c.tier = (rt() * 3) | 0;
      c.cell = Math.floor(c.y / CELL_H);
      for (let j = 0; j < RING; j++) c.chars[j] = GLYPHS[(rt() * GLYPHS.length) | 0];
      for (let d = 1; d < MAX_TRAIL; d++) c.buckets[d] = Math.min(4, (((d - 1) * 5) / c.trail) | 0);
    };

    // --- hot path: clearRect + fillText of cached strings only ---
    const drawFrame = (a: Ambient) => {
      const { ctx, w, h, t, dt } = a;
      ctx.clearRect(0, 0, w, h);

      if (t >= nextBurstAt) { // occasional brighter, faster column
        cols[(rt() * cols.length) | 0].burst = true;
        nextBurstAt = t + 8 + rt() * 7;
      }
      if (t >= nextGlitchAt) { // rare horizontal glitch line, 100ms
        glitchUntil = t + GLITCH_MS;
        glitchY = Math.floor((rt() * h) / CELL_H) * CELL_H;
        for (let i = 0; i < cols.length; i++) glitchChars[i] = GLYPHS[(rt() * GLYPHS.length) | 0];
        nextGlitchAt = t + 25 + rt() * 15;
      }

      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        c.y += c.speed * (c.burst ? 1.7 : 1) * dt;
        const cell = Math.floor(c.y / CELL_H);
        if (cell !== c.cell) { // head entered a new cell: seed it with a fresh glyph
          c.cell = cell;
          c.chars[cell & RING_MASK] = GLYPHS[(rt() * GLYPHS.length) | 0];
        }
        if (c.y - c.trail * CELL_H > h + 24) respawn(c, h);
      }

      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        const palette = c.burst ? trailBurst : trailNorm;
        let last = "";
        for (let d = 1; d < c.trail; d++) {
          const y = c.y - d * CELL_H;
          if (y < -CELL_H) break;       // rest of the trail is above the canvas
          if (y > h) continue;
          const b = c.buckets[d];
          if (b > 2 && c.dither[(c.cell - d) & RING_MASK] < 0.82) continue;
          const s = palette[b];
          if (s !== last) { ctx.fillStyle = s; last = s; }
          ctx.fillText(c.chars[(c.cell - d) & RING_MASK], c.x, y);
        }
        if (c.y > -CELL_H && c.y < h + CELL_H) {
          const s = c.burst ? headBurst : headTiers[c.tier];
          if (s !== last) { ctx.fillStyle = s; last = s; }
          ctx.fillText(c.chars[c.cell & RING_MASK], c.x, c.y);
        }
      }

      if (t < glitchUntil) { // thin row of random glyphs across the columns
        ctx.fillStyle = glitchStyle;
        for (let i = 0; i < cols.length; i++) ctx.fillText(glitchChars[i], cols[i].x, glitchY);
      }
    };

    // Reduced motion: one static frame — a few columns at varying alphas.
    const drawStatic = (a: Ambient) => {
      const { ctx, w, h } = a;
      ctx.clearRect(0, 0, w, h);
      const keep = Math.max(6, Math.round(cols.length * 0.2));
      const stride = Math.max(1, Math.floor(cols.length / keep));
      let last = "";
      for (let i = 0; i < cols.length; i += stride) {
        const c = cols[i];
        const s = headTiers[i % 3];
        if (s !== last) { ctx.fillStyle = s; last = s; }
        ctx.fillText(c.chars[c.cell & RING_MASK], c.x, c.staticY);
        const dMax = 3 + (i % 4);
        for (let d = 1; d <= dMax; d++) {
          const y = c.staticY - d * CELL_H;
          if (y < 0) break;
          const st = trailNorm[c.buckets[d]];
          if (st !== last) { ctx.fillStyle = st; last = st; }
          ctx.fillText(c.chars[(c.cell - d) & RING_MASK], c.x, y);
        }
      }
    };

    const draw = (a: Ambient) => {
      lastA = a;
      if (a.w !== lastW || a.h !== lastH || a.mobile !== lastMobile) rebuild(a);
      if (reduced) drawStatic(a);
      else drawFrame(a);
    };

    // Live retint on theme/mode flips (the engine only re-reads tokens on
    // resize; --bg changes via data-mode without one). Repaint manually so
    // the reduced-motion static frame recolors too.
    const onTheme = () => {
      const cs = getComputedStyle(document.documentElement);
      applyColors(cs.getPropertyValue("--green"), cs.getPropertyValue("--bg"));
      if (!lastA) return;
      const d = lastA.dt;
      lastA.dt = 0; // repaint only — do not advance the scene
      if (reduced) drawStatic(lastA);
      else drawFrame(lastA);
      lastA.dt = d;
    };
    const themeMo = new MutationObserver(onTheme);
    themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode"] });

    const stop = runAmbientCanvas(canvas, ["--green", "--bg"], draw, { fps: 30 });
    return () => {
      themeMo.disconnect();
      stop();
    };
  }, []);

  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" />;
}
