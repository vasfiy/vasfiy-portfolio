"use client";

/* Ocean world — the [data-theme="ocean"] ambient scene.
   One full-viewport canvas, animated by runAmbientCanvas at 30fps.

   Paint order (back → front):
     1. sky→sea wash gradient (theme-adaptive via --cyan)
     2. whale silhouette at depth (mistiest layer, slow tail sway)
     3. submarine silhouette + spinning propeller (+ its bubble trail)
     4. schools of small fish (wander, occasional direction flips)
     5. wave band 1 — the horizon — with a --cyan crest glint
     6. wave band 2
     7. wave band 3 (nearest, darkest indigo)
     8. rising bubbles (wobble up, pop into a tiny ring at the waterline)
     9. ship rocking on the horizon, drifting a few px

   Perf contract: every Path2D, gradient, rgba string and particle lives in
   a state object built once per resize; the frame loop only mutates numbers
   and re-fills cached paths — zero per-frame allocation. Transient crossers
   (whale, submarine) launch on elapsed loop time, so under reduced motion
   (engine paints exactly one static frame with dt = 0, t frozen) they never
   appear, while the waves, fish, bubbles and ship still read as one
   composed still. */

import { useEffect, useRef } from "react";
import { runAmbientCanvas, seeded, type Ambient } from "./shared";
import { prefersReducedMotion } from "./rm";
import styles from "./ocean.module.css";

const TAU = Math.PI * 2;

interface Band {
  baseY: number;
  amp: number;
  cycles: number;
  phase: number;
  speed: number;
  bobAmp: number;
  bobFreq: number;
  bobPh: number;
  lambda: number;
  fill: Path2D;
  crest: Path2D;
  fillStyle: string;
  crestStyle: string;
  lw: number;
}

interface Bubble {
  mode: 0 | 1 | 2; // 0 waiting to spawn, 1 rising, 2 popping
  x: number;
  y: number;
  bx: number; // wobble pivot
  r: number;
  vy: number;
  wa: number; // wobble amplitude (px)
  wf: number; // wobble frequency (rad per px)
  ph: number;
  t: number; // spawn delay / pop countdown
}

interface Fish {
  ox: number;
  oy: number;
  sz: number;
  ph: number;
}

interface School {
  x: number;
  cy: number;
  bcy: number;
  dir: number;
  sp: number;
  flip: number;
  ph: number;
  n: number;
  fish: Fish[];
}

interface Mote {
  on: boolean;
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
}

interface Crosser {
  on: boolean;
  x: number;
  y: number;
  dir: number;
  sp: number;
  next: number; // elapsed seconds when the next pass may start
  tail: boolean; // remembers heading for the next pass
  len: number;
}

interface St {
  w: number;
  h: number;
  cyan: string;
  bg: string;
  reduced: boolean;
  wash: CanvasGradient; // built by layout() before first paint
  bands: Band[];
  fishPath: Path2D;
  whaleBody: Path2D;
  whaleTail: Path2D;
  subPath: Path2D;
  shipPath: Path2D;
  whale: Crosser;
  sub: Crosser;
  shipLen: number;
  trail: Mote[];
  trailT: number;
  trailI: number;
  bubbles: Bubble[];
  bubbleN: number; // active pool size (halved on mobile)
  schools: School[];
  ramp: string[]; // quantized bubble-alpha fill styles
  whaleFill: string;
  subFill: string;
  fishFill: string;
  shipFill: string;
}

/* ---------- cached geometry (unit space: length 1, nose pointing +x) ---- */

function buildFish(): Path2D {
  const p = new Path2D();
  p.moveTo(0.5, 0);
  p.quadraticCurveTo(0.12, -0.15, -0.16, -0.05);
  p.lineTo(-0.48, -0.16);
  p.quadraticCurveTo(-0.36, 0, -0.48, 0.16);
  p.lineTo(-0.16, 0.05);
  p.quadraticCurveTo(0.12, 0.15, 0.5, 0);
  p.closePath();
  return p;
}

function buildWhaleBody(): Path2D {
  const p = new Path2D();
  p.moveTo(0.5, 0);
  p.bezierCurveTo(0.34, -0.14, 0.02, -0.17, -0.2, -0.1);
  p.bezierCurveTo(-0.3, -0.07, -0.37, -0.04, -0.42, -0.02);
  p.lineTo(-0.42, 0.02);
  p.bezierCurveTo(-0.3, 0.07, -0.1, 0.14, 0.1, 0.12);
  p.bezierCurveTo(0.26, 0.1, 0.4, 0.06, 0.5, 0);
  p.closePath();
  // pectoral fin
  p.moveTo(0.1, 0.06);
  p.quadraticCurveTo(0.02, 0.16, -0.06, 0.19);
  p.quadraticCurveTo(0, 0.1, 0.06, 0.05);
  p.closePath();
  return p;
}

function buildWhaleTail(): Path2D {
  // fluke, pivot at (0,0) = tail stock
  const p = new Path2D();
  p.moveTo(0, 0);
  p.quadraticCurveTo(-0.08, -0.02, -0.15, -0.11);
  p.quadraticCurveTo(-0.09, -0.02, -0.07, 0);
  p.quadraticCurveTo(-0.09, 0.02, -0.15, 0.11);
  p.quadraticCurveTo(-0.08, 0.02, 0, 0);
  p.closePath();
  return p;
}

function buildSub(): Path2D {
  const p = new Path2D();
  // hull
  p.moveTo(-0.5, 0);
  p.bezierCurveTo(-0.5, -0.1, -0.34, -0.13, 0, -0.13);
  p.bezierCurveTo(0.28, -0.13, 0.46, -0.09, 0.5, 0);
  p.bezierCurveTo(0.46, 0.09, 0.28, 0.13, 0, 0.13);
  p.bezierCurveTo(-0.34, 0.13, -0.5, 0.1, -0.5, 0);
  p.closePath();
  // conning tower
  p.moveTo(-0.1, -0.12);
  p.lineTo(-0.08, -0.24);
  p.lineTo(0.1, -0.24);
  p.lineTo(0.14, -0.12);
  p.closePath();
  // periscope
  p.moveTo(0.02, -0.24);
  p.lineTo(0.02, -0.34);
  p.lineTo(0.07, -0.34);
  p.lineTo(0.07, -0.31);
  p.lineTo(0.045, -0.31);
  p.lineTo(0.045, -0.24);
  p.closePath();
  // propeller shaft
  p.moveTo(-0.5, -0.015);
  p.lineTo(-0.56, -0.015);
  p.lineTo(-0.56, 0.015);
  p.lineTo(-0.5, 0.015);
  p.closePath();
  return p;
}

function buildShip(): Path2D {
  const p = new Path2D();
  // hull (waterline along y = 0)
  p.moveTo(-0.5, 0);
  p.lineTo(-0.38, 0.13);
  p.lineTo(0.34, 0.13);
  p.lineTo(0.5, 0);
  p.closePath();
  // deckhouse
  p.moveTo(-0.16, -0.11);
  p.lineTo(-0.16, 0);
  p.lineTo(0.18, 0);
  p.lineTo(0.18, -0.11);
  p.closePath();
  // mast
  p.moveTo(0.02, -0.46);
  p.lineTo(0.05, -0.46);
  p.lineTo(0.05, -0.11);
  p.lineTo(0.02, -0.11);
  p.closePath();
  return p;
}

/* ---------- small helpers ---------------------------------------------- */

function hexRgb(s: string, fb: readonly [number, number, number]): [number, number, number] {
  const v = s.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  m = /^#([0-9a-f]{3})$/i.exec(v);
  if (m) {
    const c = m[1];
    return [
      parseInt(c[0] + c[0], 16),
      parseInt(c[1] + c[1], 16),
      parseInt(c[2] + c[2], 16),
    ];
  }
  return [fb[0], fb[1], fb[2]];
}

function buildRamp(): string[] {
  const r: string[] = new Array(11);
  for (let i = 0; i <= 10; i++) r[i] = `rgba(206,240,255,${(i / 10).toFixed(2)})`;
  return r;
}

function alphaIdx(a: number): number {
  const q = (a * 10 + 0.5) | 0;
  return q < 0 ? 0 : q > 10 ? 10 : q;
}

/** Waterline height of a band at screen x, including its scroll shift and bob. */
function surfaceY(s: St, b: Band, t: number, x: number): number {
  const shift = (t * b.speed) % b.lambda;
  const bob = b.bobAmp * Math.sin(t * b.bobFreq + b.bobPh);
  return b.baseY + bob + b.amp * Math.sin((TAU * b.cycles * (x + shift)) / s.w + b.phase);
}

/* ---------- state ------------------------------------------------------- */

function initState(reduced: boolean): St {
  const rnd = seeded(9001);
  const trail: Mote[] = [];
  for (let i = 0; i < 12; i++) trail.push({ on: false, x: 0, y: 0, r: 0, vx: 0, vy: 0, a: 0 });
  const bubbles: Bubble[] = [];
  for (let i = 0; i < 54; i++) {
    const pre = i < 22; // a few already mid-rise so the static frame isn't empty
    bubbles.push({
      mode: pre ? 1 : 0,
      x: 0,
      bx: rnd() * 1600,
      y: pre ? 240 + rnd() * 560 : 0,
      r: 0.9 + rnd() * 2.3,
      vy: 16 + rnd() * 26,
      wa: 3 + rnd() * 10,
      wf: 0.008 + rnd() * 0.02,
      ph: rnd() * TAU,
      t: 0.5 + rnd() * 4,
    });
  }
  return {
    w: -1,
    h: -1,
    cyan: "\u0000",
    bg: "\u0000",
    reduced,
    wash: null as unknown as CanvasGradient,
    bands: [],
    fishPath: buildFish(),
    whaleBody: buildWhaleBody(),
    whaleTail: buildWhaleTail(),
    subPath: buildSub(),
    shipPath: buildShip(),
    whale: { on: false, x: 0, y: 0, dir: 1, sp: 0, next: 18 + Math.random() * 16, tail: false, len: 200 },
    sub: { on: false, x: 0, y: 0, dir: 1, sp: 0, next: 40 + Math.random() * 30, tail: true, len: 140 },
    shipLen: 66,
    trail,
    trailT: 0,
    trailI: 0,
    bubbles,
    bubbleN: 54,
    schools: [],
    ramp: buildRamp(),
    whaleFill: "rgba(106,148,178,0.38)", // misty — furthest away
    subFill: "rgba(64,108,140,0.52)",
    fishFill: "rgba(58,100,132,0.60)",
    shipFill: "rgba(44,84,116,0.64)",
  };
}

/* ---------- layout (per resize only — allocations allowed here) --------- */

function layout(s: St, a: Ambient): void {
  const w = a.w;
  const h = a.h;
  const mob = a.mobile;
  s.w = w;
  s.h = h;
  s.cyan = a.colors["--cyan"];
  s.bg = a.colors["--bg"];
  const rnd = seeded(77413);
  const cl = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
  const [cr, cg, cb] = hexRgb(s.cyan, [34, 211, 238]);

  // --- wave bands, far → near (sine is periodic across w, so horizontal
  //     scroll wraps seamlessly; path spans w + one wavelength) ---
  s.bands.length = 0;
  const defs = [
    { fy: 0.655, af: 0.8, cyc: 3, sp: 9, fill: "rgba(38,120,152,0.24)", crest: `rgba(${cr},${cg},${cb},0.32)`, lw: 1.25 },
    { fy: 0.78, af: 1.0, cyc: 2, sp: 6, fill: "rgba(26,88,130,0.33)", crest: "rgba(206,240,255,0.10)", lw: 1 },
    { fy: 0.905, af: 1.15, cyc: 3, sp: 12, fill: "rgba(14,54,98,0.46)", crest: "rgba(206,240,255,0.07)", lw: 1 },
  ];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const amp = cl(h * 0.032 * d.af, 14 * d.af, 30 * d.af);
    const baseY = h * d.fy;
    const lambda = w / d.cyc;
    const phase = rnd() * TAU;
    const step = 9;
    const n = Math.ceil((w + lambda) / step);
    const fill = new Path2D();
    const crest = new Path2D();
    const y0 = baseY + amp * Math.sin(phase);
    fill.moveTo(0, y0);
    crest.moveTo(0, y0);
    for (let k = 1; k <= n; k++) {
      const x = k === n ? w + lambda : k * step;
      const y = baseY + amp * Math.sin((TAU * d.cyc * x) / w + phase);
      fill.lineTo(x, y);
      crest.lineTo(x, y);
    }
    fill.lineTo(w + lambda, h + 80);
    fill.lineTo(0, h + 80);
    fill.closePath();
    s.bands.push({
      baseY,
      amp,
      cycles: d.cyc,
      phase,
      speed: d.sp,
      bobAmp: 3 + rnd() * 2.5,
      bobFreq: 0.25 + rnd() * 0.3,
      bobPh: rnd() * TAU,
      lambda,
      fill,
      crest,
      fillStyle: d.fill,
      crestStyle: d.crest,
      lw: d.lw,
    });
  }

  // --- sky → sea wash (kept faint up top so page content stays readable) ---
  const horizon = cl(s.bands[0].baseY / h, 0.2, 0.9);
  const wash = a.ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, `rgba(${cr},${cg},${cb},0.02)`);
  wash.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.06)`);
  wash.addColorStop(horizon, `rgba(${cr},${cg},${cb},0.11)`);
  wash.addColorStop(1, "rgba(7,32,56,0.42)");
  s.wash = wash;

  // --- fish schools ---
  s.schools.length = 0;
  const nSchools = mob ? 2 : 3;
  for (let i = 0; i < nSchools; i++) {
    const n = mob ? 5 + ((rnd() * 3) | 0) : 6 + ((rnd() * 4) | 0);
    const fish: Fish[] = [];
    for (let j = 0; j < n; j++) {
      fish.push({
        ox: (rnd() * 2 - 1) * 36,
        oy: (rnd() * 2 - 1) * 14,
        sz: (4.5 + rnd() * 4) * (mob ? 0.8 : 1),
        ph: rnd() * TAU,
      });
    }
    s.schools.push({
      x: rnd() * w,
      cy: 0,
      bcy: h * (0.3 + rnd() * 0.26),
      dir: rnd() < 0.5 ? -1 : 1,
      sp: 12 + rnd() * 14,
      flip: 6 + rnd() * 10,
      ph: rnd() * TAU,
      n,
      fish,
    });
  }

  // --- silhouette sizes (crosser schedules persist across resizes) ---
  s.whale.len = Math.min(w * 0.24, 330);
  s.sub.len = Math.min(w * 0.15, 200);
  s.shipLen = mob ? 44 : 66;
  s.bubbleN = mob ? 27 : 54;
}

/* ---------- paint (per frame — zero allocation) -------------------------- */

function paint(s: St, a: Ambient): void {
  const { ctx } = a;
  const t = a.t;
  const dt = a.dt;
  const w = s.w;
  const h = s.h;
  const b0 = s.bands[0];
  const b1 = s.bands[1];
  const b2 = s.bands[2];

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = s.wash;
  ctx.fillRect(0, 0, w, h);

  // whale — deepest, slowest
  const wh = s.whale;
  if (!wh.on) {
    if (!s.reduced && t >= wh.next) {
      wh.tail = !wh.tail;
      wh.dir = wh.tail ? 1 : -1;
      wh.x = wh.dir > 0 ? -wh.len * 0.7 : w + wh.len * 0.7;
      wh.y = h * (0.54 + Math.random() * 0.08);
      wh.sp = (w + wh.len * 1.4) / 40;
      wh.on = true;
    }
  } else {
    wh.x += wh.dir * wh.sp * dt;
    if ((wh.dir > 0 && wh.x - wh.len > w) || (wh.dir < 0 && wh.x + wh.len < 0)) {
      wh.on = false;
      wh.next = t + 70 + Math.random() * 50;
    } else {
      ctx.save();
      ctx.translate(wh.x, wh.y + Math.sin(t * 0.5) * 7);
      ctx.scale(wh.dir * wh.len, wh.len);
      ctx.fillStyle = s.whaleFill;
      ctx.fill(s.whaleBody);
      ctx.translate(-0.42, 0);
      ctx.rotate(Math.sin(t * 1.15) * 0.16);
      ctx.fill(s.whaleTail);
      ctx.restore();
    }
  }

  // submarine — rarer, shallower, with a propeller bubble trail
  const su = s.sub;
  if (!su.on) {
    if (!s.reduced && t >= su.next) {
      su.tail = !su.tail;
      su.dir = su.tail ? 1 : -1;
      su.x = su.dir > 0 ? -su.len * 0.7 : w + su.len * 0.7;
      su.y = h * (0.42 + Math.random() * 0.07);
      su.sp = (w + su.len * 1.4) / 52;
      su.on = true;
    }
  } else {
    su.x += su.dir * su.sp * dt;
    if ((su.dir > 0 && su.x - su.len > w) || (su.dir < 0 && su.x + su.len < 0)) {
      su.on = false;
      su.next = t + 90 + Math.random() * 60;
    } else {
      s.trailT -= dt;
      if (s.trailT <= 0) {
        s.trailT = 0.1;
        const m = s.trail[s.trailI];
        s.trailI = (s.trailI + 1) % s.trail.length;
        m.on = true;
        m.x = su.x - su.dir * su.len * 0.58 + (Math.random() * 6 - 3);
        m.y = su.y + (Math.random() * 8 - 4);
        m.vx = -su.dir * 12;
        m.vy = -6 - Math.random() * 8;
        m.r = 0.9 + Math.random() * 1.6;
        m.a = 0.5;
      }
      ctx.save();
      ctx.translate(su.x, su.y + Math.sin(t * 0.6) * 5);
      ctx.scale(su.dir * su.len, su.len);
      ctx.fillStyle = s.subFill;
      ctx.fill(s.subPath);
      // propeller: circle squashed by |sin| reads as a spinning blade
      ctx.translate(-0.58, 0);
      ctx.scale(1, Math.sin(t * 9));
      ctx.beginPath();
      ctx.arc(0, 0, 0.07, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  // trail dissipates on its own, even after the sub is gone
  for (let i = 0; i < s.trail.length; i++) {
    const m = s.trail[i];
    if (!m.on) continue;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.vy -= 7 * dt;
    m.a -= 0.3 * dt;
    if (m.a <= 0) {
      m.on = false;
      continue;
    }
    ctx.fillStyle = s.ramp[alphaIdx(m.a)];
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, TAU);
    ctx.fill();
  }

  // fish schools — wander, drift, flip direction now and then
  for (let i = 0; i < s.schools.length; i++) {
    const sc = s.schools[i];
    sc.flip -= dt;
    if (sc.flip <= 0) {
      sc.dir *= -1;
      sc.flip = 8 + Math.random() * 9;
    }
    sc.x += sc.dir * sc.sp * dt;
    const mrg = 80;
    if (sc.dir > 0 && sc.x > w + mrg) sc.x = -mrg;
    else if (sc.dir < 0 && sc.x < -mrg) sc.x = w + mrg;
    sc.cy = sc.bcy + Math.sin(t * 0.13 + sc.ph) * h * 0.025;
    ctx.fillStyle = s.fishFill;
    for (let j = 0; j < sc.n; j++) {
      const f = sc.fish[j];
      ctx.save();
      ctx.translate(sc.x + sc.dir * f.ox, sc.cy + f.oy + Math.sin(t * 1.7 + f.ph) * 2.5);
      ctx.rotate(Math.sin(t * 2.2 + f.ph) * 0.14);
      ctx.scale(f.sz * sc.dir, f.sz);
      ctx.fill(s.fishPath);
      ctx.restore();
    }
  }

  // wave bands — far → near; each is a cached Path2D scrolled and bobbed
  for (let i = 0; i < 3; i++) {
    const b = s.bands[i];
    ctx.save();
    ctx.translate(-(t * b.speed) % b.lambda, b.bobAmp * Math.sin(t * b.bobFreq + b.bobPh));
    ctx.fillStyle = b.fillStyle;
    ctx.fill(b.fill);
    ctx.lineWidth = b.lw;
    ctx.strokeStyle = b.crestStyle;
    ctx.stroke(b.crest);
    ctx.restore();
  }

  // bubbles — rise from the deep, wobble, pop into a ring at the waterline
  for (let i = 0; i < s.bubbleN; i++) {
    const b = s.bubbles[i];
    let r = b.r;
    let al: number;
    if (b.mode === 0) {
      b.t -= dt;
      if (b.t > 0) continue;
      b.mode = 1;
      b.bx = Math.random() * w;
      b.y = h + 6;
      b.r = 0.9 + Math.random() * 2.3;
      b.vy = 16 + Math.random() * 26;
      b.wa = 3 + Math.random() * 10;
      b.wf = 0.008 + Math.random() * 0.02;
      b.ph = Math.random() * TAU;
      al = 0;
    } else if (b.mode === 1) {
      b.y -= b.vy * dt;
      if (b.bx > w) b.bx = Math.random() * w; // viewport shrank under us
      b.x = b.bx + Math.sin(b.y * b.wf + b.ph) * b.wa;
      if (b.y <= surfaceY(s, b0, t, b.x) + 3) {
        b.mode = 2;
        b.t = 0.16;
      }
      const fi = (h - b.y) / 36; // fade in near the seabed
      const sf = (b.y - b0.baseY) / 70; // fade out toward the surface
      al =
        0.4 *
        (fi < 0 ? 0 : fi > 1 ? 1 : fi) *
        (sf < 0 ? 0 : sf > 1 ? 1 : sf);
    } else {
      b.t -= dt;
      if (b.t <= 0) {
        b.mode = 0;
        b.t = 1 + Math.random() * 3;
        continue;
      }
      r = b.r * (1 + (0.16 - b.t) * 5);
      al = (b.t / 0.16) * 0.35;
    }
    ctx.fillStyle = s.ramp[alphaIdx(al)];
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, TAU);
    ctx.fill();
  }

  // ship — moored on the horizon band, rocking with the local wave slope
  const sl = s.shipLen;
  const sx = w * 0.24 + Math.sin(t * 0.05) * 12;
  const surf = surfaceY(s, b0, t, sx);
  const shift0 = (t * b0.speed) % b0.lambda;
  const slope =
    ((b0.amp * TAU * b0.cycles) / w) *
    Math.cos((TAU * b0.cycles * (sx + shift0)) / w + b0.phase);
  const ang = Math.atan(slope) * 0.8 + Math.sin(t * 0.7) * 0.02;
  ctx.save();
  ctx.translate(sx, surf - sl * 0.02);
  ctx.rotate(ang);
  ctx.scale(sl, sl);
  ctx.fillStyle = s.shipFill;
  ctx.fill(s.shipPath);
  ctx.restore();
}

/* ---------- component ---------------------------------------------------- */

export default function OceanWorld() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const state = initState(prefersReducedMotion());
    return runAmbientCanvas(
      canvas,
      ["--cyan", "--bg"],
      (a) => {
        if (
          state.w !== a.w ||
          state.h !== a.h ||
          state.cyan !== a.colors["--cyan"] ||
          state.bg !== a.colors["--bg"]
        ) {
          layout(state, a);
        }
        paint(state, a);
      },
      { fps: 30 },
    );
  }, []);
  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" />;
}
