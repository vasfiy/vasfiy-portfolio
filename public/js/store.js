/* ============================================================
   KTStore — client-side content store (localStorage)
   ------------------------------------------------------------
   Admin panel orqali kiritilgan kontent shu yerda saqlanadi.
   Sahifalar avval localStorage'dan o'qiydi, bo'lmasa data/*.js
   fayllaridagi standart (default) kontentni ishlatadi.

   Eslatma: localStorage faqat shu brauzer/qurilmada saqlanadi.
   Saytni hammaga e'lon qilish uchun admin paneldan "Export" qiling
   va hosil bo'lgan faylni data/ ichiga qo'yib qayta deploy qiling.
   ============================================================ */
(function () {
  "use strict";
  const PFX = "kt_";

  const Store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(PFX + key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(PFX + key, JSON.stringify(val)); return true; }
      catch (e) { return false; }
    },
    has(key) { return localStorage.getItem(PFX + key) != null; },
    remove(key) { localStorage.removeItem(PFX + key); },
  };

  /* Content getters: override (localStorage) merged-or-replaced by defaults */
  Store.gallery = () => Store.get("gallery", window.GALLERY || []);
  Store.galleryCats = () => Store.get("galleryCats", window.GALLERY_CATEGORIES || {});
  Store.blog = () => Store.get("blog", window.BLOG || []);
  Store.lessons = () => Store.get("lessons", window.LESSONS || []);
  Store.lessonCats = () => Store.get("lessonCats", window.LESSON_CATEGORIES || {});
  Store.books = () => Store.get("books", window.BOOKS || []);
  Store.bookCats = () => Store.get("bookCats", window.BOOK_CATEGORIES || {});

  /* Lesson progress (set of completed lesson ids) */
  Store.progress = () => Store.get("progress", {});
  Store.lessonId = (l) => (l.id || (l.date + "|" + (l.title || l.titleUz || "")));
  Store.toggleProgress = (id) => {
    const p = Store.progress();
    if (p[id]) delete p[id]; else p[id] = true;
    Store.set("progress", p);
    return !!p[id];
  };

  window.KTStore = Store;
})();
