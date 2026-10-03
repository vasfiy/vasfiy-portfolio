"use client";

/* Cyber world — neon circuit / synthwave ambience.
   Distinct from the matrix world (which owns code rain): this one owns
   geometry, pulses and light.

   Scene, back to front:
     1. perspective grid floor (cached verticals + sliding horizontal rows)
     2. data packets riding the grid verticals toward the viewer
     3. circuit-node constellation (cached traces + diamonds)
     4. node glows + pulses travelling node-to-node along the traces
     5. slow scanline sweep; rare 120ms glitch shimmer on the traces

   Perf: static geometry (grid + constellation) is painted once per resize
   onto two offscreen canvases and blitted each frame; only packets, rows,
   pulses, scanline and glitch animate above them. Glow sprites and the
   scanline gradient are cached bitmaps. All pools are pre-allocated and
   mutated in place. Reduced motion: one static frame, no animation. */

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./rm";
import { runAmbientCanvas, seeded, type Ambient } from "./shared";
import styles from "./cyber.module.css";

type RGB = [number, number, number];

interface Pt {
  x: number;
  y: number;
}

interface Edge {
  p: Float32Array; // ax,ay, elbowx,elbowy, bx,by (circuit-board elbow path)
  cum: Float32Array; // cumulative length at each joint
  len: number;
  a: number;
  b: number;
}

interface Packet {
  lane: number; // grid vertical index
  v: number; // depth: 1 = horizon, 0 = viewer
  speed: number; // depth units / s (negative = receding)
  len: number; // dash length in px
  col: number; // 0 cyan, 1 pink, 2 violet
}

interface Pulse {
  on: boolean;
  edge: number;
  from: 0 | 1; // 0: a->b, 1: b->a
  s: number; // 0..1 along the edge
  speed: number; // s units / s
  hops: number; // remaining hops after this edge
  col: number;
}

interface Band {
  y: number;
  h: number;
  dx: number;
  split: boolean;
}

/* ---- pre-allocated state (mutated in place, never reallocated per frame) ---- */

const C = {
  cyan: [0, 229, 255] as RGB,
  violet: [124, 92, 255] as RGB,
  pink: [255, 92, 200] as RGB,
  bg: [4, 6, 13] as RGB,
  light: false,
};

const MAX_NODES = 26;
const MAX_PACKETS = 10;
const MAX_PULSES = 3;
const MAX_ROWS = 9;
const MAX_BANDS = 3;

const G = {
  w: 0,
  h: 0,
  horizon: 0,
  vanX: 0,
  vertX: [] as number[], // bottom-edge x of each grid vertical
  rows: new Float32Array(MAX_ROWS), // per-row phase
  rowCount: 0,
  rowExp: 2.6, // perspective compression of the floor
  rowSpeed: 0.03, // rows slide toward the viewer, full run ~33s
  nodeN: 0,
  nx: new Float32Array(MAX_NODES),
  ny: new Float32Array(MAX_NODES),
  nr: new Float32Array(MAX_NODES),
  hub: new Uint8Array(MAX_NODES),
  glow: new Float32Array(MAX_NODES),
  glowCol: new Uint8Array(MAX_NODES),
  edges: [] as Edge[],
  adj: [] as number[][],
};

const packets: Packet[] = Array.from({ length: MAX_PACKETS }, () => ({
  lane: 0,
  v: 1,
  speed: 0.1,
  len: 18,
  col: 0,
}));
let packetCount = 0;

const pulses: Pulse[] = Array.from({ length: MAX_PULSES }, () => ({
  on: false,
  edge: 0,
  from: 0,
  s: 0,
  speed: 1,
  hops: 0,
  col: 0,
}));

const bands: Band[] = Array.from({ length: MAX_BANDS }, () => ({
  y: 0,
  h: 2,
  dx: 3,
  split: false,
}));

/* event schedule (seconds since mount) */
const T = {
  nextPulse: 2,
  nextScan: 9,
  scanStart: -10,
  nextGlitch: 14,
  glitchStart: -10,
  colorCheck: 0,
};

/* cached bitmaps, rebuilt only on resize / token change */
let cacheGrid: HTMLCanvasElement | null = null;
let cacheNet: HTMLCanvasElement | null = null;
let scanBand: HTMLCanvasElement | null = null;
const glowSprite: (HTMLCanvasElement | null)[] = [null, null, null];

let reduced = false;
const pt: Pt = { x: 0, y: 0 };
const pt2: Pt = { x: 0, y: 0 };

/* ---- small helpers ---- */

function rgba(c: RGB, a: number): string {
  return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(3) + ")";
}

function parseCol(s: string | undefined, fb: RGB): RGB {
  if (!s) return fb;
  const t = s.trim().toLowerCase();
  if (t.charAt(0) === "#") {
    const hx = t.slice(1);
    if (hx.length === 6) {
      return [
        parseInt(hx.slice(0, 2), 16),
        parseInt(hx.slice(2, 4), 16),
        parseInt(hx.slice(4, 6), 16),
      ];
    }
    if (hx.length === 3) {
      return [
        parseInt(hx.charAt(0) + hx.charAt(0), 16),
        parseInt(hx.charAt(1) + hx.charAt(1), 16),
        parseInt(hx.charAt(2) + hx.charAt(2), 16),
      ];
    }
  }
  const n = t.match(/\d+(\.\d+)?%?/g);
  if (n && n.length >= 3) {
    const p = (i: number): number => {
      const v = n[i];
      const f = parseFloat(v);
      const out = v.endsWith("%") ? Math.round(f * 2.55) : Math.round(f);
      return Math.max(0, Math.min(255, out));
    };
    return [p(0), p(1), p(2)];
  }
  return fb;
}

function readColors(): boolean {
  if (typeof document === "undefined") return false;
  const cs = getComputedStyle(document.documentElement);
  const cy = parseCol(cs.getPropertyValue("--cyan"), C.cyan);
  const vi = parseCol(cs.getPropertyValue("--violet"), C.violet);
  const pk = parseCol(cs.getPropertyValue("--pink"), C.pink);
  const bg = parseCol(cs.getPropertyValue("--bg"), C.bg);
  const changed =
    cy[0] !== C.cyan[0] || cy[1] !== C.cyan[1] || cy[2] !== C.cyan[2] ||
    vi[0] !== C.violet[0] || vi[1] !== C.violet[1] || vi[2] !== C.violet[2] ||
    pk[0] !== C.pink[0] || pk[1] !== C.pink[1] || pk[2] !== C.pink[2] ||
    bg[0] !== C.bg[0] || bg[1] !== C.bg[1] || bg[2] !== C.bg[2];
  C.cyan = cy;
  C.violet = vi;
  C.pink = pk;
  C.bg = bg;
  C.light = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255 > 0.5;
  return changed;
}

function makeLayer(
  w: number,
  h: number,
  dpr: number,
): { cv: HTMLCanvasElement; x: CanvasRenderingContext2D } | null {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.floor(w * dpr));
  cv.height = Math.max(1, Math.floor(h * dpr));
  const x = cv.getContext("2d");
  if (!x) return null;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, x };
}

function makeGlow(color: RGB): HTMLCanvasElement | null {
  const cv = document.createElement("canvas");
  cv.width = 96;
  cv.height = 96;
  const x = cv.getContext("2d");
  if (!x) return null;
  const g = x.createRadialGradient(48, 48, 0, 48, 48, 48);
  g.addColorStop(0, rgba([255, 255, 255], 0.9));
  g.addColorStop(0.25, rgba(color, 0.55));
  g.addColorStop(1, rgba(color, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, 96, 96);
  return cv;
}

function makeScanBand(): HTMLCanvasElement | null {
  const cv = document.createElement("canvas");
  cv.width = 8;
  cv.height = 180;
  const x = cv.getContext("2d");
  if (!x) return null;
  const g = x.createLinearGradient(0, 0, 0, 180);
  g.addColorStop(0, rgba(C.light ? C.violet : C.cyan, 0));
  g.addColorStop(0.5, rgba(C.light ? C.violet : C.cyan, C.light ? 0.05 : 0.055));
  g.addColorStop(1, rgba(C.light ? C.violet : C.cyan, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, 8, 180);
  return cv;
}

/* ---- static layers (cached) ---- */

function paintGrid(x: CanvasRenderingContext2D, w: number, h: number) {
  const hy = G.horizon;
  const dim = C.light ? 0.85 : 1;
  // haze just above the horizon
  const haze = x.createLinearGradient(0, hy - 26, 0, hy);
  haze.addColorStop(0, rgba(C.cyan, 0));
  haze.addColorStop(1, rgba(C.cyan, 0.07 * dim));
  x.fillStyle = haze;
  x.fillRect(0, hy - 26, w, 26);
  // converging verticals — one shared vertical gradient stroke
  const lg = x.createLinearGradient(0, hy, 0, h);
  lg.addColorStop(0, rgba(C.cyan, 0.03 * dim));
  lg.addColorStop(1, rgba(C.violet, 0.15 * dim));
  x.strokeStyle = lg;
  x.lineWidth = 1;
  x.beginPath();
  for (let i = 0; i < G.vertX.length; i++) {
    x.moveTo(G.vanX, hy);
    x.lineTo(G.vertX[i], h + 1);
  }
  x.stroke();
  // horizon hairline
  const hg = x.createLinearGradient(0, 0, w, 0);
  hg.addColorStop(0, rgba(C.cyan, 0));
  hg.addColorStop(0.5, rgba(C.cyan, 0.26 * dim));
  hg.addColorStop(1, rgba(C.cyan, 0));
  x.strokeStyle = hg;
  x.beginPath();
  x.moveTo(0, hy + 0.5);
  x.lineTo(w, hy + 0.5);
  x.stroke();
}

function paintNet(x: CanvasRenderingContext2D) {
  const dim = C.light ? 0.8 : 1;
  x.lineWidth = 1;
  x.lineJoin = "round";
  // traces — thin elbow paths, mostly violet with cyan accents
  for (let e = 0; e < G.edges.length; e++) {
    const ed = G.edges[e];
    const cyan = e % 3 === 0;
    const col = cyan ? C.cyan : C.violet;
    x.strokeStyle = rgba(col, (cyan ? 0.12 : 0.1) * dim + 0.02);
    x.beginPath();
    x.moveTo(ed.p[0], ed.p[1]);
    x.lineTo(ed.p[2], ed.p[3]);
    x.lineTo(ed.p[4], ed.p[5]);
    x.stroke();
    // solder pad at the elbow
    x.fillStyle = rgba(col, 0.16 * dim);
    x.fillRect(ed.p[2] - 1, ed.p[3] - 1, 2, 2);
  }
  // nodes — small diamonds, every few one is a pink hub
  for (let k = 0; k < G.nodeN; k++) {
    const nx = G.nx[k];
    const ny = G.ny[k];
    const r = G.nr[k];
    const col = G.hub[k] ? C.pink : C.cyan;
    x.beginPath();
    x.moveTo(nx, ny - r);
    x.lineTo(nx + r, ny);
    x.lineTo(nx, ny + r);
    x.lineTo(nx - r, ny);
    x.closePath();
    x.fillStyle = rgba(col, 0.16 * dim);
    x.fill();
    x.strokeStyle = rgba(col, (G.hub[k] ? 0.45 : 0.3) * dim);
    x.stroke();
    if (G.hub[k]) {
      x.fillStyle = rgba(col, 0.5 * dim);
      x.fillRect(nx - 1, ny - 1, 2, 2);
    }
  }
}

/* ---- geometry build (per resize) ---- */

function spawnPacket(i: number, anywhere: boolean) {
  const p = packets[i];
  p.lane = (Math.random() * G.vertX.length) | 0;
  const r = Math.random();
  p.col = r < 0.55 ? 0 : r < 0.85 ? 1 : 2;
  p.speed = 0.07 + Math.random() * 0.08;
  p.speed *= Math.random() < 0.8 ? 1 : -1; // most ride toward the viewer
  p.len = 16 + Math.random() * 26;
  if (anywhere) {
    p.v = 0.08 + Math.random() * 0.9;
  } else {
    p.v = p.speed > 0 ? 1 : 0.05;
  }
}

function build(a: Ambient) {
  const w = a.w;
  const h = a.h;
  const lay = seeded(0xc1be04); // layout is deterministic per viewport size
  G.w = w;
  G.h = h;
  G.horizon = Math.round(h * 0.64);
  G.vanX = Math.round(w * 0.5);

  // grid verticals
  const sp = Math.min(130, Math.max(48, w / 13));
  const n = Math.ceil((G.vanX + sp) / sp);
  G.vertX.length = 0;
  for (let i = -n; i <= n; i++) G.vertX.push(G.vanX + i * sp);

  // sliding row phases
  G.rowCount = a.mobile ? 7 : MAX_ROWS;
  for (let j = 0; j < G.rowCount; j++) G.rows[j] = (j / G.rowCount + 0.03 * lay()) % 1;

  // constellation — jittered grid across the mid/upper band (above horizon)
  G.nodeN = a.mobile ? 14 : 24;
  const cols = a.mobile ? 4 : 6;
  const rowsN = Math.ceil(G.nodeN / cols);
  const top = h * 0.1;
  const bot = h * 0.52;
  for (let k = 0; k < G.nodeN; k++) {
    const cx = k % cols;
    const ry = Math.floor(k / cols);
    G.nx[k] = w * (0.07 + 0.86 * ((cx + 0.5) / cols)) + (lay() - 0.5) * ((w / cols) * 0.7);
    G.ny[k] = top + (bot - top) * ((ry + 0.5) / rowsN) + (lay() - 0.5) * (((bot - top) / rowsN) * 0.7);
    G.hub[k] = lay() < 0.22 ? 1 : 0;
    G.nr[k] = (G.hub[k] ? 3.4 : 2.1) + lay() * 0.9;
    G.glow[k] = 0;
  }

  // traces: each node to its two nearest neighbours, deduped
  const seen = new Set<number>();
  G.edges.length = 0;
  for (let i = 0; i < G.nodeN; i++) {
    let b1 = -1;
    let b2 = -1;
    let d1 = Infinity;
    let d2 = Infinity;
    for (let j = 0; j < G.nodeN; j++) {
      if (j === i) continue;
      const dx = G.nx[j] - G.nx[i];
      const dy = G.ny[j] - G.ny[i];
      const d = dx * dx + dy * dy;
      if (d < d1) {
        d2 = d1;
        b2 = b1;
        d1 = d;
        b1 = j;
      } else if (d < d2) {
        d2 = d;
        b2 = j;
      }
    }
    const cand = [b1, b2];
    for (let c = 0; c < 2; c++) {
      const j = cand[c];
      if (j < 0) continue;
      const a0 = Math.min(i, j);
      const b0 = Math.max(i, j);
      const key = a0 * 32 + b0;
      if (seen.has(key)) continue;
      seen.add(key);
      const ax = G.nx[a0];
      const ay = G.ny[a0];
      const bx = G.nx[b0];
      const by = G.ny[b0];
      const horizFirst = lay() < 0.5;
      const mx = horizFirst ? bx : ax;
      const my = horizFirst ? ay : by;
      const l01 = Math.hypot(mx - ax, my - ay);
      const l12 = Math.hypot(bx - mx, by - my);
      const len = l01 + l12;
      if (len < 14) continue; // skip degenerate stubs
      G.edges.push({
        p: Float32Array.from([ax, ay, mx, my, bx, by]),
        cum: Float32Array.from([l01, len]),
        len: len,
        a: a0,
        b: b0,
      });
    }
  }

  // adjacency for pulse hops
  G.adj.length = 0;
  for (let i = 0; i < G.nodeN; i++) G.adj.push([]);
  for (let e = 0; e < G.edges.length; e++) {
    G.adj[G.edges[e].a].push(e);
    G.adj[G.edges[e].b].push(e);
  }

  // keep live packets on valid lanes
  packetCount = a.mobile ? 5 : MAX_PACKETS - 1;
  for (let i = 0; i < packetCount; i++) {
    packets[i].lane = packets[i].lane % G.vertX.length;
    if (packets[i].v <= 0 || packets[i].v > 1) spawnPacket(i, true);
  }

  // cached bitmaps
  const g1 = makeLayer(w, h, a.dpr);
  if (g1) paintGrid(g1.x, w, h);
  cacheGrid = g1 ? g1.cv : null;
  const g2 = makeLayer(w, h, a.dpr);
  if (g2) paintNet(g2.x);
  cacheNet = g2 ? g2.cv : null;
  glowSprite[0] = makeGlow(C.cyan);
  glowSprite[1] = makeGlow(C.pink);
  glowSprite[2] = makeGlow(C.violet);
  scanBand = makeScanBand();
}

/* ---- animation ---- */

function edgePoint(e: number, d: number, out: Pt) {
  const ed = G.edges[e];
  const p = ed.p;
  let i0: number;
  let f: number;
  if (d <= ed.cum[0]) {
    i0 = 0;
    f = ed.cum[0] > 0 ? d / ed.cum[0] : 0;
  } else {
    i0 = 2;
    const seg = ed.len - ed.cum[0];
    f = seg > 0 ? (d - ed.cum[0]) / seg : 0;
  }
  out.x = p[i0] + (p[i0 + 2] - p[i0]) * f;
  out.y = p[i0 + 1] + (p[i0 + 3] - p[i0 + 1]) * f;
}

function launchPulse() {
  if (G.edges.length === 0) return;
  for (let i = 0; i < MAX_PULSES; i++) {
    const pu = pulses[i];
    if (pu.on) continue;
    pu.on = true;
    pu.edge = (Math.random() * G.edges.length) | 0;
    pu.from = Math.random() < 0.5 ? 0 : 1;
    pu.s = 0;
    pu.speed = 1 / (0.8 + Math.random() * 0.5);
    pu.hops = Math.random() < 0.35 ? 1 : 0; // 1-2 hops
    const r = Math.random();
    pu.col = r < 0.55 ? 0 : r < 0.85 ? 1 : 2;
    const ed = G.edges[pu.edge];
    const origin = pu.from === 0 ? ed.a : ed.b;
    G.glow[origin] = 1;
    G.glowCol[origin] = pu.col;
    return;
  }
}

function schedule(a: Ambient) {
  // scanline sweep every 12-20s
  if (a.t > T.nextScan) {
    T.scanStart = a.t;
    T.nextScan = a.t + 12 + Math.random() * 8;
  }
  // glitch shimmer every 20-40s
  if (a.t > T.nextGlitch) {
    T.glitchStart = a.t;
    T.nextGlitch = a.t + 20 + Math.random() * 20;
    for (let i = 0; i < MAX_BANDS; i++) {
      const b = bands[i];
      b.y = Math.random() * G.h * 0.55;
      b.h = 2 + Math.random() * 3;
      b.dx = (2 + Math.random() * 3) * (Math.random() < 0.5 ? -1 : 1);
      b.split = i === 0;
    }
  }
  // pulses every few seconds
  if (a.t > T.nextPulse) {
    T.nextPulse = a.t + 2.2 + Math.random() * 2.3;
    launchPulse();
  }
}

function draw(a: Ambient): void {
  const ctx = a.ctx;
  const w = a.w;
  const h = a.h;

  // rebuild on size change; refresh theme tokens at most twice a second
  if (w !== G.w || h !== G.h || !cacheGrid || !cacheNet) {
    readColors();
    build(a);
  } else if (a.t - T.colorCheck > 0.5) {
    T.colorCheck = a.t;
    if (readColors()) build(a);
  }

  ctx.fillStyle = rgba(C.bg, 1);
  ctx.fillRect(0, 0, w, h);
  if (!cacheGrid || !cacheNet) return;
  ctx.drawImage(cacheGrid, 0, 0, w, h);

  const hy = G.horizon;
  const dh = h - hy;
  const blend = C.light ? "source-over" : "lighter";

  // horizontal rows sliding toward the viewer (very low alpha)
  ctx.lineWidth = 1;
  for (let j = 0; j < G.rowCount; j++) {
    const f = reduced ? G.rows[j] : (G.rows[j] + a.t * G.rowSpeed) % 1;
    const u = Math.pow(f, G.rowExp); // 0 at horizon .. 1 at viewer
    const y = hy + dh * u;
    ctx.strokeStyle = rgba(C.violet, 0.04 + 0.11 * u);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const glitching = !reduced && a.t - T.glitchStart < 0.12;

  if (!reduced) {
    schedule(a);

    // data packets riding the grid verticals
    ctx.globalCompositeOperation = blend;
    for (let i = 0; i < packetCount; i++) {
      const p = packets[i];
      p.v -= p.speed * a.dt;
      if (p.v < 0.04 || p.v > 1) spawnPacket(i, false);
      const u = Math.pow(1 - p.v, G.rowExp);
      const y = hy + dh * u;
      const xb = G.vertX[p.lane];
      const x = G.vanX + (xb - G.vanX) * ((y - hy) / dh);
      const col = p.col === 0 ? C.cyan : p.col === 1 ? C.pink : C.violet;
      const fadeIn = Math.min(1, (1 - p.v) * 7); // fade out at the horizon
      const al = (0.08 + 0.6 * u) * fadeIn;
      if (al < 0.02) continue;
      const L = p.len * (0.4 + 0.6 * u);
      const il = 1 / Math.hypot(xb - G.vanX, dh);
      const ddx = (xb - G.vanX) * il;
      const ddy = dh * il;
      const sgn = p.speed > 0 ? 1 : -1;
      const tx = x - sgn * ddx * L;
      const ty = y - sgn * ddy * L;
      ctx.strokeStyle = rgba(col, al * 0.35);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.strokeStyle = rgba(col, al);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // constellation (cached); during a glitch window, redraw it offset in thin slices
  ctx.drawImage(cacheNet, 0, 0, w, h);
  if (glitching) {
    for (let i = 0; i < MAX_BANDS; i++) {
      const b = bands[i];
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, b.y, w, b.h);
      ctx.clip();
      ctx.globalAlpha = 0.9;
      ctx.drawImage(cacheNet, b.dx, 0, w, h);
      if (b.split) {
        ctx.globalAlpha = 0.35;
        ctx.drawImage(cacheNet, b.dx * 2.6, 0, w, h);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  if (!reduced) {
    ctx.globalCompositeOperation = blend;

    // travelling pulses + node glows
    for (let i = 0; i < MAX_PULSES; i++) {
      const pu = pulses[i];
      if (!pu.on) continue;
      if (pu.edge >= G.edges.length) {
        pu.on = false;
        continue;
      }
      pu.s += pu.speed * a.dt;
      const ed = G.edges[pu.edge];
      if (pu.s >= 1) {
        const arrive = pu.from === 0 ? ed.b : ed.a;
        G.glow[arrive] = 1;
        G.glowCol[arrive] = pu.col;
        if (pu.hops > 0) {
          const list = G.adj[arrive];
          let next = -1;
          for (let tries = 0; tries < 4 && list.length > 0; tries++) {
            const cand = list[(Math.random() * list.length) | 0];
            if (cand !== pu.edge) {
              next = cand;
              break;
            }
          }
          if (next >= 0) {
            pu.edge = next;
            pu.from = G.edges[next].a === arrive ? 0 : 1;
            pu.s = 0;
            pu.hops--;
            pu.speed = 1 / (0.7 + Math.random() * 0.5);
            continue;
          }
        }
        pu.on = false;
        continue;
      }
      const col = pu.col === 0 ? C.cyan : pu.col === 1 ? C.pink : C.violet;
      const d = pu.from === 0 ? pu.s * ed.len : (1 - pu.s) * ed.len;
      edgePoint(pu.edge, d, pt);
      const trail = Math.min(26, ed.len * 0.22) * (pu.from === 0 ? 1 : -1);
      edgePoint(pu.edge, Math.max(0, Math.min(ed.len, d - trail)), pt2);
      ctx.strokeStyle = rgba(col, 0.55);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(pt2.x, pt2.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      const sp = glowSprite[pu.col];
      if (sp) {
        const s0 = 11 + 7 * Math.sin(pu.s * Math.PI); // breathe along the hop
        ctx.globalAlpha = 0.65;
        ctx.drawImage(sp, pt.x - s0, pt.y - s0, s0 * 2, s0 * 2);
        ctx.globalAlpha = 1;
      }
    }

    // node glow decay (only touches lit nodes)
    for (let k = 0; k < G.nodeN; k++) {
      const g0 = G.glow[k];
      if (g0 < 0.02) continue;
      G.glow[k] = g0 * Math.exp(-3.4 * a.dt);
      const sp = glowSprite[G.glowCol[k]];
      if (!sp) continue;
      const s0 = (G.hub[k] ? 30 : 20) * (1 + 0.4 * g0);
      ctx.globalAlpha = g0 * 0.5;
      ctx.drawImage(sp, G.nx[k] - s0, G.ny[k] - s0, s0 * 2, s0 * 2);
    }
    ctx.globalAlpha = 1;

    // slow scanline sweep
    const st = (a.t - T.scanStart) / 1.9;
    if (st >= 0 && st <= 1 && scanBand) {
      const e = st < 0.5 ? 2 * st * st : 1 - Math.pow(-2 * st + 2, 2) / 2;
      ctx.drawImage(scanBand, 0, -90 + e * (h + 180) - 90, w, 180);
    }
    ctx.globalCompositeOperation = "source-over";
  } else {
    // reduced motion: faint static glows on the hubs only
    const sp = glowSprite[0];
    if (sp) {
      ctx.globalAlpha = 0.22;
      for (let k = 0; k < G.nodeN; k++) {
        if (!G.hub[k]) continue;
        ctx.drawImage(sp, G.nx[k] - 22, G.ny[k] - 22, 44, 44);
      }
      ctx.globalAlpha = 1;
    }
  }
}

export default function CyberWorld() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    reduced = prefersReducedMotion();
    // fresh mount: rebuild caches and color schedules (module state survives unmount)
    G.w = 0; T.colorCheck = 0; 
    return runAmbientCanvas(cv, ["--cyan", "--violet", "--pink", "--bg"], draw, {
      fps: 30,
    });
  }, []);
  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" />;
}
