/* ============================================================
   KTBackend — Supabase data layer (real-time)
   ------------------------------------------------------------
   Agar js/config.js to'ldirilgan bo'lsa yoqiladi. Aks holda
   `enabled=false` bo'ladi va sayt localStorage/static rejimda
   ishlayveradi. Supabase JS klienti CDN'dan dinamik yuklanadi.
   ============================================================ */
(function () {
  "use strict";
  const cfg = window.KT_CONFIG || {};
  const URL = (cfg.SUPABASE_URL || "").trim();
  const KEY = (cfg.SUPABASE_ANON_KEY || "").trim();
  const enabled = !!(URL && KEY && /^https?:\/\//.test(URL));

  let sb = null;

  const KIND_TO_ARR = { gallery: "gallery", blog: "blog", lesson: "lessons", book: "books", experience: "experience", skill: "skills", cert: "certs", project: "projects", education: "education", language: "languages" };
  const DS_TO_KIND = { gallery: "gallery", blog: "blog", lessons: "lesson", books: "book", experience: "experience", skills: "skill", certs: "cert", projects: "project", education: "education", languages: "language" };
  const CAT_KIND_TO_KEY = { gallery: "galleryCats", lesson: "lessonCats", book: "bookCats" };

  async function init() {
    if (!enabled) return false;
    if (sb) return true;
    try {
      const m = await import("https://esm.sh/@supabase/supabase-js@2");
      sb = m.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } });
      return true;
    } catch (e) { console.warn("Supabase load failed", e); return false; }
  }

  function emptyData() {
    return { gallery: [], blog: [], lessons: [], books: [], experience: [], skills: [], certs: [], projects: [], education: [], languages: [], galleryCats: {}, lessonCats: {}, bookCats: {}, settings: {} };
  }

  const byPos = (a, b) => (a.position || 0) - (b.position || 0);
  async function loadAll() {
    const data = emptyData();
    if (!sb) return data;
    // Plain selects + client-side sort (chained .order() proved flaky on the CDN build)
    const [itemsRes, catsRes, setRes] = await Promise.all([
      sb.from("items").select("*"),
      sb.from("categories").select("*"),
      sb.from("settings").select("*"),
    ]);
    (itemsRes.data || []).slice().sort(byPos).forEach((r) => {
      const arr = KIND_TO_ARR[r.kind];
      if (arr) data[arr].push(Object.assign({}, r.data, { pinned: r.pinned, __id: r.id }));
    });
    (catsRes.data || []).slice().sort(byPos).forEach((c) => {
      const k = CAT_KIND_TO_KEY[c.kind];
      if (k) data[k][c.key] = { en: c.en, uz: c.uz, icon: c.icon };
    });
    (setRes.data || []).forEach((s) => { data.settings[s.key] = s.value; });
    return data;
  }

  let channel = null;
  function subscribe(cb) {
    if (!sb || channel) return;
    channel = sb.channel("kt-content")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, cb)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, cb)
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, cb)
      .subscribe();
  }

  /* ---------- Admin item ops ---------- */
  async function list(ds) {
    const { data } = await sb.from("items").select("*").eq("kind", DS_TO_KIND[ds]);
    const rows = (data || []).slice().sort(byPos).map((r) => Object.assign({}, r.data, { pinned: r.pinned, __id: r.id }));
    // pinned first (kept stable) so admin list matches the public order
    return rows.map((x, i) => [x, i]).sort((a, b) => (b[0].pinned ? 1 : 0) - (a[0].pinned ? 1 : 0) || a[1] - b[1]).map((p) => p[0]);
  }
  function clean(obj) { const o = Object.assign({}, obj); delete o.__id; delete o.pinned; return o; }
  async function add(ds, obj) {
    const kind = DS_TO_KIND[ds];
    const { data } = await sb.from("items").select("position").eq("kind", kind);
    const pos = ((data || []).reduce((m, r) => Math.max(m, r.position || 0), 0)) + 1;
    const { error } = await sb.from("items").insert({ kind, data: clean(obj), position: pos, pinned: !!obj.pinned });
    if (error) throw error;
  }
  async function save(ds, id, obj) {
    const { error } = await sb.from("items").update({ data: clean(obj), pinned: !!obj.pinned, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  }
  async function del(ds, id) { const { error } = await sb.from("items").delete().eq("id", id); if (error) throw error; }
  async function setPinned(ds, id, val) { await sb.from("items").update({ pinned: val }).eq("id", id); }
  async function move(ds, id, dir) {
    const kind = DS_TO_KIND[ds];
    const { data: raw } = await sb.from("items").select("id,position").eq("kind", kind);
    if (!raw) return;
    const data = raw.slice().sort(byPos);
    const i = data.findIndex((r) => r.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= data.length) return;
    const a = data[i], b = data[j];
    await sb.from("items").update({ position: b.position }).eq("id", a.id);
    await sb.from("items").update({ position: a.position }).eq("id", b.id);
  }

  /* ---------- Categories ---------- */
  async function catList(ds) {
    const { data } = await sb.from("categories").select("*").eq("kind", DS_TO_KIND[ds]);
    const map = {};
    (data || []).slice().sort(byPos).forEach((c) => { map[c.key] = { en: c.en, uz: c.uz, icon: c.icon }; });
    return map;
  }
  async function catSave(ds, key, obj) {
    const { error } = await sb.from("categories").upsert(
      { kind: DS_TO_KIND[ds], key, en: obj.en || "", uz: obj.uz || "", icon: obj.icon || "" },
      { onConflict: "kind,key" });
    if (error) throw error;
  }
  async function catDel(ds, key) {
    await sb.from("categories").delete().eq("kind", DS_TO_KIND[ds]).eq("key", key);
  }

  /* ---------- Settings (key/value) ---------- */
  async function getSettings() {
    const { data } = await sb.from("settings").select("*");
    const map = {}; (data || []).forEach((s) => { map[s.key] = s.value; });
    return map;
  }
  async function setSetting(key, value) {
    const { error } = await sb.from("settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
  }

  /* ---------- Storage ---------- */
  async function uploadFile(file) {
    const safe = (file.name || "file").replace(/[^\w.\-]/g, "_");
    const path = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7) + "-" + safe;
    const { error } = await sb.storage.from("media").upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw error;
    return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
  }
  async function storageList() {
    const { data } = await sb.storage.from("media").list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    return (data || []).filter((o) => o.name).map((o) => ({
      name: o.name,
      url: sb.storage.from("media").getPublicUrl(o.name).data.publicUrl,
      size: (o.metadata && o.metadata.size) || 0,
      type: (o.metadata && o.metadata.mimetype) || "",
    }));
  }
  async function storageRemove(name) { await sb.storage.from("media").remove([name]); }

  /* ---------- Contact messages ---------- */
  async function sendMessage(msg) {
    const { error } = await sb.from("messages").insert({ name: msg.name || "", email: msg.email || "", message: msg.message || "" });
    if (error) throw error;
  }
  async function listMessages() {
    const { data } = await sb.from("messages").select("*");
    return (data || []).slice().sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }
  async function deleteMessage(id) { await sb.from("messages").delete().eq("id", id); }

  /* ---------- Analytics (page views) ---------- */
  async function logView(path) {
    try { await sb.from("pageviews").insert({ path: path || "/", ref: (document.referrer || "").slice(0, 300) }); } catch (e) {}
  }
  async function listViews() {
    // last 5000 rows is plenty for a personal site
    const { data } = await sb.from("pageviews").select("path,created_at");
    return data || [];
  }

  /* ---------- Auth ---------- */
  async function signIn(email, password) { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; }
  async function signOut() { await sb.auth.signOut(); }
  async function getUser() { try { const { data } = await sb.auth.getUser(); return data.user; } catch (e) { return null; } }

  window.KTBackend = {
    enabled, init, loadAll, subscribe,
    list, add, save, del, setPinned, move,
    catList, catSave, catDel,
    getSettings, setSetting,
    uploadFile, storageList, storageRemove,
    sendMessage, listMessages, deleteMessage, logView, listViews,
    signIn, signOut, getUser,
  };
})();
