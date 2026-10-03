"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useLang } from "./Providers";
import { isVideo } from "@/lib/format";
import { mediaUrl, onMediaError, onVideoError } from "@/lib/media";
import { pick } from "@/lib/i18n";
import styles from "./gallery.module.css";
import type { Photo, Lang } from "@/lib/types";

const MIN_COLS = 2, MAX_COLS = 8, CHUNK = 36;
/** Upper bound on columns for the current viewport, so phones never get 33px tiles. */
const colCap = () => Math.min(MAX_COLS, Math.max(MIN_COLS, Math.floor(window.innerWidth / 48)));

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
    let saved = 0;
    try { saved = Number(localStorage.getItem("galCols")); } catch { /* private mode */ }
    if (saved >= MIN_COLS) { setCols(Math.min(colCap(), saved)); return; }
    const w = gridRef.current?.clientWidth || window.innerWidth;
    setCols(w >= 1100 ? 6 : w >= 700 ? 4 : 3);
  }, []);

  const changeCols = useCallback((n: number) => {
    const c = Math.min(colCap(), Math.max(MIN_COLS, n));
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
      <div className={styles.desktopGrid}>
        {/* Desktop presentation wrapper (gallery.module.css):
            restyles the grid at >=900px; phone stays immersive. */}
        <div className={"ip-toolbar " + styles.bar}>
          <span className="ip-count" aria-label={`${photos.length} ${lang === "uz" ? "ta rasm" : "photos"}`}>{photos.length} <span aria-hidden="true">📷</span></span>
          <div className="ip-zoom" role="group" aria-label={lang === "uz" ? "Rasm oʼlchami" : "Photo size"}>
            <button type="button" onClick={() => changeCols(cols - 1)} disabled={cols <= MIN_COLS} title={lang === "uz" ? "Kattalashtirish" : "Zoom in"} aria-label={lang === "uz" ? "Kattalashtirish" : "Zoom in"}>&#xff0b;</button>
            <span className="ip-zoom-level" aria-live="polite" title={lang === "uz" ? "Ustunlar" : "Columns"}>{cols}</span>
            <button type="button" onClick={() => changeCols(cols + 1)} disabled={cols >= MAX_COLS} title={lang === "uz" ? "Kichiklashtirish" : "Zoom out"} aria-label={lang === "uz" ? "Kichiklashtirish" : "Zoom out"}>&#8722;</button>
          </div>
        </div>

        <div className="ip-grid" ref={gridRef} style={{ ["--cols" as any]: cols }}>
          {visible.map((g, i) => {
            const vid = g.video || isVideo(g.src);
            const cap = pick(g, "caption", lang);
            return (
              <figure className="ip-tile" key={i} role="button" tabIndex={0} aria-label={cap || (vid ? "Video" : lang === "uz" ? "Rasm" : "Photo")} onClick={() => setLb(i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLb(i); } }}>
                {vid
                  ? <div className="video-ph">
                      <VideoTile src={g.src!} />
                      <span className="vid-badge">▶</span>
                    </div>
                  : <img src={mediaUrl(g.src, 480)} data-original={g.src} onError={onMediaError} alt={cap} loading="lazy" decoding="async" />}
              </figure>
            );
          })}
        </div>
        {shown < photos.length && <div ref={sentinelRef} className="ip-sentinel"><span className="ip-spin" /></div>}
      </div>

      {lb >= 0 && <Lightbox photos={photos} index={lb} onClose={close} onStep={step} lang={lang} />}
    </>
  );
}

/* Video tile poster: captures a real frame into a canvas so EVERY browser —
   iOS Safari included — shows a video thumbnail (browsers often refuse to
   paint preload="metadata" frames, which read as "video won't open").
   Preference: captured poster <img> → live #t=0.1 <video> (may paint) →
   the .video-ph gradient + ▶ badge (always there underneath). */
function VideoTile({ src }: { src: string }) {
  const [poster, setPoster] = useState<string | null>(null);
  const [live, setLive] = useState(false); // capture impossible → show the raw video (old behavior)
  const [dead, setDead] = useState(false); // video itself failed → gradient + badge only
  const vidRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = vidRef.current;
    if (!v || poster || live || dead) return;
    let cancelled = false;
    const capture = () => {
      if (cancelled) return;
      try {
        const c = document.createElement("canvas");
        c.width = 480; c.height = 480;
        const cx = c.getContext("2d");
        if (!cx) throw new Error("no 2d");
        const vw = v.videoWidth || 480, vh = v.videoHeight || 480;
        const cov = Math.max(480 / vw, 480 / vh);
        const sw = 480 / cov, sh = 480 / cov;
        cx.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, 480, 480);
        setPoster(c.toDataURL("image/jpeg", 0.72));
      } catch {
        setLive(true); // tainted canvas (no CORS) or no frame — remount visible
      }
    };
    v.addEventListener("loadeddata", capture, { once: true });
    // two-strike: first failure drops crossOrigin (live retry), only a second one kills the tile
    v.addEventListener("error", () => { if (!cancelled) { if (v.crossOrigin) setLive(true); else setDead(true); } }, { once: true });
    v.load();
    return () => { cancelled = true; };
  }, [poster, live, dead, src]);

  if (dead) return null;
  if (poster) return <img src={poster} alt="" />;
  return (
    <video
      ref={vidRef}
      src={`${src}#t=0.1`}
      muted preload="metadata" playsInline
      crossOrigin={live ? undefined : "anonymous"}
      aria-hidden="true" tabIndex={-1}
      style={live ? undefined : { opacity: 0.01 }}
      key={live ? "live" : "capture"}
    />
  );
}

function Lightbox({ photos, index, onClose, onStep, lang }: { photos: Photo[]; index: number; onClose: () => void; onStep: (d: number) => void; lang: Lang }) {
  const cur = photos[index];
  const cap = pick(cur, "caption", lang);
  const vid = cur.video || isVideo(cur.src);
  const [vidFail, setVidFail] = useState(false);
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 });
  const drag = useRef<any>(null);
  const pinchRef = useRef<{ d: number; s: number } | null>(null);
  const lastTap = useRef(0);
  const moved = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const mouse = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const lastTouchEnd = useRef(0);

  // Keep the image from being dragged fully off-screen.
  const clampZ = useCallback((p: { s: number; x: number; y: number }) => {
    if (p.s <= 1) return { s: p.s, x: 0, y: 0 };
    const img = imgRef.current, stage = stageRef.current;
    if (!img || !stage) return p;
    const mx = Math.max(0, (img.clientWidth * p.s - stage.clientWidth) / 2);
    const my = Math.max(0, (img.clientHeight * p.s - stage.clientHeight) / 2);
    return { s: p.s, x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
  }, []);

  const zoomBy = useCallback((f: number) => setZ((p) => {
    const s = Math.max(1, Math.min(4, p.s * f));
    return s <= 1.001 ? { s: 1, x: 0, y: 0 } : clampZ({ ...p, s });
  }), [clampZ]);

  // Wheel zoom on the stage (desktop) — non-passive so the page never scrolls.
  useEffect(() => {
    if (vid) return;
    const el = stageRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy, vid]);

  useEffect(() => { setZ({ s: 1, x: 0, y: 0 }); setVidFail(false); }, [index]);

  // Focus the close button on open; restore focus to the opener on close.
  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => { prevFocus.current?.focus(); };
  }, []);

  // Keyboard zoom (+ / - / 0), photos only.
  useEffect(() => {
    if (vid) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") zoomBy(1.3);
      else if (e.key === "-") zoomBy(1 / 1.3);
      else if (e.key === "0") setZ({ s: 1, x: 0, y: 0 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vid, zoomBy]);

  // Preload neighbours so swiping is instant.
  useEffect(() => {
    [index - 1, index + 1].forEach((j) => {
      const p = photos[(j + photos.length) % photos.length];
      if (p && p.src && !(p.video || isVideo(p.src))) { const im = new Image(); im.src = mediaUrl(p.src, 1400)!; }
    });
  }, [index, photos]);

  const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    moved.current = false;
    if (e.touches.length === 2) { pinchRef.current = { d: dist(e.touches as any), s: z.s }; drag.current = null; return; }
    const now = Date.now();
    if (!(e.target as HTMLElement).closest?.("button")) {
      if (now - lastTap.current < 280) {
        setZ((p) => (p.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }));
        lastTap.current = 0;
      } else lastTap.current = now;
    }
    const t0 = e.touches[0];
    // Touches in the screen-edge strips / top notch band belong to the OS (back gesture) — no swipe bookkeeping.
    if (!(t0.clientX < 24 || t0.clientX > window.innerWidth - 24 || t0.clientY < 12))
      drag.current = { x: t0.clientX, y: t0.clientY, ox: z.x, oy: z.y, dx: 0, dy: 0 };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const s = Math.max(1, Math.min(4, pinchRef.current.s * (dist(e.touches as any) / pinchRef.current.d)));
      setZ((p) => clampZ({ ...p, s }));
      return;
    }
    if (e.touches.length === 1 && drag.current) {
      const dx = e.touches[0].clientX - drag.current.x;
      const dy = e.touches[0].clientY - drag.current.y;
      drag.current.dx = dx; drag.current.dy = dy;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved.current = true;
      if (z.s > 1) setZ((p) => clampZ({ ...p, x: drag.current.ox + dx, y: drag.current.oy + dy }));
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    lastTouchEnd.current = Date.now();
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
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget && !moved.current) onClose(); }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <button ref={closeRef} className="lightbox-close" aria-label={lang === "uz" ? "Yopish" : "Close"} onClick={onClose}>×</button>
      {!vid && (
        <div className="ip-lb-zoom">
          <button type="button" aria-label={lang === "uz" ? "Kattalashtirish" : "Zoom in"} title={lang === "uz" ? "Kattalashtirish" : "Zoom in"} onClick={(e) => { e.stopPropagation(); zoomBy(1.3); }}>&#xff0b;</button>
          <button type="button" aria-label={lang === "uz" ? "Kichiklashtirish" : "Zoom out"} title={lang === "uz" ? "Kichiklashtirish" : "Zoom out"} onClick={(e) => { e.stopPropagation(); zoomBy(1 / 1.3); }}>&#8722;</button>
        </div>
      )}
      <div
        className="ip-lb-stage"
        ref={stageRef}
        style={!vid && z.s > 1 ? { cursor: mouse.current ? "grabbing" : "grab" } : undefined}
        onClick={(e) => { if (e.target === e.currentTarget && !moved.current) onClose(); }}
        onDoubleClick={() => { if (vid || Date.now() - lastTouchEnd.current < 500) return; setZ((p) => (p.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 })); }}
        onMouseDown={(e) => { if (vid || z.s <= 1) return; moved.current = false; mouse.current = { x: e.clientX, y: e.clientY, ox: z.x, oy: z.y }; }}
        onMouseMove={(e) => { if (!mouse.current) return; const m = mouse.current; if (Math.hypot(e.clientX - m.x, e.clientY - m.y) > 4) moved.current = true; setZ((p) => clampZ({ ...p, x: m.ox + e.clientX - m.x, y: m.oy + e.clientY - m.y })); }}
        onMouseUp={() => { if (mouse.current) { mouse.current = null; setZ((p) => clampZ({ ...p })); } }}
        onMouseLeave={() => { mouse.current = null; }}
      >
        {vid
          ? vidFail || !cur.src
            ? <VideoFallback src={cur.src} lang={lang} />
            : <video key={index} src={cur.src} controls playsInline autoPlay muted preload="metadata" onError={(e) => { onVideoError(e); if (e.currentTarget.dataset.failed) setVidFail(true); }} />
          : <img ref={imgRef} src={mediaUrl(cur.src, 1400)} data-original={cur.src} onError={onMediaError} alt={cap} draggable={false} style={{ transform: `translate(${z.x}px, ${z.y}px) scale(${z.s})`, transition: drag.current || pinchRef.current || mouse.current ? "none" : "transform .25s" }} />}
      </div>
      <button className="ip-lb-nav ip-lb-prev" aria-label={lang === "uz" ? "Oldingi" : "Previous"} onClick={(e) => { e.stopPropagation(); onStep(-1); }}>‹</button>
      <button className="ip-lb-nav ip-lb-next" aria-label={lang === "uz" ? "Keyingi" : "Next"} onClick={(e) => { e.stopPropagation(); onStep(1); }}>›</button>
      <div className="lightbox-cap">{cap} <span className="lb-count">{index + 1} / {photos.length}</span></div>
    </div>
  );
}

/* Graceful stand-in for a video that failed to load in the lightbox:
   icon + filename + "unavailable" note (+ direct link as an escape hatch),
   so the user never stares at a broken player. */
function VideoFallback({ src, lang }: { src?: string; lang: Lang }) {
  const raw = (src || "").split("?")[0].split("/").pop() || "";
  let name = raw || "video";
  try { name = decodeURIComponent(name); } catch { /* keep raw name */ }
  return (
    <div className="video-fallback" role="status">
      <span className="vf-icon" aria-hidden>🎬</span>
      <span className="vf-name">{name}</span>
      <span className="vf-note">{lang === "uz" ? "Video hozircha mavjud emas" : "Video is currently unavailable"}</span>
      {src && /^https?:\/\//.test(src) && <a className="vf-link" href={src} target="_blank" rel="noreferrer">{lang === "uz" ? "Yangi oynada ochish" : "Open in new tab"}</a>}
    </div>
  );
}
