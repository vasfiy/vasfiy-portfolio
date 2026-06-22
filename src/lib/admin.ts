"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let _sb: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (!_sb) _sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
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
function clean(obj: any) { const o = { ...obj }; delete o.__id; delete o.pinned; delete o.position; return o; }
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

/* ---------- Categories ---------- */
export async function listCats(kind: string) {
  const { data } = await sb().from("categories").select("*").eq("kind", kind);
  const map: Record<string, any> = {};
  (data || []).slice().sort(byPos).forEach((c: any) => { map[c.key] = { en: c.en, uz: c.uz, icon: c.icon }; });
  return map;
}
export async function saveCat(kind: string, key: string, obj: { en?: string; uz?: string; icon?: string }) {
  const { error } = await sb().from("categories").upsert({ kind, key, en: obj.en || "", uz: obj.uz || "", icon: obj.icon || "" }, { onConflict: "kind,key" });
  if (error) throw error;
}
export async function delCat(kind: string, key: string) { await sb().from("categories").delete().eq("kind", kind).eq("key", key); }

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
export async function listViews() { const { data } = await sb().from("pageviews").select("path,created_at"); return data || []; }

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
