"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useLang } from "./Providers";
import { isVideo } from "@/lib/data";
import { pick } from "@/lib/i18n";
import type { Photo, Lang } from "@/lib/types";

const MIN_COLS = 2, MAX_COLS = 7, CHUNK = 36;

/** iPhone-Photos-style grid: dense square tiles, pinch-to-change-density,
    progressive (infinite) loading, and a swipe/zoom fullscreen lightbox.
    Reused by the album page and the gallery "All photos" view. */
export default function PhotoGrid({ photos }: { photos: Photo[] }) {
  const { lang } = useLang();
  const [cols, setCols] = useState(3);
  const [shown, setShown] = useState(CHUNK);
  const [lb, setLb] = useState(-1);
  const gridRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pinch = useRef<{ d: number; cols: number } | null>(null);

  // Initial density: remembered choice, else based on screen width.
  useEffect(() => {
    const saved = Number(localStorage.getItem("galCols"));
    if (saved >= MIN_COLS && saved <= MAX_COLS) { setCols(saved); return; }
    const w = window.innerWidth;
    setCols(w >= 1100 ? 6 : w >= 700 ? 4 : 3);
  }, []);

  const changeCols = useCallback((n: number) => {
    const c = Math.max(MIN_COLS, Math.min(MAX_COLS, n));
    setCols(c);
    try { localStorage.setItem("galCols", String(c)); } catch {}
  }, []);

  // Pinch on the grid → density (spread = bigger & fewer, pinch = smaller & more).
  useEffect(() => {
    const el = gridRef.current; if (!el) return;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => { if (e.touches.length === 2) pinch.current = { d: dist(e.touches), cols }; };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinch.current) {
        e.preventDefault();
        const ratio = dist(e.touches) / pinch.current.d;
        changeCols(Math.round(pinch.current.cols / ratio));
      }
    };
    const onEnd = () => { pinch.current = null; };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => { el.removeEventListener("touchstart", onStart); el.removeEventListener("touchmove", onMove as any); el.removeEventListener("touchend", onEnd); };
  }, [cols, changeCols]);

  // Progressive load: reveal more tiles as the sentinel nears the viewport.
  useEffect(() => {
    const el = sentinelRef.current; if (!el) return;
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) setShown((s) => Math.min(s + CHUNK, photos.length)); }, { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [photos.length, shown]);

  const close = useCallback(() => setLb(-1), []);
  const step = useCallback((d: number) => setLb((i) => (i < 0 ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    document.body.style.overflow = lb >= 0 ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => { if (lb < 0) return; if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") step(-1); else if (e.key === "ArrowRight") step(1); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [lb, close, step]);

  const visible = photos.slice(0, shown);

  return (
    <>
      <div className="ip-toolbar">
        <span className="ip-count">{photos.length}</span>
        <div className="ip-zoom" role="group" aria-label="Photo size">
          <button type="button" onClick={() => changeCols(cols + 1)} disabled={cols >= MAX_COLS} aria-label={lang === "uz" ? "Kichikroq" : "Smaller"}>▦</button>
          <button type="button" onClick={() => changeCols(cols - 1)} disabled={cols <= MIN_COLS} aria-label={lang === "uz" ? "Kattaroq" : "Larger"}>▢</button>
        </div>
      </div>

      <div className="ip-grid" ref={gridRef} style={{ ["--cols" as any]: cols }}>
        {visible.map((g, i) => {
          const vid = g.video || isVideo(g.src);
          return (
            <figure className="ip-tile" key={i} onClick={() => setLb(i)}>
              {vid
                ? <><video src={g.src} muted playsInline preload="metadata" /><span className="vid-badge">▶</span></>
                : <img src={g.src} alt={pick(g, "caption", lang)} loading="lazy" />}
            </figure>
          );
        })}
      </div>
      {shown < photos.length && <div ref={sentinelRef} className="ip-sentinel"><span className="ip-spin" /></div>}

      {lb >= 0 && <Lightbox photos={photos} index={lb} onClose={close} onStep={step} lang={lang} />}
    </>
  );
}

function Lightbox({ photos, index, onClose, onStep, lang }: { photos: Photo[]; index: number; onClose: () => void; onStep: (d: number) => void; lang: Lang }) {
  const cur = photos[index];
  const cap = pick(cur, "caption", lang);
  const vid = cur.video || isVideo(cur.src);
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 });
  const drag = useRef<any>(null);
  const pinchRef = useRef<{ d: number; s: number } | null>(null);
  const lastTap = useRef(0);
  const moved = useRef(false);

  useEffect(() => { setZ({ s: 1, x: 0, y: 0 }); }, [index]);

  // Preload neighbours so swiping is instant.
  useEffect(() => {
    [index - 1, index + 1].forEach((j) => {
      const p = photos[(j + photos.length) % photos.length];
      if (p && p.src && !(p.video || isVideo(p.src))) { const im = new Image(); im.src = p.src; }
    });
  }, [index, photos]);

  const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    moved.current = false;
    if (e.touches.length === 2) { pinchRef.current = { d: dist(e.touches as any), s: z.s }; drag.current = null; return; }
    const now = Date.now();
    if (now - lastTap.current < 280) {
      setZ((p) => (p.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }));
      lastTap.current = 0;
    } else lastTap.current = now;
    drag.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: z.x, oy: z.y, dx: 0, dy: 0 };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const s = Math.max(1, Math.min(4, pinchRef.current.s * (dist(e.touches as any) / pinchRef.current.d)));
      setZ((p) => ({ ...p, s }));
      return;
    }
    if (e.touches.length === 1 && drag.current) {
      const dx = e.touches[0].clientX - drag.current.x;
      const dy = e.touches[0].clientY - drag.current.y;
      drag.current.dx = dx; drag.current.dy = dy;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved.current = true;
      if (z.s > 1) { e.preventDefault(); setZ((p) => ({ ...p, x: drag.current.ox + dx, y: drag.current.oy + dy })); }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (pinchRef.current && e.touches.length < 2) { pinchRef.current = null; setZ((p) => (p.s < 1.1 ? { s: 1, x: 0, y: 0 } : p)); }
    if (drag.current && z.s <= 1) {
      const { dx = 0, dy = 0 } = drag.current;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) onStep(dx < 0 ? 1 : -1);
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) onClose();
    }
    if (e.touches.length === 0) drag.current = null;
  };

  return (
    <div
      className="lightbox open ip-lb"
      onClick={(e) => { if (e.target === e.currentTarget && !moved.current) onClose(); }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <button className="lightbox-close" aria-label="Close" onClick={onClose}>×</button>
      <div className="ip-lb-stage" onClick={(e) => { if (e.target === e.currentTarget && !moved.current) onClose(); }}>
        {vid
          ? <video src={cur.src} controls playsInline autoPlay />
          : <img src={cur.src} alt={cap} draggable={false} style={{ transform: `translate(${z.x}px, ${z.y}px) scale(${z.s})`, transition: drag.current || pinchRef.current ? "none" : "transform .25s" }} />}
      </div>
      <button className="ip-lb-nav ip-lb-prev" aria-label="Previous" onClick={(e) => { e.stopPropagation(); onStep(-1); }}>‹</button>
      <button className="ip-lb-nav ip-lb-next" aria-label="Next" onClick={(e) => { e.stopPropagation(); onStep(1); }}>›</button>
      <div className="lightbox-cap">{cap} <span className="lb-count">{index + 1} / {photos.length}</span></div>
    </div>
  );
}
