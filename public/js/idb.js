/* ============================================================
   KTFiles — client-side file storage (IndexedDB)
   ------------------------------------------------------------
   Admin paneldan yuklangan fayllar (rasm, PDF, video) shu yerda
   blob ko'rinishida saqlanadi. localStorage'dan ancha katta sig'im.
   Fayl ID si "idb:<id>" ko'rinishida data maydonlariga yoziladi.
   Sahifa render qilishdan oldin preload() chaqirilib, blob URL
   keshlanadi, so'ng resolve() sinxron ravishda URL qaytaradi.

   Eslatma: bu fayllar faqat shu brauzer/qurilmada saqlanadi.
   Hammaga e'lon qilish uchun admin "Media" bo'limidan faylni
   yuklab oling, assets/ ga qo'ying va yo'l (path) orqali bog'lang.
   ============================================================ */
(function () {
  "use strict";
  const DB = "kt_files", STORE = "files", VER = 1;
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, VER);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: "id" }); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function store(mode) { return open().then((db) => db.transaction(STORE, mode).objectStore(STORE)); }
  function req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }

  const cache = {}; // id -> objectURL

  const Files = {
    available() { return typeof indexedDB !== "undefined"; },
    async put(file) {
      const id = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const s = await store("readwrite");
      await req(s.put({ id, name: file.name || (id + ""), type: file.type || "application/octet-stream", size: file.size || 0, blob: file }));
      return id;
    },
    async get(id) { const s = await store("readonly"); return req(s.get(id)); },
    async del(id) { const s = await store("readwrite"); await req(s.delete(id)); if (cache[id]) { URL.revokeObjectURL(cache[id]); delete cache[id]; } },
    async list() {
      const s = await store("readonly");
      const all = await req(s.getAll());
      return all.map((r) => ({ id: r.id, name: r.name, type: r.type, size: r.size }));
    },
    async url(id) {
      if (cache[id]) return cache[id];
      const rec = await this.get(id);
      if (!rec) return null;
      const u = URL.createObjectURL(rec.blob);
      cache[id] = u;
      return u;
    },
    isRef(v) { return typeof v === "string" && v.indexOf("idb:") === 0; },
    refId(v) { return String(v).slice(4); },
    /* sync — returns cached URL if preloaded, else the raw ref */
    resolve(v) { if (!this.isRef(v)) return v; return cache[this.refId(v)] || v; },
    /* preload a list of refs/values into the URL cache */
    async preload(values) {
      const ids = [];
      (values || []).forEach((v) => { if (this.isRef(v)) ids.push(this.refId(v)); });
      for (const id of ids) { try { await this.url(id); } catch (e) { /* ignore */ } }
    },
  };

  window.KTFiles = Files;
})();
