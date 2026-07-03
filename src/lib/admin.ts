"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/* ---------- Cross-subdomain session storage ----------
   The admin logs in at admin.vasfiy.com but in-place editing runs on vasfiy.com.
   localStorage is per-origin, so the session is mirrored into chunked cookies on
   .vasfiy.com (cookies cap ~4 KB each; the Supabase session doesn't fit in one).
   On localhost the cookie is host-only, so previews keep working. */
const CK = "kt-auth";
const CHUNK = 3400;
const ckDomain = () => {
  const h = typeof location !== "undefined" ? location.hostname : "";
  return h === "vasfiy.com" || h.endsWith(".vasfiy.com") ? "; Domain=.vasfiy.com" : "";
};
function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const jar: Record<string, string> = {};
  document.cookie.split(/;\s*/).forEach((p) => { const i = p.indexOf("="); if (i > 0) jar[p.slice(0, i)] = p.slice(i + 1); });
  let out = "";
  for (let i = 0; ; i++) { const v = jar[`${CK}.${i}`]; if (v === undefined) break; out += v; }
  return out ? decodeURIComponent(out) : null;
}
function writeCookie(value: string | null) {
  if (typeof document === "undefined") return;
  const base = `; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}${ckDomain()}`;
  for (let i = 0; i < 10; i++) document.cookie = `${CK}.${i}=${base}; Max-Age=0`;
  if (value == null) return;
  const enc = encodeURIComponent(value);
  for (let i = 0; i * CHUNK < enc.length; i++)
    document.cookie = `${CK}.${i}=${enc.slice(i * CHUNK, (i + 1) * CHUNK)}${base}; Max-Age=31536000`;
}
const sharedStorage = {
  getItem(k: string): string | null {
    let v: string | null = null;
    try { v = localStorage.getItem(k); } catch {}
    if (v) { if (!readCookie()) writeCookie(v); return v; } // adopt existing sessions into the cookie
    const c = readCookie();
    if (c) { try { localStorage.setItem(k, c); } catch {} }
    return c;
  },
  setItem(k: string, v: string) { try { localStorage.setItem(k, v); } catch {} writeCookie(v); },
  removeItem(k: string) { try { localStorage.removeItem(k); } catch {} writeCookie(null); },
};

let _sb: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (!_sb) _sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storage: sharedStorage as any } });
  return _sb;
}

const byPos = (a: any, b: any) => (a.position || 0) - (b.position || 0);

/* ---------- Auth ---------- */
export async function signIn(email: string, password: string) {
  const { error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function signOut() { await sb().auth.signOut(); }
export async function getUser() { try { const { data } = await sb().auth.getUser(); return data.user; } catch { return null; } }

/* ---------- Items ---------- */
export async function listItems(kind: string) {
  const { data } = await sb().from("items").select("*").eq("kind", kind);
  const rows = (data || []).slice().sort(byPos).map((r: any) => ({ ...r.data, pinned: r.pinned, position: r.position, __id: r.id }));
  return rows.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.position || 0) - (b.position || 0));
}
// Postgres jsonb rejects NUL bytes (); strip them from any string value so saves never fail on stored content.
function stripNul(v: any): any {
  if (typeof v === "string") return v.replace(/\u0000/g, "");
  if (Array.isArray(v)) return v.map(stripNul);
  if (v && typeof v === "object") { const o: any = {}; for (const k in v) o[k] = stripNul(v[k]); return o; }
  return v;
}
function clean(obj: any) { const o = stripNul({ ...obj }); delete o.__id; delete o.pinned; delete o.position; return o; }
export async function addItem(kind: string, obj: any) {
  const { data } = await sb().from("items").select("position").eq("kind", kind);
  const pos = ((data || []).reduce((m: number, r: any) => Math.max(m, r.position || 0), 0)) + 1;
  const { error } = await sb().from("items").insert({ kind, data: clean(obj), position: pos, pinned: !!obj.pinned });
  if (error) throw error;
}
export async function updateItem(id: string, obj: any) {
  const { error } = await sb().from("items").update({ data: clean(obj), pinned: !!obj.pinned, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
export async function deleteItem(id: string) { const { error } = await sb().from("items").delete().eq("id", id); if (error) throw error; }
export async function setPinned(id: string, val: boolean) { await sb().from("items").update({ pinned: val }).eq("id", id); }
/** Temporarily archive/unarchive an item (kept in admin, hidden from the public site). */
export async function setArchived(id: string, data: any, val: boolean) {
  const obj = { ...data, archived: val };
  const { error } = await sb().from("items").update({ data: clean(obj), updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
export async function reorder(orderedIds: string[]) {
  // assign sequential positions matching the given visual order
  await Promise.all(orderedIds.map((id, i) => sb().from("items").update({ position: i }).eq("id", id)));
}
export async function moveItem(kind: string, id: string, dir: "up" | "down") {
  const { data: raw } = await sb().from("items").select("id,position").eq("kind", kind);
  if (!raw) return;
  const arr = raw.slice().sort(byPos);
  const i = arr.findIndex((r: any) => r.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= arr.length) return;
  const a = arr[i], b = arr[j];
  await sb().from("items").update({ position: b.position }).eq("id", a.id);
  await sb().from("items").update({ position: a.position }).eq("id", b.id);
}

/* ---------- Categories ----------
   The `categories` table has a CHECK constraint limiting `kind` to the original
   set. Newer kinds (blog, project, challenge, page) are stored in an `extraCats`
   setting instead, so no database change is required. */
const CAT_TABLE_KINDS = new Set(["gallery", "book", "lesson"]);
async function getExtraCats(): Promise<Record<string, Record<string, any>>> {
  const s = await getSettings();
  return (s.extraCats as any) || {};
}
export async function listCats(kind: string) {
  if (!CAT_TABLE_KINDS.has(kind)) { const e = await getExtraCats(); return e[kind] || {}; }
  const { data } = await sb().from("categories").select("*").eq("kind", kind);
  const map: Record<string, any> = {};
  (data || []).slice().sort(byPos).forEach((c: any) => { map[c.key] = { en: c.en, uz: c.uz, icon: c.icon }; });
  return map;
}
export async function saveCat(kind: string, key: string, obj: { en?: string; uz?: string; icon?: string }) {
  const cat = { en: obj.en || "", uz: obj.uz || "", icon: obj.icon || "" };
  if (!CAT_TABLE_KINDS.has(kind)) {
    const e = await getExtraCats(); (e[kind] ||= {})[key] = cat; await setSetting("extraCats", e); return;
  }
  const payload = { kind, key, ...cat };
  const { data: existing } = await sb().from("categories").select("key").eq("kind", kind).eq("key", key).maybeSingle();
  const { error } = existing
    ? await sb().from("categories").update(payload).eq("kind", kind).eq("key", key)
    : await sb().from("categories").insert(payload);
  if (error) throw error;
}
export async function delCat(kind: string, key: string) {
  if (!CAT_TABLE_KINDS.has(kind)) { const e = await getExtraCats(); if (e[kind]) { delete e[kind][key]; await setSetting("extraCats", e); } return; }
  await sb().from("categories").delete().eq("kind", kind).eq("key", key);
}
/* Archived categories live in a single `archivedCats` setting (no schema change). */
export async function getArchivedCats(): Promise<Record<string, string[]>> {
  const s = await getSettings();
  return (s.archivedCats as Record<string, string[]>) || {};
}
export async function setCatArchived(kind: string, key: string, archived: boolean) {
  const all = await getArchivedCats();
  const list = new Set(all[kind] || []);
  if (archived) list.add(key); else list.delete(key);
  all[kind] = Array.from(list);
  await setSetting("archivedCats", all);
}

/* ---------- Settings ---------- */
export async function getSettings() {
  const { data } = await sb().from("settings").select("*");
  const map: Record<string, any> = {}; (data || []).forEach((s: any) => { map[s.key] = s.value; });
  return map;
}
export async function setSetting(key: string, value: any) {
  const { error } = await sb().from("settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

/* ---------- Storage ---------- */
export async function uploadFile(file: File): Promise<string> {
  const safe = (file.name || "file").replace(/[^\w.\-]/g, "_");
  const path = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7) + "-" + safe;
  const { error } = await sb().storage.from("media").upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  return sb().storage.from("media").getPublicUrl(path).data.publicUrl;
}
export async function listStorage() {
  const { data } = await sb().storage.from("media").list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
  return (data || []).filter((o: any) => o.name).map((o: any) => ({ name: o.name, url: sb().storage.from("media").getPublicUrl(o.name).data.publicUrl, size: (o.metadata && o.metadata.size) || 0, type: (o.metadata && o.metadata.mimetype) || "" }));
}
export async function removeStorage(name: string) { await sb().storage.from("media").remove([name]); }

/* ---------- Messages / Analytics ---------- */
export async function listMessages() {
  const { data } = await sb().from("messages").select("*");
  return (data || []).slice().sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""));
}
export async function deleteMessage(id: string) { await sb().from("messages").delete().eq("id", id); }
export async function listViews() { const { data } = await sb().from("pageviews").select("*").order("created_at", { ascending: false }).limit(5000); return data || []; }

/* ---------- Dashboard / backup ---------- */
export async function getCounts() {
  const [items, msgs, views] = await Promise.all([
    sb().from("items").select("kind"),
    sb().from("messages").select("*", { count: "exact", head: true }),
    sb().from("pageviews").select("*", { count: "exact", head: true }),
  ]);
  const byKind: Record<string, number> = {};
  (items.data || []).forEach((r: any) => { byKind[r.kind] = (byKind[r.kind] || 0) + 1; });
  return { byKind, messages: msgs.count || 0, views: views.count || 0 };
}
export async function exportAll() {
  const [items, categories, settings] = await Promise.all([
    sb().from("items").select("*"),
    sb().from("categories").select("*"),
    sb().from("settings").select("*"),
  ]);
  const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), items: items.data, categories: categories.data, settings: settings.data }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `vasfiy-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Client-side image compression ---------- */
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (!/^image\//.test(file.type) || /gif|svg/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    let { width, height } = bmp;
    if (Math.max(width, height) > maxDim) { const s = maxDim / Math.max(width, height); width = Math.round(width * s); height = Math.round(height * s); }
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d"); if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, width, height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch { return file; }
}
