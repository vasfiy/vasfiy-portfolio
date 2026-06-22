"use client";
import { useEffect, useRef, useState } from "react";

interface Box { x: number; y: number; w: number; h: number; }

export default function CropModal({ file, onDone, onCancel }: { file: File; onDone: (f: File) => void; onCancel: () => void; }) {
  const [url, setUrl] = useState("");
  const [rect, setRect] = useState<Box | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ mode: "move" | "resize"; sx: number; sy: number; o: Box } | null>(null);

  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);

  const onLoad = () => {
    const img = imgRef.current; if (!img) return;
    const w = img.clientWidth, h = img.clientHeight;
    const s = Math.min(w, h) * 0.8;
    setRect({ x: (w - s) / 2, y: (h - s) / 2, w: s, h: s });
  };

  const clamp = (b: Box): Box => {
    const img = imgRef.current!; const W = img.clientWidth, H = img.clientHeight;
    let { x, y, w, h } = b;
    w = Math.max(40, Math.min(w, W)); h = Math.max(40, Math.min(h, H));
    x = Math.max(0, Math.min(x, W - w)); y = Math.max(0, Math.min(y, H - h));
    return { x, y, w, h };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current || !rect) return;
      const d = drag.current; const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (d.mode === "move") setRect(clamp({ ...d.o, x: d.o.x + dx, y: d.o.y + dy }));
      else { let w = d.o.w + dx; let h = ratio ? w / ratio : d.o.h + dy; setRect(clamp({ x: d.o.x, y: d.o.y, w, h })); }
    };
    const onUp = () => { drag.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [rect, ratio]);

  const startDrag = (mode: "move" | "resize") => (e: React.PointerEvent) => {
    e.stopPropagation(); if (!rect) return;
    drag.current = { mode, sx: e.clientX, sy: e.clientY, o: rect };
  };

  const applyRatio = (r: number | null) => {
    setRatio(r);
    if (r && rect) { setRect(clamp({ ...rect, h: rect.w / r })); }
  };

  const confirm = async () => {
    const img = imgRef.current; if (!img || !rect) return;
    const scale = img.naturalWidth / img.clientWidth;
    const sx = rect.x * scale, sy = rect.y * scale, sw = rect.w * scale, sh = rect.h * scale;
    const max = 1600; let ow = sw, oh = sh;
    if (Math.max(ow, oh) > max) { const k = max / Math.max(ow, oh); ow *= k; oh *= k; }
    const canvas = document.createElement("canvas"); canvas.width = Math.round(ow); canvas.height = Math.round(oh);
    const ctx = canvas.getContext("2d"); if (!ctx) return onDone(file);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.9));
    if (!blob) return onDone(file);
    onDone(new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" }));
  };

  return (
    <div className="crop-overlay" onClick={onCancel}>
      <div className="crop-modal glass" onClick={(e) => e.stopPropagation()}>
        <h3>Crop image</h3>
        <div className="crop-ratios">
          {([["Free", null], ["1:1", 1], ["4:3", 4 / 3], ["16:9", 16 / 9], ["3:4", 3 / 4]] as [string, number | null][]).map(([l, r]) => (
            <button key={l} className={"filter-chip" + (ratio === r ? " active" : "")} onClick={() => applyRatio(r)}>{l}</button>
          ))}
        </div>
        <div className="crop-stage">
          {url && <img ref={imgRef} src={url} alt="" onLoad={onLoad} draggable={false} />}
          {rect && (
            <div className="crop-box" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} onPointerDown={startDrag("move")}>
              <span className="crop-handle" onPointerDown={startDrag("resize")} />
            </div>
          )}
        </div>
        <div className="crop-actions">
          <button className="btn btn-primary" onClick={confirm}>Crop &amp; use</button>
          <button className="btn btn-ghost" onClick={() => onDone(file)}>Use original</button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
