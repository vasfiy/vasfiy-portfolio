"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import type { Collection, Field } from "@/lib/adminSchema";
import * as A from "@/lib/admin";
import AlbumManager from "./AlbumManager";
import RichText from "./RichText";
import BlockEditor from "./BlockEditor";
import CropModal from "./CropModal";
import { uiConfirm } from "./Dialog";

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
  if (f.t === "blocks") return <BlockEditor value={Array.isArray(value) ? value : []} onChange={onChange} onUpload={onUpload} />;
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

export default function ItemManager({ collection, initialEditId }: { collection: Collection; initialEditId?: string | null }) {
  const c = collection;
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<Record<string, any>>({});
  const [form, setForm] = useState<any>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [catPick, setCatPick] = useState<any | null>(null);
  const [pickSel, setPickSel] = useState("");
  const [newEn, setNewEn] = useState("");
  const [newUz, setNewUz] = useState("");
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

  const flash = (m: string) => { setMsg(m); if (!/^(Error|⚠)/.test(m)) setTimeout(() => setMsg(""), 2500); };
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
  const edit = (it: any) => {
    const form: any = { ...it };
    // Migrate older blog posts (media + rich-text "full") into editable blocks once.
    if (c.kind === "blog" && !Array.isArray(it.blocks)) {
      const toText = (h = "") => h.replace(/<\/(p|div|h[1-6]|li)>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();
      const blocks: any[] = [];
      if (it.media && /^https?:|^\//.test(it.media)) blocks.push({ type: it.type === "video" ? "video" : it.type === "youtube" ? "youtube" : "image", url: it.media });
      if (it.full || it.fullUz) blocks.push({ type: "text", text: toText(it.full), textUz: toText(it.fullUz) });
      if (blocks.length) form.blocks = blocks;
    }
    setEditId(it.__id); setForm(form); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async (it: any) => { if (!(await uiConfirm("Delete this item?"))) return; await A.deleteItem(it.__id); await load(); flash("Deleted"); };

  // Deep-linked "✎ Edit" from the public site: open that item's editor once items arrive.
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (!initialEditId || deepLinkDone.current || !items.length) return;
    const it = items.find((x) => x.__id === initialEditId);
    if (it) { deepLinkDone.current = true; edit(it); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, initialEditId]);
  const togglePin = async (it: any) => { await A.setPinned(it.__id, !it.pinned); await load(); };
  const toggleArchive = async (it: any) => { await A.setArchived(it.__id, it, !it.archived); await load(); };
  // Open the category picker for an item (nothing saves until "Save" is pressed).
  const openCatPick = (it: any) => { setCatPick(it); setPickSel(it.cat || ""); setNewEn(""); setNewUz(""); };
  const closeCatPick = () => { setCatPick(null); setNewEn(""); setNewUz(""); };
  // Commit the picker: create the new category (if EN name given) then assign the chosen one.
  const savePick = async () => {
    if (!catPick) return;
    const it = catPick;
    try {
      let cat = pickSel;
      if (newEn.trim()) { cat = newEn.trim(); await A.saveCat(c.kind, cat, { en: newEn.trim(), uz: newUz.trim(), icon: "" }); }
      await A.updateItem(it.__id, { ...it, cat });
      closeCatPick();
      await load();
      flash(cat ? "✓ Saved — category set" : "✓ Saved — category cleared");
    } catch (e: any) { flash("Error: " + (e?.message || e?.error_description || JSON.stringify(e))); }
  };
  // Every category the user can pick/manage: managed ones + any value already in use on items.
  const allCats: Record<string, any> = { ...cats };
  Array.from(new Set(items.map((it) => it.cat).filter(Boolean))).forEach((v: any) => { if (!allCats[v]) allCats[v] = { en: v }; });
  // Delete a category everywhere: remove the managed entry AND clear it off any items using it.
  const deleteCat = async (key: string) => {
    try {
      await A.delCat(c.kind, key);
      for (const it of items.filter((x) => x.cat === key)) await A.updateItem(it.__id, { ...it, cat: "" });
      await load();
      flash("✓ Category deleted");
    } catch (e: any) { flash("Error: " + (e?.message || e?.error_description || JSON.stringify(e))); }
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

  // One-click starter catalog for the marketplace (shown only while it's empty).
  const [seeding, setSeeding] = useState(false);
  const seedMarket = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/market-seed.json");
      const seed = await res.json();
      for (const [key, val] of Object.entries<any>(seed.cats || {})) await A.saveCat("product", key, val);
      const existing = new Set(items.map((it) => it.title));
      let n = 0;
      for (const p of seed.products || []) { if (!existing.has(p.title)) { await A.addItem("product", p); n++; } }
      await load();
      flash(`✓ ${n} products loaded — live now`);
    } catch (e: any) { flash("Error: " + (e?.message || e)); }
    setSeeding(false);
  };

  /* One-click publisher for an entry prepared in the repo. Anything dropped at
     public/prepared/<kind>.json shows up here as a card until an item with the
     same title exists, then disappears on its own. */
  const [prepared, setPrepared] = useState<any | null>(null);
  useEffect(() => {
    setPrepared(null);
    fetch(`/prepared/${c.kind}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPrepared(d && typeof d === "object" ? d : null))
      .catch(() => {});
  }, [c.kind]);
  const preparedTitle = prepared ? (prepared.titleUz || prepared.title || prepared.name || "") : "";
  const publishPrepared = async () => {
    if (!prepared) return;
    try { await A.addItem(c.kind, prepared); setPrepared(null); await load(); flash("✓ Added — live now"); }
    catch (e: any) { flash("Error: " + (e?.message || e)); }
  };

  return (
    <div className="ad-section">
      <div className="ad-head"><h2>{c.icon} {c.label}</h2>{msg && <span className="ad-msg">{msg}</span>}</div>

      {prepared && !items.some((it) => (it.title || it.name) === (prepared.title || prepared.name)) && (
        <div className="ad-card">
          <h3>Tayyor yozuv</h3>
          <p className="ad-hint"><b>{preparedTitle}</b>{prepared.date ? ` — ${prepared.date}` : ""} · bir bosishda qo'shiladi, keyin odatdagidek tahrirlaysiz.</p>
          <button className="btn btn-primary" onClick={publishPrepared}>Qo'shish</button>
        </div>
      )}

      {c.kind === "product" && items.length === 0 && (
        <div className="ad-card">
          <h3>🌱 Starter catalog</h3>
          <p className="ad-hint">Load 12 ready products (perfume, leather, shoes — EN/UZ/RU/DE texts, prices, photos). You can edit or delete each one afterwards.</p>
          <button className="btn btn-primary" disabled={seeding} onClick={seedMarket}>{seeding ? "⏳ Loading…" : "Load 12 starter products"}</button>
        </div>
      )}

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

      {c.cats && <CategoryManager kind={c.kind} cats={allCats} onDelete={deleteCat} reload={load} />}

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
              <button type="button" className={"ad-item-cat-btn" + (it.cat ? " has" : "")} title="Assign category" onClick={() => openCatPick(it)}>
                🏷 {it.cat ? ((allCats[it.cat]?.icon ? allCats[it.cat].icon + " " : "") + (allCats[it.cat]?.en || it.cat)) : "Category"}
              </button>
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

      {catPick && (
        <div className="ui-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeCatPick(); }}>
          <div className="ui-dialog ad-catpick" role="dialog" aria-modal>
            <p className="ui-dialog-msg">Category for: <b>{c.title(catPick)}</b></p>
            <div className="ad-catpick-list">
              <button type="button" className={"ad-catpick-opt" + (pickSel === "" && !newEn.trim() ? " active" : "")} onClick={() => { setPickSel(""); setNewEn(""); }}>— No category —</button>
              {Object.keys(allCats).map((k) => (
                <button type="button" key={k} className={"ad-catpick-opt" + (pickSel === k && !newEn.trim() ? " active" : "")} onClick={() => { setPickSel(k); setNewEn(""); }}>{(allCats[k].icon ? allCats[k].icon + " " : "") + (allCats[k].en || k)}</button>
              ))}
            </div>
            <div className="ad-catpick-new">
              <span className="ad-catpick-or">Or create new:</span>
              <input placeholder="English name" value={newEn} onChange={(e) => { setNewEn(e.target.value); if (e.target.value.trim()) setPickSel(""); }} />
              <input placeholder="O'zbekcha nomi" value={newUz} onChange={(e) => setNewUz(e.target.value)} />
            </div>
            <div className="ui-dialog-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={closeCatPick}>Cancel</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={savePick}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryManager({ kind, cats, onDelete, reload }: { kind: string; cats: Record<string, any>; onDelete: (key: string) => Promise<void>; reload: () => Promise<void> }) {
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
            <button className="danger" title="Delete" onClick={async () => { if (await uiConfirm("Delete category \"" + k + "\"? It will be removed from any posts using it.")) await onDelete(k); }}>🗑</button>
          </div>
          );
        })}
      </div>
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
