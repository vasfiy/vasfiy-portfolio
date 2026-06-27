"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import * as A from "@/lib/admin";
import { uiPrompt, uiConfirm } from "./Dialog";

interface Album { key: string; album: string | null; cat: string | null; photos: any[]; }

export default function AlbumManager({ cats, onChange }: { cats: Record<string, any>; onChange: () => void }) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<{ album: string | null; cat: string | null }>({ album: null, cat: null });

  const load = useCallback(async () => { setPhotos(await A.listItems("gallery")); }, []);
  useEffect(() => { load(); }, [load]);
  const refreshAll = async () => { await load(); onChange(); };

  const albums: Album[] = (() => {
    const order: string[] = [], map: Record<string, Album> = {};
    photos.forEach((p) => {
      const key = p.album ? "a:" + p.album : p.cat ? "c:" + p.cat : "a:Gallery";
      if (!map[key]) { map[key] = { key, album: p.album || null, cat: p.cat || null, photos: [] }; order.push(key); }
      map[key].photos.push(p);
    });
    return order.map((k) => map[k]);
  })();
  const name = (a: Album) => a.album || (a.cat && (cats[a.cat]?.en || a.cat)) || "Gallery";

  const addPhotos = (a: Album) => { target.current = { album: a.album, cat: a.cat }; fileRef.current?.click(); };
  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || !files.length) return;
    setBusy(`Uploading ${files.length}…`); let fail = 0; let lastErr = "";
    for (const f of Array.from(files)) {
      try {
        const file = f.type.startsWith("image") ? await A.compressImage(f) : f;
        const url = await A.uploadFile(file);
        const obj: any = { src: url, caption: "", captionUz: "" };
        if (f.type.startsWith("video")) obj.video = true;
        if (target.current.album) { obj.album = target.current.album; obj.albumUz = target.current.album; }
        if (target.current.cat) obj.cat = target.current.cat;
        await A.addItem("gallery", obj);
      } catch (err: any) { fail++; lastErr = err?.message || String(err); }
    }
    if (fileRef.current) fileRef.current.value = "";
    setBusy(fail ? `⚠ ${fail} upload(s) failed — ${lastErr}` : ""); refreshAll();
  };
  const rename = async (a: Album) => {
    const nn = await uiPrompt("New album name (blank = ungroup):", a.album || "");
    if (nn == null) return; setBusy("Renaming…");
    for (const p of a.photos) await A.updateItem(p.__id, { ...p, album: nn || undefined, albumUz: nn || undefined });
    setBusy(""); refreshAll();
  };
  const delAlbum = async (a: Album) => {
    if (!(await uiConfirm(`Delete album "${name(a)}" and its ${a.photos.length} photo(s)?`))) return;
    setBusy("Deleting…");
    for (const p of a.photos) await A.deleteItem(p.__id);
    setBusy(""); refreshAll();
  };
  const delPhoto = async (p: any) => { if (!(await uiConfirm("Delete this photo?"))) return; await A.deleteItem(p.__id); refreshAll(); };
  const setCover = async (a: Album, p: any) => { for (const x of a.photos) await A.setPinned(x.__id, x.__id === p.__id); refreshAll(); };

  return (
    <div className="ad-card">
      <h3>🗂 Albums — manage existing</h3>
      <p className="ad-hint">Add more photos to an album, rename it, set a cover, or delete photos / whole albums.</p>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={onFiles} />
      {busy && <p className="ad-msg">{busy}</p>}
      {albums.length === 0 && <p className="ad-hint">No albums yet — create one above.</p>}
      {albums.map((a) => {
        const cover = a.photos.find((x) => x.pinned) || a.photos[0];
        const isOpen = open === a.key;
        return (
          <div className="ad-album" key={a.key}>
            <div className="ad-album-head">
              {cover?.src && /^https?:/.test(cover.src) ? <img className="ad-album-cover" src={cover.src} alt="" /> : <span className="ad-album-cover ph">🖼</span>}
              <div className="ad-album-info"><b>{name(a)}</b><span>{a.photos.length} photo{a.photos.length > 1 ? "s" : ""}{a.cat ? " · " + a.cat : ""}</span></div>
              <div className="ad-album-actions">
                <button onClick={() => addPhotos(a)} title="Add photos">＋</button>
                <button onClick={() => rename(a)} title="Rename album">✎</button>
                <button onClick={() => setOpen(isOpen ? null : a.key)} title="Show photos">{isOpen ? "▾" : "▸"}</button>
                <button className="danger" onClick={() => delAlbum(a)} title="Delete album">🗑</button>
              </div>
            </div>
            {isOpen && (
              <div className="ad-album-grid">
                {a.photos.map((p) => (
                  <div className={"ad-album-ph" + (p.pinned ? " is-cover" : "")} key={p.__id}>
                    {p.video ? <video src={p.src} muted /> : <img src={p.src} alt="" />}
                    {p.pinned && <span className="ad-cover-badge">cover</span>}
                    <div className="ad-album-ph-actions">
                      <button onClick={() => setCover(a, p)} title="Set as cover">★</button>
                      <button className="danger" onClick={() => delPhoto(p)} title="Delete photo">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
