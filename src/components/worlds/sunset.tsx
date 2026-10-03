"use client";

/* Sunset world — a warm living dusk behind the content (WorldLayer scene).
   Scene: a breathing low sun on the right third, thin light-shaft bands
   rising from it, two parallax depth layers of warm-lit drifting clouds,
   occasional bird flocks, and blinking fireflies in the bottom third.
   Every textured thing (sky wash, sun, shaft band, cloud, firefly glow) is
   pre-rendered to offscreen canvases once per resize/theme-read; the
   per-frame path is drawImage + cached style strings + plain math — zero
   allocations. Reduced motion renders a single static frame (no birds).
   See ./shared.ts for the engine contract. */

import { useEffect, useRef } from "react";
import { runAmbientCanvas, seeded, type Ambient } from "./shared";
import { prefersReducedMotion } from "./rm";
import styles from "./sunset.module.css";

type RGB = [number, number, number];
const TAU = Math.PI * 2;

/* Fixed sunset hues — the requested tokens (--pink/--violet/--bg) carry the
   theme tints; these carry the gold/amber light. */
const GOLD: RGB = [255, 166, 88];
const AMBER: RGB = [255, 190, 106];
const LIGHT_GOLD: RGB = [255, 214, 148];
const CORE: RGB = [255, 246, 224];
const SKY_GLOW: RGB = [255, 178, 98];
const LIT_TOP: RGB = [255, 198, 122];

function parseColor(c: string | undefined, fb: RGB): RGB {
  if (!c) return fb;
  const s = c.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(s);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return fb;
}

function mix(a: RGB, b: RGB, k: number): RGB {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function rgba(c: RGB, a: number): string {
  return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
}

/* Offscreen sprite helper. Pure-gradient sprites (sky, sun, shaft) build at
   1x — they stay perfectly smooth when upscaled, at a fraction of the memory. */
function sprite(w: number, h: number, dpr: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const g = c.getContext("2d");
  if (!g) throw new Error("2d context unavailable");
  g.scale(dpr, dpr);
  return [c, g];
}

/* Soft radial blob — the one brush every sprite here is painted with. */
function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: RGB, a: number): void {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(c, Math.min(1, a)));
  gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

function puff(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  c: RGB,
  a: number,
): void {
  g.save();
  g.translate(x, y);
  g.scale(rx, ry);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  gr.addColorStop(0, rgba(c, a));
  gr.addColorStop(0.65, rgba(c, a * 0.8));
  gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr;
  g.beginPath();
  g.arc(0, 0, 1, 0, TAU);
  g.fill();
  g.restore();
}

interface CloudInst {
  v: number; // sprite variant index
  x: number;
  y: number;
  s: number; // draw scale
  a: number; // base alpha
  sp: number; // wind px/s
  bs: number; // bob speed
  ba: number; // bob amplitude
  bp: number; // bob phase
}
interface FlyInst {
  x: number;
  y: number;
  ax: number;
  ay: number;
  sx: number;
  sy: number;
  ph: number;
  bs: number; // blink speed
  bp: number; // blink phase
  sz: number;
}
interface BirdInst {
  ox: number;
  oy: number;
  fs: number; // flap speed
  ph: number;
  sz: number; // half wingspan
}
interface ShaftInst {
  off: number;
  sp: number; // rise cycles/s
  ph: number;
  wf: number; // width fraction of viewport
  a: number; // base alpha
}
interface FlockState {
  on: boolean;
  next: number; // spawn time (s)
  dir: number;
  x: number;
  y: number;
  sp: number;
  n: number;
}

interface Scene {
  /* staleness key */
  w: number;
  h: number;
  dpr: number;
  kPink: string;
  kViolet: string;
  kBg: string;
  reduced: boolean;
  rng: () => number;
  /* sprites + layout */
  sky: HTMLCanvasElement;
  sun: HTMLCanvasElement;
  sunX: number;
  sunY: number;
  shaft: HTMLCanvasElement;
  shaftW: number;
  shaftH: number;
  shafts: ShaftInst[];
  cloudC: HTMLCanvasElement[];
  cloudW: number[];
  cloudH: number[];
  far: CloudInst[];
  near: CloudInst[];
  flySprite: HTMLCanvasElement;
  flies: FlyInst[];
  birds: BirdInst[];
  flock: FlockState;
  birdCol: string;
}

function build(a: Ambient): Scene {
  const rng = seeded(0x5e17);
  const bgc = parseColor(a.colors["--bg"], [4, 6, 13]);
  const pink = parseColor(a.colors["--pink"], [255, 92, 200]);
  const violet = parseColor(a.colors["--violet"], [255, 138, 61]);
  const lum = (bgc[0] * 0.2126 + bgc[1] * 0.7152 + bgc[2] * 0.0722) / 255;
  const light = lum > 0.5;
  const reduced = prefersReducedMotion();

  /* Sky wash + horizon glow baked at the sun's position (1x). */
  const [sky, sg] = sprite(a.w, a.h, 1);
  const upper = mix(bgc, violet, light ? 0.08 : 0.12);
  const lower = mix(bgc, pink, light ? 0.12 : 0.17);
  const bottom = mix(bgc, pink, light ? 0.08 : 0.11);
  const vg = sg.createLinearGradient(0, 0, 0, a.h);
  vg.addColorStop(0, rgba(bgc, 1));
  vg.addColorStop(0.4, rgba(upper, 1));
  vg.addColorStop(0.72, rgba(lower, 1));
  vg.addColorStop(1, rgba(bottom, 1));
  sg.fillStyle = vg;
  sg.fillRect(0, 0, a.w, a.h);
  const sunX = a.w * 0.72;
  const sunY = a.h * 0.58;
  const R = Math.max(a.w, a.h);
  glow(sg, sunX, sunY, R * 0.42, SKY_GLOW, light ? 0.16 : 0.12);
  glow(sg, sunX, sunY + a.h * 0.04, R * 0.2, GOLD, light ? 0.1 : 0.08);

  /* Sun — layered radial gradients, warm white-gold core to transparent. */
  const [sun, un] = sprite(400, 400, 1);
  const boost = light ? 1.3 : 1;
  glow(un, 200, 200, 196, GOLD, 0.13 * boost);
  glow(un, 200, 200, 124, AMBER, 0.2 * boost);
  glow(un, 200, 200, 68, LIGHT_GOLD, 0.42 * boost);
  glow(un, 200, 200, 30, CORE, Math.min(1, 0.85 * boost));

  /* One light-shaft band: vertical soft stripe, faded at both ends. */
  const [shaft, hg] = sprite(512, 110, 1);
  const hv = hg.createLinearGradient(0, 0, 0, 110);
  hv.addColorStop(0, rgba(AMBER, 0));
  hv.addColorStop(0.5, rgba(AMBER, 0.55));
  hv.addColorStop(1, rgba(AMBER, 0));
  hg.fillStyle = hv;
  hg.fillRect(0, 0, 512, 110);
  const hmask = hg.createLinearGradient(0, 0, 512, 0);
  hmask.addColorStop(0, "rgba(0,0,0,0)");
  hmask.addColorStop(0.25, "rgba(0,0,0,1)");
  hmask.addColorStop(0.75, "rgba(0,0,0,1)");
  hmask.addColorStop(1, "rgba(0,0,0,0)");
  hg.globalCompositeOperation = "destination-in";
  hg.fillStyle = hmask;
  hg.fillRect(0, 0, 512, 110);
  hg.globalCompositeOperation = "source-over";

  const shafts: ShaftInst[] = [];
  for (let i = 0; i < 3; i++) {
    shafts.push({
      off: i / 3 + rng() * 0.25,
      sp: 0.009 + rng() * 0.007,
      ph: rng() * TAU,
      wf: 0.3 + rng() * 0.22,
      a: (light ? 0.075 : 0.05) * (0.8 + rng() * 0.4),
    });
  }

  /* Cloud sprite variants — ellipse clusters with gold-lit tops and mauve
     undersides (lit/shade passes clipped to the cloud via source-atop). */
  const cloudC: HTMLCanvasElement[] = [];
  const cloudW: number[] = [];
  const cloudH: number[] = [];
  const body: RGB = light ? [128, 94, 126] : [102, 76, 112];
  const under: RGB = light ? [98, 72, 104] : [72, 50, 88];
  for (let v = 0; v < 5; v++) {
    const cw = 230 + Math.round(rng() * 140);
    const ch = Math.round(cw * (0.3 + rng() * 0.12));
    const [cc, cg] = sprite(cw, ch, a.dpr);
    const n = 5 + Math.floor(rng() * 5);
    const pxs: number[] = [];
    const pys: number[] = [];
    const rxs: number[] = [];
    const rys: number[] = [];
    for (let i = 0; i < n; i++) {
      const mid = 1 - Math.abs(i / (n - 1) - 0.5) * 2; // bigger in the middle
      const rx = cw * (0.09 + 0.1 * mid) * (0.8 + rng() * 0.4);
      pxs.push(cw * (0.14 + 0.72 * (i / (n - 1))) + (rng() - 0.5) * cw * 0.05);
      pys.push(ch * (0.55 + rng() * 0.12));
      rxs.push(rx);
      rys.push(rx * (0.42 + rng() * 0.22));
    }
    for (let i = 0; i < n; i++) puff(cg, pxs[i], pys[i], rxs[i], rys[i], body, 0.5);
    cg.globalCompositeOperation = "source-atop";
    for (let i = 0; i < n; i++) {
      puff(cg, pxs[i] - rxs[i] * 0.1, pys[i] - rys[i] * 0.55, rxs[i] * 0.95, rys[i] * 0.8, LIT_TOP, 0.34);
    }
    for (let i = 0; i < n; i++) {
      puff(cg, pxs[i], pys[i] + rys[i] * 0.55, rxs[i] * 1.05, rys[i] * 0.6, under, 0.3);
    }
    cg.globalCompositeOperation = "source-over";
    cloudC.push(cc);
    cloudW.push(cw);
    cloudH.push(ch);
  }

  /* Cloud layout — two parallax depth layers, wrap-around drift. */
  const far: CloudInst[] = [];
  const near: CloudInst[] = [];
  const farN = a.mobile ? 3 : 4;
  const nearN = a.mobile ? 2 : 4;
  for (let i = 0; i < farN; i++) {
    far.push({
      v: Math.floor(rng() * cloudC.length),
      x: rng() * (a.w + 500) - 250,
      y: a.h * (0.1 + rng() * 0.4),
      s: 0.42 + rng() * 0.25,
      a: (light ? 0.14 : 0.1) * (0.75 + rng() * 0.5),
      sp: 3 + rng() * 4,
      bs: 0.04 + rng() * 0.06,
      ba: 4 + rng() * 7,
      bp: rng() * TAU,
    });
  }
  for (let i = 0; i < nearN; i++) {
    near.push({
      v: Math.floor(rng() * cloudC.length),
      x: rng() * (a.w + 500) - 250,
      y: a.h * (0.06 + rng() * 0.52),
      s: 0.85 + rng() * 0.55,
      a: (light ? 0.2 : 0.14) * (0.75 + rng() * 0.5),
      sp: 8 + rng() * 7,
      bs: 0.05 + rng() * 0.07,
      ba: 5 + rng() * 8,
      bp: rng() * TAU,
    });
  }

  /* Firefly glow sprite + bottom-third scatter. */
  const flyN = a.mobile ? 14 : 28;
  const flies: FlyInst[] = [];
  for (let i = 0; i < flyN; i++) {
    flies.push({
      x: rng() * a.w,
      y: a.h * (0.66 + rng() * 0.3),
      ax: 14 + rng() * 30,
      ay: 8 + rng() * 18,
      sx: 0.12 + rng() * 0.3,
      sy: 0.1 + rng() * 0.25,
      ph: rng() * TAU,
      bs: 0.5 + rng() * 1.3,
      bp: rng() * TAU,
      sz: 1.6 + rng() * 2.4,
    });
  }
  const [flySprite, fg] = sprite(48, 48, 2);
  glow(fg, 24, 24, 24, GOLD, 0.32);
  glow(fg, 24, 24, 12, [255, 230, 176], 0.85);
  glow(fg, 24, 24, 6, CORE, 0.95);

  /* Birds: 7 reusable slots, one flock at a time, ~every 30-60s. */
  const birds: BirdInst[] = [];
  for (let i = 0; i < 7; i++) birds.push({ ox: 0, oy: 0, fs: 6, ph: 0, sz: 6 });
  const flock: FlockState = { on: false, next: 8 + rng() * 10, dir: 1, x: 0, y: 0, sp: 0, n: 0 };

  return {
    w: a.w,
    h: a.h,
    dpr: a.dpr,
    kPink: a.colors["--pink"],
    kViolet: a.colors["--violet"],
    kBg: a.colors["--bg"],
    reduced,
    rng,
    sky,
    sun,
    sunX,
    sunY,
    shaft,
    shaftW: 512,
    shaftH: 110,
    shafts,
    cloudC,
    cloudW,
    cloudH,
    far,
    near,
    flySprite,
    flies,
    birds,
    flock,
    birdCol: light ? "rgba(74,44,66,0.6)" : "rgba(52,28,44,0.62)",
  };
}

function drawClouds(a: Ambient, s: Scene, list: CloudInst[], t: number): void {
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    const sw = s.cloudW[c.v] * c.s;
    const sh = s.cloudH[c.v] * c.s;
    if (!s.reduced) {
      c.x += c.sp * a.dt;
      if (c.x > a.w + 20) c.x = -sw;
      else if (c.x < -sw - 20) c.x = a.w - 20;
    }
    const y = c.y + Math.sin(t * c.bs + c.bp) * c.ba;
    a.ctx.globalAlpha = c.a;
    a.ctx.drawImage(s.cloudC[c.v], c.x, y, sw, sh);
  }
}

export default function SunsetWorld() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let scene: Scene | null = null;

    const draw = (a: Ambient): void => {
      let s = scene;
      if (
        !s ||
        s.w !== a.w ||
        s.h !== a.h ||
        s.dpr !== a.dpr ||
        s.kPink !== a.colors["--pink"] ||
        s.kViolet !== a.colors["--violet"] ||
        s.kBg !== a.colors["--bg"]
      ) {
        s = build(a);
        scene = s;
      }
      const ctx = a.ctx;
      const t = a.t;

      /* 1 — sky wash (opaque, doubles as the frame clear) */
      ctx.globalAlpha = 1;
      ctx.drawImage(s.sky, 0, 0, a.w, a.h);

      /* 2 — sun, breathing scale + alpha */
      const breathe = s.reduced ? 0 : Math.sin(t * 0.21);
      const d = Math.max(a.w, a.h) * 0.5 * (1 + 0.035 * breathe);
      ctx.globalAlpha = s.reduced ? 1 : 0.86 + 0.14 * Math.sin(t * 0.157);
      ctx.drawImage(s.sun, s.sunX - d / 2, s.sunY - d / 2, d, d);

      /* 3 — light shafts rising from the sun area */
      for (let i = 0; i < s.shafts.length; i++) {
        const b = s.shafts[i];
        const prog = s.reduced ? b.off : (t * b.sp + b.off) % 1;
        const sw = a.w * b.wf;
        const sh = sw * (s.shaftH / s.shaftW);
        const y = a.h * 0.72 - prog * a.h * 0.55 - sh / 2;
        ctx.globalAlpha = b.a * (s.reduced ? 0.8 : 0.65 + 0.35 * Math.sin(t * 0.13 + b.ph));
        ctx.drawImage(s.shaft, s.sunX - sw / 2 + Math.sin(t * 0.06 + b.ph) * a.w * 0.015, y, sw, sh);
      }

      /* 4 + 5 — clouds, far before near (parallax: far slower + fainter) */
      drawClouds(a, s, s.far, t);
      drawClouds(a, s, s.near, t);

      /* 6 — bird flocks */
      const f = s.flock;
      if (!s.reduced) {
        if (!f.on && t >= f.next) {
          f.on = true;
          f.dir = s.rng() < 0.5 ? 1 : -1;
          f.n = 3 + Math.floor(s.rng() * 5); // 3..7 birds
          f.sp = (0.05 + s.rng() * 0.025) * a.w;
          f.y = a.h * (0.16 + s.rng() * 0.4);
          f.x = f.dir === 1 ? -140 : a.w + 140;
          for (let i = 0; i < f.n; i++) {
            const b = s.birds[i];
            if (i === 0) {
              b.ox = 0;
              b.oy = 0;
            } else {
              const rank = Math.ceil(i / 2);
              const side = i % 2 === 0 ? -1 : 1;
              b.ox = side * rank * (14 + s.rng() * 8);
              b.oy = rank * (9 + s.rng() * 6) + (s.rng() - 0.5) * 10;
            }
            b.fs = 5.5 + s.rng() * 2.5;
            b.ph = s.rng() * TAU;
            b.sz = 4.5 + s.rng() * 3;
          }
        }
        if (f.on) {
          f.x += f.dir * f.sp * a.dt;
          if ((f.dir === 1 && f.x > a.w + 160) || (f.dir === -1 && f.x < -160)) {
            f.on = false;
            f.next = t + 30 + s.rng() * 30;
          }
        }
      }
      if (f.on) {
        ctx.strokeStyle = s.birdCol;
        ctx.lineCap = "round";
        for (let i = 0; i < f.n; i++) {
          const b = s.birds[i];
          const px = f.x + b.ox;
          const py = f.y + b.oy + Math.sin(px * 0.006 + b.ph) * 22;
          const wing = Math.sin(t * b.fs + b.ph) * b.sz * 0.85;
          const fade = Math.min(1, Math.max(0, Math.min(px + 70, a.w + 70 - px)) / 120);
          ctx.globalAlpha = fade;
          ctx.lineWidth = Math.max(1, b.sz * 0.22);
          ctx.beginPath();
          ctx.moveTo(px - b.sz, py - wing);
          ctx.quadraticCurveTo(px - b.sz * 0.5, py - wing * 0.25, px, py + wing * 0.18);
          ctx.quadraticCurveTo(px + b.sz * 0.5, py - wing * 0.25, px + b.sz, py - wing);
          ctx.stroke();
        }
      }

      /* 7 — fireflies: sine wander + individual blink */
      for (let i = 0; i < s.flies.length; i++) {
        const p = s.flies[i];
        const x = p.x + (s.reduced ? 0 : Math.sin(t * p.sx + p.ph) * p.ax);
        const y = p.y + (s.reduced ? 0 : Math.cos(t * p.sy + p.ph * 1.7) * p.ay);
        const blink = 0.5 + 0.5 * Math.sin(t * p.bs + p.bp);
        ctx.globalAlpha = (0.1 + 0.9 * blink * blink) * 0.5;
        const dsz = p.sz * 5;
        ctx.drawImage(s.flySprite, x - dsz / 2, y - dsz / 2, dsz, dsz);
      }

      ctx.globalAlpha = 1;
    };

    return runAmbientCanvas(canvas, ["--pink", "--violet", "--bg"], draw, { fps: 30 });
  }, []);

  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" />;
}
