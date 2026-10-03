"use client";

/* BookReader — the site's book reading experience.
 *
 * A full-screen, dark-chrome reader (GitHub-PDF-preview quality) that replaces
 * the old <iframe> modal:
 *   - PDF pages are rendered to <canvas> by pdf.js, loaded through a dynamic
 *     import so the library never enters the main bundle; its worker is served
 *     from /pdfjs/pdf.worker.min.mjs (copied out of node_modules once).
 *   - Virtualized: only the current page ± 1 exists in the DOM. Pages leaving
 *     that window get their render task cancelled and their parsed page proxy
 *     cleaned up, so a 1000-page book costs the same as a 3-page one.
 *   - Each page paints off-DOM into a scratch canvas at device resolution and
 *     is blitted onto the visible canvas in a single frame — zooming never
 *     flashes a blank (or black) page.
 *   - Pages within the ±1 window stay painted, so flipping back and forth is
 *     an instant cross-fade, not a re-render.
 *   - Reading position (last page) is remembered per book in localStorage and
 *     restored on reopen — with a small "resumed" hint.
 *   - Non-PDF files (epub/txt/…) degrade gracefully to the open-in-new-tab +
 *     download pattern with a localized explanation.
 * The modal shell semantics of the old reader are preserved: role=dialog,
 * focus moved in and restored on close, Escape (fullscreen-aware), body
 * scroll lock.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OnProgressParameters, PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { Lang } from "@/lib/types";
import { useLang } from "./Providers";
import S from "./book-reader.module.css";

/* ---------- localized labels (new reader copy; shared chrome reuses t()) ---------- */

interface Labels {
  loading: string;
  errorTitle: string;
  errorHint: string;
  retry: string;
  openOriginal: string;
  unsupported: string;
  unsupportedHint: string;
  fitWidth: string;
  zoomIn: string;
  zoomOut: string;
  enterFs: string;
  exitFs: string;
  page: string;
  gotoPage: string;
  resumedAt: string;
}

const EN: Labels = {
  loading: "Loading book…",
  errorTitle: "Couldn't open this document",
  errorHint: "Check your connection, or try the original file instead.",
  retry: "Retry",
  openOriginal: "Open original",
  unsupported: "This format can't be previewed right in the browser.",
  unsupportedHint: "Open it in a new tab or download it to read offline.",
  fitWidth: "Fit width",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  enterFs: "Fullscreen",
  exitFs: "Exit fullscreen",
  page: "Page",
  gotoPage: "Go to page",
  resumedAt: "Resumed at page",
};

const UZ: Labels = {
  loading: "Kitob yuklanmoqda…",
  errorTitle: "Hujjatni ochib bo'lmadi",
  errorHint: "Internet aloqasini tekshiring yoki asl faylni ochib ko'ring.",
  retry: "Qayta urinish",
  openOriginal: "Asl faylni ochish",
  unsupported: "Bu format brauzerda to'g'ridan-to'g'ri ko'rsatilmaydi.",
  unsupportedHint: "Yangi oynada oching yoki o'qish uchun yuklab oling.",
  fitWidth: "Eniga moslash",
  zoomIn: "Kattalashtirish",
  zoomOut: "Kichiklashtirish",
  enterFs: "To'liq ekran",
  exitFs: "To'liq ekrandan chiqish",
  page: "Sahifa",
  gotoPage: "Sahifaga o'tish",
  resumedAt: "Oxirgi o'qilgan sahifa",
};

const L10N: Record<Lang, Labels> = { en: EN, uz: UZ };

/* ---------- constants ---------- */

/** Zoom is a multiplier over the fit-width scale; +/− walks these stops. */
const ZOOMS = [0.5, 0.65, 0.8, 1, 1.25, 1.5, 2, 2.5, 3, 4];
/** Device-pixel-ratio cap: bounds canvas memory on 3x phones. */
const DPR_CAP = 2;
/** Horizontal breathing room around the page — mirrors .pageLayer's CSS margin. */
const STAGE_PAD = 24;

const nearestZoom = (z: number) =>
  ZOOMS.reduce((best, v, i) => (Math.abs(v - z) < Math.abs(ZOOMS[best] - z) ? i : best), 0);

/* ---------- per-book position memory ---------- */

const posKey = (bookId: string) => `book-pos:${bookId}`;

function readSavedPage(bookId: string): number {
  try {
    const n = parseInt(localStorage.getItem(posKey(bookId)) || "", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0; // private mode — position memory is a nicety, never a requirement
  }
}

function savePage(bookId: string, page: number) {
  try {
    localStorage.setItem(posKey(bookId), String(page));
  } catch {
    /* as above */
  }
}

/* ---------- shared download (the library grid uses this too) ---------- */

export async function downloadFile(url: string, bare: string) {
  try {
    const r = await fetch(url);
    const b = await r.blob();
    // extension comes from the served MIME type when the name lacks one (.pdf last resort)
    const name = /\.\w+$/.test(bare) ? bare : bare + "." + ((b.type.split("/")[1] || "pdf").split(";")[0].trim() || "pdf");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  } catch {
    window.open(url + (url.includes("?") ? "&" : "?") + "download", "_blank");
  }
}

/* ---------- minimal line icons (24px grid, stroke inherits currentColor) ---------- */

const Ico = ({ d }: { d: React.ReactNode }) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const IC = {
  close: <path d="M6 6l12 12M18 6 6 18" />,
  left: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  right: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  minus: <path d="M5.5 12h13" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  fit: <><path d="M4 9V6.5A2.5 2.5 0 0 1 6.5 4H9" /><path d="M15 4h2.5A2.5 2.5 0 0 1 20 6.5V9" /><path d="M20 15v2.5a2.5 2.5 0 0 1-2.5 2.5H15" /><path d="M9 20H6.5A2.5 2.5 0 0 1 4 17.5V15" /></>,
  fs: <><path d="M9 4H6a2 2 0 0 0-2 2v3" /><path d="M15 4h3a2 2 0 0 1 2 2v3" /><path d="M20 15v3a2 2 0 0 1-2 2h-3" /><path d="M9 20H6a2 2 0 0 1-2-2v-3" /></>,
  fsExit: <><path d="M9 4v3a2 2 0 0 1-2 2H4" /><path d="M15 4v3a2 2 0 0 0 2 2h3" /><path d="M20 15h-3a2 2 0 0 0-2 2v3" /><path d="M9 20v-3a2 2 0 0 0-2-2H4" /></>,
  external: <><path d="M14 5h5v5" /><path d="M19 5l-8 8" /><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" /></>,
  download: <><path d="M12 4v11" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></>,
  warn: <><path d="M12 3.5 21.5 20h-19L12 3.5Z" /><path d="M12 10v4" /><path d="M12 17v.01" /></>,
  doc: <><path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3Z" /><path d="M13.5 3v5.5H19" /><path d="M9 13h6M9 17h4" /></>,
};

/* ---------- one rendered PDF page ----------
   Mounted only while inside the current page ± 1 window. Renders off-DOM at
   device resolution, then blits; reports its scale-1 size once known. */

function PageCanvas({ doc, pageNumber, scale, active, onSize }: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  active: boolean;
  onSize: (n: number, w: number, h: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const taskRef = useRef<RenderTask | null>(null);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !(scale > 0)) return;
    let dead = false;

    (async () => {
      try {
        const p = await doc.getPage(pageNumber);
        if (dead) return;
        const base = p.getViewport({ scale: 1 });
        onSize(pageNumber, base.width, base.height);

        const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
        const vp = p.getViewport({ scale });
        const cssW = Math.floor(vp.width);
        const cssH = Math.floor(vp.height);

        // paint off-DOM first, then blit in one frame — zooming never flashes
        const scratch = document.createElement("canvas");
        scratch.width = Math.floor(vp.width * dpr);
        scratch.height = Math.floor(vp.height * dpr);
        const sctx = scratch.getContext("2d", { alpha: false });
        if (!sctx) return;
        sctx.fillStyle = "#ffffff";
        sctx.fillRect(0, 0, scratch.width, scratch.height);
        // v6: canvas must be null when rendering through a raw canvasContext
        const task = p.render({ canvas: null, canvasContext: sctx, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
        taskRef.current = task;
        await task.promise;
        if (dead) return;
        canvas.width = scratch.width;
        canvas.height = scratch.height;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(scratch, 0, 0);
        setPainted(true);
      } catch (err) {
        // cancellations are the normal cost of fast paging/zooming — ignore them
        if (!dead && (err as { name?: string })?.name !== "RenderingCancelledException") setPainted(false);
      }
    })();

    return () => {
      dead = true;
      taskRef.current?.cancel();
      taskRef.current = null;
    };
  }, [doc, pageNumber, scale, onSize]);

  // evicted from the ±1 window → free this page's parsed glyph/image caches
  useEffect(() => () => {
    doc.getPage(pageNumber).then((p) => p.cleanup()).catch(() => {});
  }, [doc, pageNumber]);

  return (
    <div className={S.pageWrap + (active ? ` ${S.active}` : "")} aria-hidden={!active}>
      <canvas ref={canvasRef} className={S.canvas + (painted ? ` ${S.painted}` : "")} />
    </div>
  );
}

/* ---------- the reader ---------- */

export interface BookReaderProps {
  /** Absolute URL of the book file (PDF or other). */
  file: string;
  /** Localized display title. */
  title: string;
  /** Stable per-book key (book __id, or the file URL) for position memory. */
  bookId: string;
  onClose: () => void;
}

export default function BookReader({ file, title, bookId, onClose }: BookReaderProps) {
  const { lang, t } = useLang();
  const L = L10N[lang];
  const isPdf = /\.pdf(\?|$)/i.test(file);

  /* ----- modal shell state ----- */
  const shellRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [isFs, setIsFs] = useState(false);

  // scroll lock + move focus in on open, restore on close (as the old modal did)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFs = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }, []);

  /* ----- pdf engine state ----- */
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "fallback">(isPdf ? "loading" : "fallback");
  const [progress, setProgress] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [resumed, setResumed] = useState(false);
  const [zoom, setZoom] = useState(1); // multiplier over fit-width

  // one load per open (+ retries); a destroyed loading task also tears down the worker
  useEffect(() => {
    if (!isPdf) return;
    let dead = false;
    let task: PDFDocumentLoadingTask | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist"); // never in the main bundle
        if (dead) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        const lt = pdfjs.getDocument({ url: file });
        task = lt;
        lt.onProgress = (p: OnProgressParameters) => {
          if (!dead && p.total > 0) setProgress(Math.min(100, Math.round((p.loaded / p.total) * 100)));
        };
        const doc = await lt.promise;
        if (dead) {
          void lt.destroy(); // v6: teardown lives on the loading task, not the proxy
          return;
        }
        const saved = readSavedPage(bookId);
        const first = Math.max(1, Math.min(saved || 1, doc.numPages));
        setPdf(doc);
        setNumPages(doc.numPages);
        setPage(first);
        setStatus("ready");
        if (saved > 1 && saved <= doc.numPages) setResumed(true);
      } catch {
        if (!dead) setStatus("error");
      }
    })();
    return () => {
      dead = true;
      void task?.destroy();
    };
  }, [file, bookId, isPdf, attempt]);

  const retry = useCallback(() => {
    setProgress(0);
    setStatus("loading");
    setAttempt((a) => a + 1);
  }, []);

  // auto-hide the "resumed" hint
  useEffect(() => {
    if (!resumed) return;
    const id = window.setTimeout(() => setResumed(false), 3200);
    return () => window.clearTimeout(id);
  }, [resumed]);

  // persist position: on every page turn while a book is open
  useEffect(() => {
    if (status === "ready") savePage(bookId, page);
  }, [status, page, bookId]);

  /* ----- stage measuring → fit-width scale ----- */
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(0);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setStageW(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [sizes, setSizes] = useState<Record<number, { w: number; h: number }>>({});
  const onSize = useCallback((n: number, w: number, h: number) => {
    setSizes((s) => (s[n] && s[n].w === w ? s : { ...s, [n]: { w, h } }));
  }, []);

  const fitScale = useMemo(() => {
    const base = sizes[page];
    if (!base || stageW <= 0) return 0;
    return Math.max(0.05, (stageW - STAGE_PAD * 2) / base.w);
  }, [sizes, page, stageW]);
  const scale = fitScale * zoom; // 0 until first measure

  // the virtualization window: current page ± 1, nothing else exists in the DOM
  const pageWindow = useMemo(() => {
    const arr: number[] = [];
    for (let n = page - 1; n <= page + 1; n++) if (n >= 1 && n <= numPages) arr.push(n);
    return arr;
  }, [page, numPages]);

  const base = sizes[page];
  const layerW = base && scale > 0 ? Math.ceil(base.w * scale) : 0;
  const layerH = base && scale > 0 ? Math.ceil(base.h * scale) : 0;

  /* ----- navigation / zoom helpers ----- */
  const stepZoom = useCallback((dir: 1 | -1) => {
    setZoom((z) => ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, nearestZoom(z) + dir))]);
  }, []);

  // latest values for the single long-lived keydown listener
  const nav = useRef({ status, page, numPages });
  nav.current = { status, page, numPages };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // in fullscreen the browser exits fullscreen itself; only close from windowed mode
        if (!document.fullscreenElement) {
          e.preventDefault();
          onClose();
        }
        return;
      }
      if (e.key === "Tab") {
        // focus trap: cycle within the dialog
        const root = shellRef.current;
        if (!root) return;
        const els = Array.from(
          root.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        const ae = document.activeElement as HTMLElement | null;
        if (e.shiftKey && (ae === first || !ae || !root.contains(ae))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && ae === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      const s = nav.current;
      if (s.status !== "ready") return;
      if (e.target instanceof HTMLInputElement) return; // typing a page number
      switch (e.key) {
        case "ArrowLeft":
        case "PageUp":
          if (s.page > 1) { e.preventDefault(); setPage(s.page - 1); }
          break;
        case "ArrowRight":
        case "PageDown":
          if (s.page < s.numPages) { e.preventDefault(); setPage(s.page + 1); }
          break;
        case "Home":
          e.preventDefault();
          setPage(1);
          break;
        case "End":
          e.preventDefault();
          setPage(s.numPages);
          break;
        case "+":
        case "=":
          stepZoom(1);
          break;
        case "-":
        case "_":
          stepZoom(-1);
          break;
        case "0":
          setZoom(1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, stepZoom]);

  // start every page at its top-left corner
  useEffect(() => {
    stageRef.current?.scrollTo({ left: 0, top: 0, behavior: "auto" });
  }, [page]);

  // ctrl/cmd + wheel zooms (professional-viewer staple); needs a non-passive listener
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const dir: 1 | -1 = e.deltaY < 0 ? 1 : -1;
      setZoom((z) => ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, nearestZoom(z) + dir))]);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ----- mouse-drag panning when zoomed ----- */
  const pan = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = stageRef.current;
    if (!el || el.scrollWidth <= el.clientWidth + 1) return; // nothing to pan
    pan.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
    setDragging(true);
    try { el.setPointerCapture(e.pointerId); } catch { /* older engines */ }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    const p0 = pan.current;
    if (!el || !p0) return;
    el.scrollLeft = p0.sl - (e.clientX - p0.x);
    el.scrollTop = p0.st - (e.clientY - p0.y);
  };
  const onPointerUp = () => {
    pan.current = null;
    setDragging(false);
  };

  /* ----- touch: horizontal swipe flips pages at fit width ----- */
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const tt = e.touches[0];
    touch.current = { x: tt.clientX, y: tt.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    const el = stageRef.current;
    if (!start || !el || nav.current.status !== "ready") return;
    const tt = e.changedTouches[0];
    const dx = tt.clientX - start.x;
    const dy = tt.clientY - start.y;
    // flip only when nothing scrolls horizontally (fit-width); when zoomed the
    // native horizontal scroll pans instead
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4 && el.scrollWidth <= el.clientWidth + 8) {
      if (dx < 0 && nav.current.page < nav.current.numPages) setPage(nav.current.page + 1);
      else if (dx > 0 && nav.current.page > 1) setPage(nav.current.page - 1);
    }
  };

  /* ----- page number input ----- */
  const [pageDraft, setPageDraft] = useState("1");
  useEffect(() => {
    setPageDraft(String(page));
  }, [page]);
  const commitDraft = () => {
    const n = parseInt(pageDraft, 10);
    if (Number.isFinite(n) && n >= 1 && n <= numPages) setPage(n);
    else setPageDraft(String(page));
  };

  /* ----- backdrop click (guard so a drag ending outside never closes) ----- */
  const backdropDown = useRef(false);

  const ready = status === "ready" && pdf !== null && numPages > 0;

  return (
    <div
      className={S.overlay}
      role="presentation"
      onPointerDown={(e) => { backdropDown.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (backdropDown.current && e.target === e.currentTarget) onClose(); }}
    >
      <div ref={shellRef} className={S.shell + (isFs ? ` ${S.fs}` : "")} role="dialog" aria-modal="true" aria-label={title}>
        {/* ---------- toolbar ---------- */}
        <div className={S.toolbar}>
          <span className={S.title} title={title}>{title}</span>

          {ready && (
            <div className={S.group}>
              <button type="button" className={S.toolBtn} onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label={t("ui.prev")} title={t("ui.prev")}>
                <Ico d={IC.left} />
              </button>
              <span className={S.pageBox}>
                <input
                  className={S.pageInput}
                  style={{ width: `${Math.max(2, String(numPages).length)}ch` }}
                  value={pageDraft}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label={L.gotoPage}
                  onChange={(e) => setPageDraft(e.target.value.replace(/\D/g, ""))}
                  onBlur={commitDraft}
                  onKeyDown={(e) => { if (e.key === "Enter") { commitDraft(); e.currentTarget.blur(); } }}
                />
                <span aria-hidden="true">/ {numPages}</span>
              </span>
              <button type="button" className={S.toolBtn} onClick={() => setPage(page + 1)} disabled={page >= numPages} aria-label={t("ui.next")} title={t("ui.next")}>
                <Ico d={IC.right} />
              </button>
            </div>
          )}
          {ready && <span className={S.sep} aria-hidden="true" />}

          {ready && (
            <div className={S.group}>
              <button type="button" className={S.toolBtn} onClick={() => stepZoom(-1)} disabled={zoom <= ZOOMS[0] + 1e-9} aria-label={L.zoomOut} title={L.zoomOut}>
                <Ico d={IC.minus} />
              </button>
              <span className={S.zoomLabel + " " + S.hideSm}>{scale > 0 ? `${Math.round(scale * 100)}%` : "–"}</span>
              <button type="button" className={S.toolBtn} onClick={() => stepZoom(1)} disabled={zoom >= ZOOMS[ZOOMS.length - 1] - 1e-9} aria-label={L.zoomIn} title={L.zoomIn}>
                <Ico d={IC.plus} />
              </button>
              <button
                type="button"
                className={S.toolBtn + " " + S.hideSm + (zoom === 1 ? ` ${S.toolBtnOn}` : "")}
                onClick={() => setZoom(1)}
                disabled={zoom === 1}
                aria-label={L.fitWidth}
                title={L.fitWidth}
              >
                <Ico d={IC.fit} />
              </button>
            </div>
          )}

          <span className={S.spacer} />

          <div className={S.group}>
            <a className={S.toolBtn + " " + S.hideSm} href={file} target="_blank" rel="noopener" aria-label={L.openOriginal} title={L.openOriginal}>
              <Ico d={IC.external} />
            </a>
            <button type="button" className={S.toolBtn + " " + S.hideSm} onClick={() => downloadFile(file, title)} aria-label={t("library.download")} title={t("library.download")}>
              <Ico d={IC.download} />
            </button>
            <button type="button" className={S.toolBtn + " " + S.hideSm} onClick={toggleFs} aria-label={isFs ? L.exitFs : L.enterFs} title={isFs ? L.exitFs : L.enterFs}>
              <Ico d={isFs ? IC.fsExit : IC.fs} />
            </button>
            <button type="button" ref={closeBtnRef} className={S.toolBtn} onClick={onClose} aria-label={t("ui.close")} title={t("ui.close")}>
              <Ico d={IC.close} />
            </button>
          </div>
        </div>

        {/* ---------- stage ---------- */}
        <div
          ref={stageRef}
          className={S.stage + (dragging ? ` ${S.dragging}` : "")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {ready && pdf && (
            <div className={S.pageLayer} style={{ width: layerW || undefined, height: layerH || undefined }}>
              {pageWindow.map((n) => (
                <PageCanvas key={n} doc={pdf} pageNumber={n} scale={scale} active={n === page} onSize={onSize} />
              ))}
            </div>
          )}

          {status === "loading" && (
            <div className={S.center}>
              <div className={S.skeleton} role="status" aria-live="polite" aria-label={L.loading}>
                <div className={S.pageSkeleton} />
                <div className={S.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                  <div className={S.progressFill} style={{ width: `${progress}%` }} />
                </div>
                <div className={S.progressText}>{L.loading}{progress > 0 ? ` ${progress}%` : ""}</div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className={S.center}>
              <div className={S.notice} role="alert">
                <span className={S.noticeIcon}><Ico d={IC.warn} /></span>
                <h2 className={S.noticeTitle}>{L.errorTitle}</h2>
                <p className={S.noticeText}>{L.errorHint}</p>
                <div className={S.noticeActions}>
                  <a className={S.actBtn} href={file} target="_blank" rel="noopener">{L.openOriginal}</a>
                  <button type="button" className={S.actBtnGhost} onClick={() => downloadFile(file, title)}>{t("library.download")}</button>
                  <button type="button" className={S.actBtnGhost} onClick={retry}>{L.retry}</button>
                </div>
              </div>
            </div>
          )}

          {status === "fallback" && (
            <div className={S.center}>
              <div className={S.notice}>
                <span className={S.noticeIcon}><Ico d={IC.doc} /></span>
                <h2 className={S.noticeTitle}>{title}</h2>
                <p className={S.noticeText}>{L.unsupported}</p>
                <p className={S.noticeText}>{L.unsupportedHint}</p>
                <div className={S.noticeActions}>
                  <a className={S.actBtn} href={file} target="_blank" rel="noopener">{t("lib.readOnline")}</a>
                  <button type="button" className={S.actBtnGhost} onClick={() => downloadFile(file, title)}>{t("library.download")}</button>
                </div>
              </div>
            </div>
          )}

          {ready && resumed && (
            <span className={S.resumeChip} role="status">{L.resumedAt} {page}</span>
          )}
        </div>

        {/* screen-reader page announcements */}
        {ready && <span className={S.srOnly} role="status" aria-live="polite">{`${L.page} ${page} / ${numPages}`}</span>}
      </div>
    </div>
  );
}
