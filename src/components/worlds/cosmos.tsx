"use client";

/* COSMOS world — deep-space ambient scene behind the page content.
   Draw order (back → front): nebula washes → far stars → mid stars →
   near stars → planets → comet → satellite.
   Perf: every particle is pre-allocated at mount and mutated in place;
   stars, nebulae, planets, comet head/tail and the satellite body are all
   pre-rendered offscreen sprites, so a frame is ~390 drawImage calls plus
   alpha math — no per-frame allocations, no gradient construction, no
   fillStyle string building. Transients (comet, satellite) run on a seeded
   spawn scheduler so the sky is stable per session.
   Reduced motion: the engine paints exactly one static frame — nebula,
   stars and planets only; transient items are skipped entirely.
   Theme: tokens --cyan/--violet/--bg are re-read live whenever the
   data-mode attribute flips, so light and dark both look right. */

import { useEffect, useRef } from "react";
import { runAmbientCanvas, seeded } from "./shared";
import type { Ambient } from "./shared";
import { prefersReducedMotion } from "./rm";
import styles from "./cosmos.module.css";

type RGB = [number, number, number];

const TAU = Math.PI * 2;
const WHITE: RGB = [255, 255, 255];
const NIGHT: RGB = [6, 9, 18];

/* Three depth layers: count (halved on mobile), slow px/s drift, size and
   brightness ranges. Far = many tiny dim, near = few big bright. */
const LAYERS = [
  { count: 220, speed: 1.4, rMin: 0.7, rMax: 1.2, baseMin: 0.3, baseMax: 0.6, amp: 0.22 },
  { count: 110, speed: 2.7, rMin: 0.9, rMax: 1.6, baseMin: 0.4, baseMax: 0.75, amp: 0.3 },
  { count: 60, speed: 4.4, rMin: 1.4, rMax: 2.6, baseMin: 0.5, baseMax: 0.9, amp: 0.4 },
] as const;
const STAR_TOTAL = LAYERS[0].count + LAYERS[1].count + LAYERS[2].count;

/* Nebula washes: normalized center + size as a fraction of min(w, h). */
const NEBULAE = [
  { x: 0.78, y: 0.14, k: 1.15 },
  { x: 0.1, y: 0.42, k: 0.95 },
  { x: 0.52, y: 0.9, k: 1.25 },
] as const;

/* Planets: normalized center, sprite draw width as fraction of min(w, h). */
const PLANET_A = { x: 0.8, y: 0.2, k: 0.3 };
const PLANET_B = { x: 0.13, y: 0.74, k: 0.15 };
const PLANET_A_ASPECT = 200 / 320;

interface Star {
  x: number; // normalized position
  y: number;
  r: number; // draw radius in px (sprite is drawn at r*5)
  sprite: number; // tint variant index
  phase: number; // twinkle phase offset
  speed: number; // twinkle angular speed, rad/s
  base: number; // mean alpha
  amp: number; // twinkle amplitude
}

interface Comet {
  active: boolean;
  x: number; // spawn origin
  y: number;
  ux: number; // unit direction of travel
  uy: number;
  angle: number; // atan2(uy, ux), for the rotated tail sprite
  speed: number; // px/s
  len: number; // tail length, px
  dist: number; // total distance until fully off-screen
  gone: number; // distance traveled so far
}

interface Sat {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number; // t at spawn — anchors the nav-light blink
}

interface Sprites {
  stars: HTMLCanvasElement[]; // 4 tint variants
  nebulae: HTMLCanvasElement[]; // 3 soft washes
  planetA: HTMLCanvasElement; // ringed ice giant
  planetB: HTMLCanvasElement; // warm banded sphere
  cometHead: HTMLCanvasElement;
  cometTail: HTMLCanvasElement;
  satellite: HTMLCanvasElement;
}

interface Scene {
  stars: Star[]; // pre-allocated, mutated in place
  rng: () => number; // seeded — spawn schedule is stable per session
  reduced: boolean;
  modeAttr: string | null; // last seen data-mode; sentinel forces first build
  dark: boolean;
  cyan: RGB;
  violet: RGB;
  sprites: Sprites | null;
  dim: number; // global star/comet brightness (lower in light mode)
  planetAlpha: number;
  nebulaAlpha: number;
  comet: Comet;
  sat: Sat;
  nextCometAt: number;
  nextSatAt: number;
  navLight: string; // prebuilt fillStyle, used every frame
}

/* ---------- small color/sprite helpers (build-time only) ---------- */

function hexToRgb(hex: string): RGB {
  let s = hex.trim().replace("#", "");
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s, 16);
  if (s.length !== 6 || !Number.isFinite(n)) return [45, 212, 234]; // fallback cyan
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(c: RGB, a: number): string {
  return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
}

function mix(a: RGB, b: RGB, k: number): RGB {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function lum(c: RGB): number {
  return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
}

function makeCanvas(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (g) paint(g);
  return c;
}

/* ---------- sprites (rebuilt only when the color mode changes) ---------- */

function starSprite(core: RGB): HTMLCanvasElement {
  return makeCanvas(20, 20, (g) => {
    const grad = g.createRadialGradient(10, 10, 0, 10, 10, 10);
    grad.addColorStop(0, rgba(core, 1));
    grad.addColorStop(0.22, rgba(core, 0.92));
    grad.addColorStop(0.5, rgba(core, 0.26));
    grad.addColorStop(1, rgba(core, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 20, 20);
  });
}

function nebulaSprite(tint: RGB, mid: RGB): HTMLCanvasElement {
  return makeCanvas(512, 512, (g) => {
    const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, rgba(tint, 0.42));
    grad.addColorStop(0.45, rgba(mid, 0.2));
    grad.addColorStop(1, rgba(mid, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 512);
  });
}

/* Soft shaded sphere: off-center light, terminator darkening toward the
   lower-right, plus a faint atmosphere halo. 320x200 — the extra width
   leaves room for the ring. */
function planetRinged(base: RGB, ring: RGB, dark: boolean): HTMLCanvasElement {
  return makeCanvas(320, 200, (g) => {
    const cx = 160, cy = 100, r = 76;
    const halo = g.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.45);
    halo.addColorStop(0, rgba(base, 0.28));
    halo.addColorStop(1, rgba(base, 0));
    g.fillStyle = halo;
    g.fillRect(0, 0, 320, 200);

    const tilt = -0.32;
    const rx = r * 1.92, ry = r * 0.5;
    const ringPass = (front: boolean) => {
      g.save();
      g.translate(cx, cy);
      g.rotate(tilt);
      g.beginPath();
      g.rect(-rx - 6, front ? 0 : -ry - 6, (rx + 6) * 2, ry + 6);
      g.clip();
      g.beginPath();
      g.ellipse(0, 0, rx, ry, 0, 0, TAU);
      g.lineWidth = 3;
      g.strokeStyle = rgba(ring, 0.5);
      g.stroke();
      g.beginPath();
      g.ellipse(0, 0, rx * 1.12, ry * 1.2, 0, 0, TAU);
      g.lineWidth = 1.2;
      g.strokeStyle = rgba(ring, 0.28);
      g.stroke();
      g.restore();
    };
    ringPass(false); // far half, behind the body

    const lx = cx - r * 0.38, ly = cy - r * 0.42;
    const body = g.createRadialGradient(lx, ly, r * 0.1, cx, cy, r * 1.02);
    body.addColorStop(0, rgba(mix(base, WHITE, 0.5), 1));
    body.addColorStop(0.5, rgba(base, 1));
    body.addColorStop(1, rgba(mix(base, NIGHT, 0.78), 1));
    g.fillStyle = body;
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.fill();

    const term = g.createRadialGradient(lx, ly, r * 0.9, lx, ly, r * 2.05);
    term.addColorStop(0, "rgba(0,0,0,0)");
    term.addColorStop(1, dark ? "rgba(3,5,12,0.5)" : "rgba(30,38,60,0.32)");
    g.save();
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.clip();
    g.fillStyle = term;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();

    ringPass(true); // near half, in front of the body
  });
}

function planetPlain(base: RGB, dark: boolean): HTMLCanvasElement {
  return makeCanvas(160, 160, (g) => {
    const cx = 80, cy = 80, r = 54;
    const halo = g.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.5);
    halo.addColorStop(0, rgba(base, 0.22));
    halo.addColorStop(1, rgba(base, 0));
    g.fillStyle = halo;
    g.fillRect(0, 0, 160, 160);

    const lx = cx - r * 0.36, ly = cy - r * 0.4;
    const body = g.createRadialGradient(lx, ly, r * 0.08, cx, cy, r * 1.04);
    body.addColorStop(0, rgba(mix(base, WHITE, 0.45), 1));
    body.addColorStop(0.55, rgba(base, 1));
    body.addColorStop(1, rgba(mix(base, NIGHT, 0.8), 1));
    g.fillStyle = body;
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.fill();

    // two faint cloud bands
    g.save();
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.clip();
    g.globalAlpha = 0.16;
    g.fillStyle = rgba(mix(base, NIGHT, 0.6), 1);
    g.fillRect(cx - r, cy + r * 0.18, r * 2, r * 0.16);
    g.fillRect(cx - r, cy - r * 0.34, r * 2, r * 0.1);
    g.restore();

    const term = g.createRadialGradient(lx, ly, r * 0.9, lx, ly, r * 2.0);
    term.addColorStop(0, "rgba(0,0,0,0)");
    term.addColorStop(1, dark ? "rgba(3,5,12,0.45)" : "rgba(30,38,60,0.28)");
    g.save();
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.clip();
    g.fillStyle = term;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
  });
}

function cometTailSprite(core: RGB, edge: RGB): HTMLCanvasElement {
  // Head end at x=256; the sprite is drawn rotated so -x trails behind.
  return makeCanvas(256, 18, (g) => {
    const grad = g.createLinearGradient(256, 0, 0, 0);
    grad.addColorStop(0, rgba(core, 0.85));
    grad.addColorStop(0.3, rgba(edge, 0.38));
    grad.addColorStop(1, rgba(edge, 0));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(256, 1.5);
    g.lineTo(256, 16.5);
    g.lineTo(0, 9);
    g.closePath();
    g.fill();
  });
}

function cometHeadSprite(core: RGB, glow: RGB): HTMLCanvasElement {
  return makeCanvas(64, 64, (g) => {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, rgba(core, 1));
    grad.addColorStop(0.16, rgba(core, 0.9));
    grad.addColorStop(0.4, rgba(glow, 0.32));
    grad.addColorStop(1, rgba(glow, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  });
}

function satelliteSprite(body: RGB, panel: RGB, sheen: RGB, rim: string): HTMLCanvasElement {
  return makeCanvas(72, 28, (g) => {
    g.fillStyle = rgba(panel, 0.95); // solar panels
    g.fillRect(2, 7, 20, 14);
    g.fillRect(50, 7, 20, 14);
    g.fillStyle = rgba(sheen, 0.2); // panel sheen
    g.fillRect(2, 7, 20, 14);
    g.fillRect(50, 7, 20, 14);
    g.fillStyle = rgba(body, 0.85); // cell seams + truss
    g.fillRect(11.5, 7, 1, 14);
    g.fillRect(59.5, 7, 1, 14);
    g.fillRect(22, 12, 28, 4);
    g.fillStyle = rgba(body, 1); // bus
    g.fillRect(28, 8, 16, 12);
    g.fillStyle = rim; // sunlit top edge
    g.fillRect(28, 8, 16, 1.4);
  });
}

function buildSprites(dark: boolean, cyan: RGB, violet: RGB): Sprites {
  const starTints: RGB[] = dark
    ? [[232, 240, 255], [186, 222, 255], [255, 228, 183], cyan]
    : [[96, 106, 142], [74, 106, 152], [168, 132, 92], mix(cyan, [22, 44, 66], 0.5)];
  const nebViolet = dark ? violet : mix(violet, WHITE, 0.25);
  const nebCyan = dark ? cyan : mix(cyan, WHITE, 0.25);
  const planetA = dark ? mix(cyan, violet, 0.65) : mix(cyan, violet, 0.5);
  const planetB: RGB = dark ? mix([201, 158, 112], violet, 0.15) : [148, 108, 74];
  return {
    stars: starTints.map(starSprite),
    nebulae: [
      nebulaSprite(nebViolet, nebCyan),
      nebulaSprite(nebCyan, nebViolet),
      nebulaSprite(mix(nebViolet, nebCyan, 0.5), nebViolet),
    ],
    planetA: planetRinged(planetA, mix(planetA, WHITE, 0.35), dark),
    planetB: planetPlain(planetB, dark),
    cometHead: cometHeadSprite(
      dark ? [240, 248, 255] : [228, 238, 252],
      dark ? [170, 215, 255] : [110, 150, 210],
    ),
    cometTail: cometTailSprite(
      dark ? [235, 246, 255] : [215, 230, 250],
      dark ? [170, 215, 255] : [110, 150, 210],
    ),
    satellite: dark
      ? satelliteSprite([12, 17, 32], [16, 26, 48], cyan, "rgba(165,195,235,0.4)")
      : satelliteSprite([44, 54, 84], [58, 72, 110], [90, 110, 160], "rgba(255,255,255,0.75)"),
  };
}

/* ---------- spawn scheduling (seeded, cheap — runs every 25-90s) ---------- */

function spawnComet(sc: Scene, a: Ambient): void {
  const c = sc.comet;
  const r = sc.rng;
  const dir = r() < 0.5 ? 1 : -1;
  const slope = 0.16 + r() * 0.14; // shallow diagonal
  const inv = 1 / Math.hypot(1, slope);
  c.ux = dir * inv;
  c.uy = slope * inv;
  c.angle = Math.atan2(c.uy, c.ux);
  c.speed = 480 + r() * 300;
  c.len = 140 + r() * 80;
  c.x = dir > 0 ? -c.len * 0.6 : a.w + c.len * 0.6;
  c.y = a.h * (0.06 + r() * 0.38);
  const dx = dir > 0 ? a.w - c.x + c.len * 0.8 : c.x + c.len * 0.8;
  c.dist = dx / Math.abs(c.ux);
  c.gone = 0;
  c.active = true;
}

function spawnSat(sc: Scene, a: Ambient): void {
  const s = sc.sat;
  const r = sc.rng;
  const dir = r() < 0.5 ? 1 : -1;
  s.vx = dir * (42 + r() * 30);
  s.vy = (r() - 0.5) * 3;
  s.x = dir > 0 ? -50 : a.w + 50;
  s.y = a.h * (0.05 + r() * 0.5);
  s.born = a.t;
  s.active = true;
}

/* ---------- the frame ---------- */

function draw(a: Ambient, sc: Scene): void {
  const { ctx, w, h, t, dt } = a;

  // Watch the color mode: one getAttribute per frame; the (rare) rebuild
  // re-reads the live token values so light/dark always look right.
  const attr = document.documentElement.getAttribute("data-mode");
  if (attr !== sc.modeAttr) {
    sc.modeAttr = attr;
    const cs = getComputedStyle(document.documentElement);
    sc.cyan = hexToRgb(cs.getPropertyValue("--cyan"));
    sc.violet = hexToRgb(cs.getPropertyValue("--violet"));
    const bg = hexToRgb(cs.getPropertyValue("--bg"));
    sc.dark = lum(bg) < 0.56;
    sc.sprites = buildSprites(sc.dark, sc.cyan, sc.violet);
    sc.dim = sc.dark ? 1 : 0.6;
    sc.planetAlpha = sc.dark ? 0.9 : 0.55;
    sc.nebulaAlpha = sc.dark ? 0.45 : 0.4;
  }
  const sp = sc.sprites;
  if (!sp) return;

  ctx.clearRect(0, 0, w, h); // page bg shows through — no opaque fill
  const m = Math.min(w, h);

  // 1. nebula washes (very slow breathing)
  for (let i = 0; i < 3; i++) {
    const n = NEBULAE[i];
    const breathe = 0.85 + 0.15 * Math.sin(t * 0.05 + i * 2.1);
    ctx.globalAlpha = sc.nebulaAlpha * breathe;
    const size = m * n.k;
    ctx.drawImage(sp.nebulae[i], n.x * w - size / 2, n.y * h - size / 2, size, size);
  }

  // 2-4. three parallax star layers (back to front), slow drift + twinkle
  const wrapW = w + 24, wrapH = h + 24;
  let idx = 0;
  for (let li = 0; li < 3; li++) {
    const L = LAYERS[li];
    const count = a.mobile ? L.count >> 1 : L.count;
    const drift = t * L.speed;
    for (let i = 0; i < count; i++, idx++) {
      const s = sc.stars[idx];
      const sx = (s.x * w + drift) % wrapW - 12;
      const sy = (s.y * h + drift * 0.35) % wrapH - 12;
      const alpha = (s.base + s.amp * Math.sin(t * s.speed + s.phase)) * sc.dim;
      if (alpha < 0.02) continue;
      const size = s.r * 5;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sp.stars[s.sprite], sx - size * 0.5, sy - size * 0.5, size, size);
    }
  }

  // 5. planets — slow sinusoidal wander, pre-rendered spheres
  ctx.globalAlpha = sc.planetAlpha;
  const aw = m * PLANET_A.k;
  ctx.drawImage(
    sp.planetA,
    PLANET_A.x * w + Math.sin(t * 0.011 + 1.3) * m * 0.012 - aw / 2,
    PLANET_A.y * h + Math.sin(t * 0.013) * m * 0.009 - (aw * PLANET_A_ASPECT) / 2,
    aw,
    aw * PLANET_A_ASPECT,
  );
  const bw = m * PLANET_B.k;
  ctx.drawImage(
    sp.planetB,
    PLANET_B.x * w + Math.sin(t * 0.009 + 4.1) * m * 0.01 - bw / 2,
    PLANET_B.y * h + Math.sin(t * 0.012 + 2.2) * m * 0.008 - bw / 2,
    bw,
    bw,
  );
  ctx.globalAlpha = 1;

  if (sc.reduced) return; // static frame ends here: nebula + stars + planets

  // 6. comet — bright head + tapered tail on a shallow diagonal
  const c = sc.comet;
  if (!c.active && t >= sc.nextCometAt) spawnComet(sc, a);
  if (c.active) {
    c.gone += c.speed * dt;
    const p = c.gone / c.dist;
    if (p >= 1) {
      c.active = false;
      sc.nextCometAt = t + 25 + sc.rng() * 35;
    } else {
      const alpha = Math.min(1, p / 0.07) * Math.min(1, (1 - p) / 0.14) * sc.dim;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(c.x + c.ux * c.gone, c.y + c.uy * c.gone);
      ctx.rotate(c.angle);
      const tailW = c.len * 0.11;
      ctx.drawImage(sp.cometTail, -c.len, -tailW / 2, c.len, tailW);
      ctx.drawImage(sp.cometHead, -11, -11, 22, 22);
      ctx.restore();
    }
  }

  // 7. satellite — tiny silhouette crossing the sky, blinking nav light
  const s = sc.sat;
  if (!s.active && t >= sc.nextSatAt) spawnSat(sc, a);
  if (s.active) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.x < -60 || s.x > w + 60) {
      s.active = false;
      sc.nextSatAt = t + 40 + sc.rng() * 50;
    } else {
      const k = a.mobile ? 0.7 : 0.9;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.atan2(s.vy, Math.abs(s.vx)) * 0.35);
      ctx.drawImage(sp.satellite, -36 * k, -14 * k, 72 * k, 28 * k);
      const blink = Math.sin((t - s.born) * 4.5); // ~1.4s period, brief flash
      if (blink > 0.55) {
        ctx.globalAlpha = (blink - 0.55) * 2.2 * sc.dim;
        ctx.fillStyle = sc.navLight;
        ctx.beginPath();
        ctx.arc(0, -7 * k, 1.7, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

/* ---------- component ---------- */

export default function CosmosWorld() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const rng = seeded(20261003);
    const stars: Star[] = new Array(STAR_TOTAL);
    let idx = 0;
    for (let li = 0; li < 3; li++) {
      const L = LAYERS[li];
      for (let i = 0; i < L.count; i++, idx++) {
        const roll = rng();
        stars[idx] = {
          x: rng(),
          y: rng(),
          r: L.rMin + rng() * (L.rMax - L.rMin),
          sprite: roll < 0.55 ? 0 : roll < 0.75 ? 1 : roll < 0.9 ? 2 : 3,
          phase: rng() * TAU,
          speed: 0.4 + rng() * 1.1,
          base: L.baseMin + rng() * (L.baseMax - L.baseMin),
          amp: (0.4 + rng() * 0.6) * L.amp,
        };
      }
    }

    const scene: Scene = {
      stars,
      rng,
      reduced: prefersReducedMotion(),
      modeAttr: "\u0000", // sentinel — forces the first-frame sprite build
      dark: true,
      cyan: [45, 212, 234],
      violet: [59, 130, 246],
      sprites: null,
      dim: 1,
      planetAlpha: 0.9,
      nebulaAlpha: 0.45,
      comet: { active: false, x: 0, y: 0, ux: 1, uy: 0, angle: 0, speed: 0, len: 0, dist: 1, gone: 0 },
      sat: { active: false, x: 0, y: 0, vx: 0, vy: 0, born: 0 },
      // first comet/satellite arrive quickly; later gaps follow the spec
      nextCometAt: 7 + rng() * 9,
      nextSatAt: 12 + rng() * 18,
      navLight: "rgba(255,118,92,0.95)",
    };

    return runAmbientCanvas(canvas, ["--cyan", "--violet", "--bg"], (a) => draw(a, scene), {
      fps: 30,
    });
  }, []);

  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" />;
}
