"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import type { Collection, Field } from "@/lib/adminSchema";
import * as A from "@/lib/admin";
import AlbumManager from "./AlbumManager";
import RichText from "./RichText";
import CropModal from "./CropModal";
import { uiConfirm, uiPrompt } from "./Dialog";

function FieldInput({ f, value, onChange, cats, onUpload }: { f: Field; value: any; onChange: (v: any) => void; cats: Record<string, any>; onUpload: (file: File, isImage: boolean) => Promise<string>; }) {
  const [busy, setBusy] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [upErr, setUpErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  if (f.t === "textarea" || f.t === "list") {
    const v = f.t === "list" && Array.isArray(value) ? value.join("\n") : (value || "");
    return <textarea rows={f.t === "list" ? 3 : 4} value={v} placeholder={f.ph} onChange={(e) => onChange(e.target.value)} />;
  }
  if (f.t === "date") return <input type="date" className="ad-date" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  if (f.t === "html") return <RichText value={value || ""} onChange={onChange} placeholder={f.ph} />;
  if (f.t === "select") return <select value={value || f.opts?.[0]} onChange={(e) => onChange(e.target.value)}>{f.opts?.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
  if (f.t === "cat") {
    const keys = Object.keys(cats);
    return (
      <div className="ad-row">
        <input type="text" value={value || ""} placeholder="category key" list={"cats-" + f.k} onChange={(e) => onChange(e.target.value)} />
        <datalist id={"cats-" + f.k}>{keys.map((k) => <option key={k} value={k} />)}</datalist>
      </div>
    );
  }
  if (f.t === "files") {
    const list: any[] = Array.isArray(value) ? value : [];
    const ic = (ty = "") => (/^image/.test(ty) ? "🖼" : /video/.test(ty) ? "🎬" : /pdf/.test(ty) ? "📄" : /html/.test(ty) ? "🌐" : "📎");
    return (
      <div className="ad-files">
        <input ref={fileRef} type="file" multiple hidden onChange={async (e) => {
          const files = e.target.files; if (!files) return; setBusy(true); setUpErr("");
          const added: any[] = []; let failed = 0;
          for (const file of Array.from(files)) { try { const url = await onUpload(file, file.type.startsWith("image")); added.push({ url, name: file.name, type: file.type }); } catch (err: any) { failed++; setUpErr(`Upload failed: ${file.name} — ${err?.message || err}`); } }
          if (added.length) onChange([...list, ...added]); setBusy(false); if (fileRef.current) fileRef.current.value = "";
        }} />
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "⏳ Uploading…" : "+ Add files (HTML / PDF / image / video)"}</button>
        {upErr && <p className="ad-up-err">⚠ {upErr}</p>}
        <div className="ad-file-list">
          {list.map((a, i) => (
            <div className="ad-file-row" key={i}><a href={a.url} target="_blank" rel="noopener">{ic(a.type)} {a.name || a.url}</a><button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))}>✕</button></div>
          ))}
        </div>
      </div>
    );
  }
  if (f.t === "image" || f.t === "file") {
    const isImage = f.t === "image";
    const doUpload = async (file: File) => { setBusy(true); setUpErr(""); try { const url = await onUpload(file, isImage); onChange(url); } catch (err: any) { setUpErr(`Upload failed — ${err?.message || err}`); } finally { setBusy(false); } };
    return (
      <div className="ad-upload">
        <input ref={fileRef} type="file" accept={f.accept || (isImage ? "image/*" : undefined)} hidden onChange={(e) => {
          const file = e.target.files?.[0]; if (!file) return;
          if (isImage && /^image\//.test(file.type) && !/gif|svg/.test(file.type)) setCropFile(file); else doUpload(file);
          if (fileRef.current) fileRef.current.value = "";
        }} />
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "⏳ Uploading…" : (value ? "Replace" : "Upload")}</button>
        {value && (isImage ? <img className="ad-thumb" src={value} alt="" /> : <a href={value} target="_blank" rel="noopener" className="ad-filelink">📄 file ↗</a>)}
        <input type="text" value={value || ""} placeholder="…or paste a URL" onChange={(e) => onChange(e.target.value)} />
        {upErr && <p className="ad-up-err">⚠ {upErr}</p>}
        {cropFile && <CropModal file={cropFile} onCancel={() => setCropFile(null)} onDone={(f2) => { setCropFile(null); doUpload(f2); }} />}
      </div>
    );
  }
  return <input type="text" value={value || ""} placeholder={f.ph} onChange={(e) => onChange(e.target.value)} />;
}

export default function ItemManager({ collection }: { collection: Collection }) {
  const c = collection;
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<Record<string, any>>({});
  const [form, setForm] = useState<any>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [albumFiles, setAlbumFiles] = useState<{ url: string; type: string }[]>([]);
  const [albumMeta, setAlbumMeta] = useState({ album: "", cat: "", caption: "" });
  const [albumBusy, setAlbumBusy] = useState(false);
  const albumInput = useRef<HTMLInputElement>(null);

  // New items default the date field to today (YYYY-MM-DD).
  const freshForm = useCallback(() => (c.fields.some((f) => f.k === "date") ? { date: new Date().toISOString().slice(0, 10) } : {}), [c.fields]);
  const load = useCallback(async () => {
    setItems(await A.listItems(c.kind));
    if (c.cats) setCats(await A.listCats(c.kind));
  }, [c.kind, c.cats]);
  useEffect(() => { load(); setForm(freshForm()); setEditId(null); }, [load, freshForm]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };
  const upload = async (file: File, isImage: boolean) => { const f = isImage ? await A.compressImage(file) : file; return A.uploadFile(f); };

  const save = async () => {
    const obj: any = { ...form };
    c.fields.forEach((f) => { if (f.t === "list" && typeof obj[f.k] === "string") obj[f.k] = obj[f.k].split("\n").map((s: string) => s.trim()).filter(Boolean); });
    if (c.kind === "blog" && obj.media && (obj.type === "image" || obj.type === "video") && !/^https?:|^data:/.test(obj.media)) { /* keep */ }
    try {
      if (editId) await A.updateItem(editId, obj); else await A.addItem(c.kind, obj);
      setForm(freshForm()); setEditId(null); await load(); flash(editId ? "✓ Saved" : "✓ Added — live now");
    } catch (e: any) { flash("Error: " + (e.message || e)); }
  };
  const edit = (it: any) => { setEditId(it.__id); setForm({ ...it }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const remove = async (it: any) => { if (!(await uiConfirm("Delete this item?"))) return; await A.deleteItem(it.__id); await load(); flash("Deleted"); };
  const togglePin = async (it: any) => { await A.setPinned(it.__id, !it.pinned); await load(); };
  const toggleArchive = async (it: any) => { await A.setArchived(it.__id, it, !it.archived); await load(); };
  // Quick-assign a category to an existing item straight from the list (optimistic + feedback)
  const setItemCat = async (it: any, cat: string) => {
    setItems((arr) => arr.map((x) => (x.__id === it.__id ? { ...x, cat } : x)));
    try { await A.updateItem(it.__id, { ...it, cat }); flash(cat ? "✓ Category set — live now" : "✓ Category cleared"); }
    catch (e: any) { flash("Error: " + (e?.message || e)); await load(); }
  };
  const newCatThenAssign = async (it: any) => {
    const name = await uiPrompt("New category name:");
    if (!name || !name.trim()) return;
    const key = name.trim();
    setItems((arr) => arr.map((x) => (x.__id === it.__id ? { ...x, cat: key } : x)));
    try { await A.saveCat(c.kind, key, { en: key, uz: "", icon: "" }); await A.updateItem(it.__id, { ...it, cat: key }); await load(); flash("✓ Category created & assigned"); }
    catch (e: any) { flash("Error: " + (e?.message || e)); await load(); }
  };
  const move = async (it: any, dir: "up" | "down") => { await A.moveItem(c.kind, it.__id, dir); await load(); };
  const dropTo = async (toIdx: number) => {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); return; }
    const arr = items.slice();
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(toIdx, 0, moved);
    setItems(arr); setDragIdx(null);
    try { await A.reorder(arr.map((x) => x.__id)); await load(); } catch {}
  };

  // Gallery album multi-upload
  const addAlbumFiles = async (files: FileList) => {
    setAlbumBusy(true); let fail = 0; let lastErr = "";
    for (const f of Array.from(files)) {
      try { const isVid = f.type.startsWith("video"); const file = isVid ? f : await A.compressImage(f); const url = await A.uploadFile(file); setAlbumFiles((p) => [...p, { url, type: isVid ? "video" : "image" }]); } catch (e: any) { fail++; lastErr = e?.message || String(e); }
    }
    if (fail) flash(`⚠ ${fail} upload(s) failed — ${lastErr}`);
    setAlbumBusy(false);
  };
  const postAlbum = async () => {
    if (!albumFiles.length) return; setAlbumBusy(true);
    try {
      for (const m of albumFiles) {
        const obj: any = { src: m.url, caption: albumMeta.caption, captionUz: albumMeta.caption };
        if (albumMeta.album) { obj.album = albumMeta.album; obj.albumUz = albumMeta.album; }
        if (albumMeta.cat) obj.cat = albumMeta.cat;
        if (m.type === "video") obj.video = true;
        await A.addItem("gallery", obj);
      }
      const n = albumFiles.length; setAlbumFiles([]); setAlbumMeta({ album: "", cat: "", caption: "" }); await load();
      flash(`✓ ${n} photo${n > 1 ? "s" : ""} posted`);
    } catch (e: any) { flash("Error: " + (e.message || e)); } finally { setAlbumBusy(false); }
  };

  return (
    <div className="ad-section">
      <div className="ad-head"><h2>{c.icon} {c.label}</h2>{msg && <span className="ad-msg">{msg}</span>}</div>

      {c.album && (
        <div className="ad-card">
          <h3>📸 New album / photos</h3>
          <div className="ad-grid2">
            <input placeholder="Album name (optional)" value={albumMeta.album} onChange={(e) => setAlbumMeta({ ...albumMeta, album: e.target.value })} />
            <input placeholder="Category key (optional)" value={albumMeta.cat} list="cats-album" onChange={(e) => setAlbumMeta({ ...albumMeta, cat: e.target.value })} />
            <datalist id="cats-album">{Object.keys(cats).map((k) => <option key={k} value={k} />)}</datalist>
          </div>
          <input placeholder="Caption for all (optional)" value={albumMeta.caption} onChange={(e) => setAlbumMeta({ ...albumMeta, caption: e.target.value })} />
          <div className="ad-dropzone" onClick={() => albumInput.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) addAlbumFiles(e.dataTransfer.files); }}>
            <input ref={albumInput} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files?.length) addAlbumFiles(e.target.files); }} />
            {albumBusy ? "⏳ Uploading…" : "⬆ Drop photos or click — select 30+ at once"}
          </div>
          {albumFiles.length > 0 && <div className="ad-thumbs">{albumFiles.map((m, i) => <div className="ad-tn" key={i}>{m.type === "video" ? <video src={m.url} muted /> : <img src={m.url} alt="" />}<button onClick={() => setAlbumFiles((p) => p.filter((_, j) => j !== i))}>✕</button></div>)}</div>}
          {albumFiles.length > 0 && <button className="btn btn-primary" disabled={albumBusy} onClick={postAlbum}>Post album ({albumFiles.length})</button>}
        </div>
      )}

      {c.album && <AlbumManager cats={cats} onChange={load} />}

      {c.cats && <CategoryManager kind={c.kind} cats={cats} used={Array.from(new Set(items.map((it) => it.cat).filter(Boolean))) as string[]} reload={load} />}

      <div className="ad-card">
        <h3>{editId ? "Edit item" : "Add new"}</h3>
        <div className="ad-form" key={editId || "new"}>
          {c.fields.map((f) => (
            <label className="ad-field" key={f.k}>
              <span>{f.label}</span>
              <FieldInput f={f} value={form[f.k]} cats={cats} onUpload={upload} onChange={(v) => setForm((p: any) => ({ ...p, [f.k]: v }))} />
            </label>
          ))}
          <label className="ad-check"><input type="checkbox" checked={!!form.pinned} onChange={(e) => setForm((p: any) => ({ ...p, pinned: e.target.checked }))} /> 📌 Pinned</label>
        </div>
        <div className="ad-actions">
          <button className="btn btn-primary" onClick={save}>{editId ? "Save changes" : "Add"}</button>
          {editId && <button className="btn btn-ghost" onClick={() => { setForm({}); setEditId(null); }}>Cancel</button>}
        </div>
      </div>

      <div className="ad-list">
        {items.length > 4 && <input className="ad-filter" placeholder={`Filter ${c.label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} />}
        {items.length === 0 && <p className="ad-hint">No items yet.</p>}
        {items.length > 1 && !q && <p className="ad-hint">Drag ⠿ to reorder.</p>}
        {items.filter((it) => !q || c.title(it).toLowerCase().includes(q.toLowerCase())).map((it, idx) => (
          <div className={"ad-item" + (editId === it.__id ? " active" : "") + (dragIdx === idx ? " dragging" : "") + (it.archived ? " archived" : "")} key={it.__id}
            draggable={!q} onDragStart={() => setDragIdx(idx)} onDragEnd={() => setDragIdx(null)}
            onDragOver={(e) => e.preventDefault()} onDrop={() => { if (!q) dropTo(idx); }}>
            <span className="ad-drag" title="Drag to reorder">⠿</span>
            <span className="ad-item-title">{it.pinned ? "📌 " : ""}{it.archived ? "🗄 " : ""}{c.title(it)}</span>
            {c.cats && (
              <select className="ad-item-cat" title="Category" value={it.cat || ""} onChange={(e) => { const v = e.target.value; if (v === "__new") newCatThenAssign(it); else setItemCat(it, v); }}>
                <option value="">— no category —</option>
                {Object.keys(cats).map((k) => <option key={k} value={k}>{(cats[k].icon ? cats[k].icon + " " : "") + (cats[k].en || k)}</option>)}
                {it.cat && !cats[it.cat] && <option value={it.cat}>{it.cat} (unmanaged)</option>}
                <option value="__new">＋ New category…</option>
              </select>
            )}
            <span className="ad-item-actions">
              <button title={it.archived ? "Unarchive (publish)" : "Archive (hide from site)"} className={it.archived ? "on" : ""} onClick={() => toggleArchive(it)}>🗄</button>
              <button title="Pin" className={it.pinned ? "on" : ""} onClick={() => togglePin(it)}>📌</button>
              <button title="Up" onClick={() => move(it, "up")}>↑</button>
              <button title="Down" onClick={() => move(it, "down")}>↓</button>
              <button title="Edit" onClick={() => edit(it)}>✎</button>
              <button title="Delete" className="danger" onClick={() => remove(it)}>🗑</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryManager({ kind, cats, used = [], reload }: { kind: string; cats: Record<string, any>; used?: string[]; reload: () => Promise<void> }) {
  const [n, setN] = useState({ key: "", en: "", uz: "", icon: "" });
  const [editing, setEditing] = useState(false);
  const [archived, setArchived] = useState<string[]>([]);
  useEffect(() => { A.getArchivedCats().then((a) => setArchived(a[kind] || [])).catch(() => {}); }, [kind, cats]);
  const save = async () => { if (!n.key.trim()) return; await A.saveCat(kind, n.key.trim(), n); setN({ key: "", en: "", uz: "", icon: "" }); setEditing(false); await reload(); };
  const startEdit = (k: string, v: any) => { setN({ key: k, en: v.en || "", uz: v.uz || "", icon: v.icon || "" }); setEditing(true); };
  const reset = () => { setN({ key: "", en: "", uz: "", icon: "" }); setEditing(false); };
  const toggleArch = async (k: string) => { const next = !archived.includes(k); setArchived((p) => (next ? [...p, k] : p.filter((x) => x !== k))); await A.setCatArchived(kind, k, next); await reload(); };
  return (
    <div className="ad-card">
      <h3>Categories</h3>
      <div className="ad-cats">
        {Object.entries(cats).map(([k, v]: any) => {
          const isArch = archived.includes(k);
          return (
          <div className={"ad-cat" + (isArch ? " archived" : "")} key={k}>
            <b>{v.icon ? v.icon + " " : ""}{k}</b> <span>{v.en}{v.uz ? " / " + v.uz : ""}{isArch ? " · 🗄 archived" : ""}</span>
            <button title={isArch ? "Unarchive (show on site)" : "Archive (hide from site)"} className={isArch ? "on" : ""} onClick={() => toggleArch(k)}>🗄</button>
            <button title="Edit" onClick={() => startEdit(k, v)}>✎</button>
            <button className="danger" title="Delete" onClick={async () => { if (await uiConfirm("Delete category " + k + "?")) { await A.delCat(kind, k); await reload(); } }}>🗑</button>
          </div>
          );
        })}
      </div>
      {used.filter((u) => !cats[u]).length > 0 && (
        <div className="ad-cat-unmanaged">
          <p className="ad-hint">Used on items but not managed yet — click to name, localize, archive:</p>
          <div className="ad-cats">
            {used.filter((u) => !cats[u]).map((u) => (
              <button type="button" key={u} className="ad-cat-suggest" onClick={() => { setEditing(false); setN({ key: u, en: u, uz: "", icon: "" }); }}>+ {u}</button>
            ))}
          </div>
        </div>
      )}
      <div className="ad-cat-form">
        <input className="ad-cat-key" placeholder="key" value={n.key} disabled={editing} onChange={(e) => setN({ ...n, key: e.target.value })} />
        <input className="ad-cat-icon" placeholder="🏷" value={n.icon} onChange={(e) => setN({ ...n, icon: e.target.value })} />
        <input placeholder="EN name" value={n.en} onChange={(e) => setN({ ...n, en: e.target.value })} />
        <input placeholder="UZ nomi" value={n.uz} onChange={(e) => setN({ ...n, uz: e.target.value })} />
        <button className="btn btn-primary btn-sm" onClick={save}>{editing ? "Save" : "Add"}</button>
        {editing && <button className="btn btn-ghost btn-sm" onClick={reset}>Cancel</button>}
      </div>
    </div>
  );
}
