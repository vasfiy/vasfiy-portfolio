/* ============================================================
   Admin panel — no-code content management
   Works in two modes:
     • Backend (Supabase configured) → real auth, shared real-time data, Storage uploads
     • Local (no config)             → localStorage + IndexedDB (per-browser)
   ============================================================ */
(function () {
  "use strict";
  const S = window.KTStore;
  const F = window.KTFiles;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const BE = () => !!(window.KTBackend && KTBackend.enabled);
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  /* Resize/compress large images before upload (faster site, smaller storage).
     Non-images (PDF/video), GIF and SVG pass through unchanged. */
  async function compressImage(file, maxDim, quality) {
    maxDim = maxDim || 1600; quality = quality || 0.82;
    if (!file || !/^image\//.test(file.type) || /gif|svg/i.test(file.type)) return file;
    try {
      const bmp = await createImageBitmap(file);
      let w = bmp.width, h = bmp.height;
      const big = Math.max(w, h);
      if (big > maxDim) { const s = maxDim / big; w = Math.round(w * s); h = Math.round(h * s); }
      const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
      const type = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise((res) => canvas.toBlob(res, type, quality));
      if (bmp.close) bmp.close();
      if (!blob || blob.size >= file.size) return file; // keep original if not smaller
      const ext = type === "image/png" ? ".png" : ".jpg";
      return new File([blob], (file.name || "image").replace(/\.[^.]+$/, "") + ext, { type });
    } catch (e) { return file; }
  }

  let toastT;
  function toast(msg) {
    const t = $("#adminToast");
    t.textContent = msg; t.hidden = false; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ---------- Dataset config ---------- */
  const FIELDS = {
    gallery: [
      { k: "emoji", label: "Emoji (fallback)", t: "text", ph: "🏔️" },
      { k: "src", label: "Image", t: "file", accept: "image/*" },
      { k: "album", label: "Album name (groups photos together)", t: "text", ph: "Istanbul 2025" },
      { k: "albumUz", label: "Album name (UZ)", t: "text" },
      { k: "cat", label: "Category key", t: "cat" },
      { k: "caption", label: "Caption (EN)", t: "text" },
      { k: "captionUz", label: "Caption (UZ)", t: "text" },
      { k: "location", label: "Location", t: "text", ph: "Tashkent, UZ" },
    ],
    blog: [
      { k: "date", label: "Date", t: "date" },
      { k: "type", label: "Type", t: "select", opts: ["text", "image", "youtube", "video"] },
      { k: "media", label: "Media (file, or YouTube URL for type=youtube)", t: "file", accept: "image/*,video/*" },
      { k: "title", label: "Title (EN)", t: "text" },
      { k: "titleUz", label: "Title (UZ)", t: "text" },
      { k: "body", label: "Short text / excerpt (EN)", t: "textarea" },
      { k: "bodyUz", label: "Short text / excerpt (UZ)", t: "textarea" },
      { k: "full", label: "Full article (EN) — long form, optional", t: "textarea" },
      { k: "fullUz", label: "Full article (UZ) — long form, optional", t: "textarea" },
      { k: "cat", label: "Category (optional, e.g. travel, security)", t: "text" },
      { k: "location", label: "Location", t: "text" },
    ],
    books: [
      { k: "title", label: "Title (EN)", t: "text" },
      { k: "titleUz", label: "Title (UZ)", t: "text" },
      { k: "author", label: "Author", t: "text" },
      { k: "cover", label: "Cover (image or emoji)", t: "file", accept: "image/*" },
      { k: "file", label: "PDF file", t: "file", accept: "application/pdf,.pdf" },
      { k: "cat", label: "Category key", t: "cat" },
      { k: "desc", label: "Description (EN)", t: "textarea" },
      { k: "descUz", label: "Description (UZ)", t: "textarea" },
    ],
    lessons: [
      { k: "date", label: "Date", t: "date" },
      { k: "cat", label: "Category key", t: "cat" },
      { k: "title", label: "Title (EN)", t: "text" },
      { k: "titleUz", label: "Title (UZ)", t: "text" },
      { k: "body", label: "Body (EN) — \\n\\n paragraphs, `code` inline", t: "textarea" },
      { k: "bodyUz", label: "Body (UZ)", t: "textarea" },
      { k: "commands", label: "Commands to try (one per line)", t: "list" },
    ],
    experience: [
      { k: "role", label: "Role (EN)", t: "text" },
      { k: "roleUz", label: "Role (UZ)", t: "text" },
      { k: "date", label: "Dates", t: "text", ph: "Oct 2025 – Present" },
      { k: "company", label: "Company", t: "text" },
      { k: "meta", label: "Meta (EN)", t: "text", ph: "Full-time · Tashkent, Uzbekistan" },
      { k: "metaUz", label: "Meta (UZ)", t: "text" },
      { k: "bullets", label: "Bullet points (EN, one per line)", t: "list" },
      { k: "bulletsUz", label: "Bullet points (UZ, one per line)", t: "list" },
    ],
    skills: [
      { k: "icon", label: "Icon (emoji)", t: "text", ph: "🛰️" },
      { k: "name", label: "Category (EN)", t: "text" },
      { k: "nameUz", label: "Category (UZ)", t: "text" },
      { k: "tags", label: "Tags (one per line)", t: "list" },
    ],
    certs: [
      { k: "badge", label: "Badge (THM / 🏅 / 📜 / +)", t: "text" },
      { k: "name", label: "Name (EN)", t: "text" },
      { k: "nameUz", label: "Name (UZ)", t: "text" },
      { k: "meta", label: "Meta (EN)", t: "text", ph: "ID: THM-…" },
      { k: "metaUz", label: "Meta (UZ)", t: "text" },
    ],
    projects: [
      { k: "icon", label: "Icon (emoji)", t: "text", ph: "🌐" },
      { k: "period", label: "Period", t: "text", ph: "2023 – Present" },
      { k: "title", label: "Title (EN)", t: "text" },
      { k: "titleUz", label: "Title (UZ)", t: "text" },
      { k: "sub", label: "Subtitle (EN)", t: "text", ph: "vasfiy.uz / vasfiy.com" },
      { k: "subUz", label: "Subtitle (UZ)", t: "text" },
      { k: "desc", label: "Description (EN)", t: "textarea" },
      { k: "descUz", label: "Description (UZ)", t: "textarea" },
      { k: "tags", label: "Tags (one per line)", t: "list" },
      { k: "linkUrl", label: "Link URL (optional)", t: "text", ph: "https://…" },
      { k: "linkLabel", label: "Link label (EN)", t: "text", ph: "Visit site ↗" },
      { k: "linkLabelUz", label: "Link label (UZ)", t: "text" },
    ],
    education: [
      { k: "degree", label: "Degree / program (EN)", t: "text" },
      { k: "degreeUz", label: "Degree / program (UZ)", t: "text" },
      { k: "date", label: "Date (EN)", t: "text", ph: "Expected 2026" },
      { k: "dateUz", label: "Date (UZ)", t: "text" },
      { k: "school", label: "School (EN)", t: "text" },
      { k: "schoolUz", label: "School (UZ)", t: "text" },
    ],
    languages: [
      { k: "label", label: "Language + level (EN)", t: "text", ph: "English — Professional" },
      { k: "labelUz", label: "Language + level (UZ)", t: "text", ph: "Ingliz — Professional" },
      { k: "pct", label: "Proficiency % (0–100)", t: "text", ph: "90" },
    ],
  };
  const CFG = {
    gallery: { store: "gallery", def: () => window.GALLERY || [], catStore: "galleryCats", catDef: () => window.GALLERY_CATEGORIES || {}, addTop: false, title: (i) => (i.album ? "🗂 " + i.album + " · " : "") + (i.caption || i.captionUz || "photo") },
    blog: { store: "blog", def: () => window.BLOG || [], addTop: true, title: (i) => (i.title || i.titleUz || "(untitled)") + " · " + (i.date || "") },
    books: { store: "books", def: () => window.BOOKS || [], catStore: "bookCats", catDef: () => window.BOOK_CATEGORIES || {}, addTop: false, title: (i) => (i.title || i.titleUz || "(untitled)") },
    lessons: { store: "lessons", def: () => window.LESSONS || [], catStore: "lessonCats", catDef: () => window.LESSON_CATEGORIES || {}, addTop: true, title: (i) => (i.title || i.titleUz || "(untitled)") + " · " + (i.date || "") },
    experience: { store: "experience", def: () => [], addTop: false, title: (i) => (i.role || i.roleUz || "(role)") + (i.company ? " · " + i.company : "") },
    skills: { store: "skills", def: () => [], addTop: false, title: (i) => (i.icon ? i.icon + " " : "") + (i.name || i.nameUz || "(category)") },
    certs: { store: "certs", def: () => [], addTop: false, title: (i) => i.name || i.nameUz || "(certificate)" },
    projects: { store: "projects", def: () => [], addTop: false, title: (i) => (i.icon ? i.icon + " " : "") + (i.title || i.titleUz || "(project)") },
    education: { store: "education", def: () => [], addTop: false, title: (i) => (i.degree || i.degreeUz || "(degree)") + (i.school ? " · " + i.school : "") },
    languages: { store: "languages", def: () => [], addTop: false, title: (i) => (i.label || i.labelUz || "(language)") + (i.pct ? " · " + i.pct + "%" : "") },
  };

  /* ---------- Data cache (works for both modes) ---------- */
  const cache = {}, catCache = {};
  async function refresh(ds) { cache[ds] = BE() ? await KTBackend.list(ds) : S.get(CFG[ds].store, CFG[ds].def()); }
  async function refreshCats(ds) { if (!CFG[ds].catStore) return; catCache[ds] = BE() ? await KTBackend.catList(ds) : S.get(CFG[ds].catStore, CFG[ds].catDef()); }
  function getData(ds) { return cache[ds] || []; }
  function getCats(ds) { return catCache[ds] || {}; }
  function saveLocal(ds, arr) { S.set(CFG[ds].store, arr); }
  function saveLocalCats(ds, obj) { S.set(CFG[ds].catStore, obj); }

  const editing = { gallery: -1, blog: -1, books: -1, lessons: -1 };

  /* ---------- Panel ---------- */
  async function renderPanel(ds) {
    const panel = $("#panel-" + ds);
    const catBlock = CFG[ds].catStore ? `<div class="admin-card glass" id="cats-${ds}"></div>` : "";
    const composer = (ds === "gallery" || ds === "blog") ? composerHTML(ds) : "";
    panel.innerHTML =
      composer +
      `<div class="admin-grid">
        <div class="admin-card glass">
          <h2>${ds[0].toUpperCase() + ds.slice(1)} items</h2>
          <div class="admin-list" id="list-${ds}"><p class="admin-hint">Loading…</p></div>
          <button class="btn btn-ghost btn-block" id="new-${ds}">+ Add manually</button>
        </div>
        <div class="admin-card glass">
          <h2 id="formTitle-${ds}">Edit / advanced</h2>
          <form class="admin-form" id="form-${ds}"></form>
        </div>
      </div>${catBlock}`;
    await refresh(ds);
    if (CFG[ds].catStore) await refreshCats(ds);
    if (composer) { if (ds === "gallery") wireGalleryComposer(); else wireComposer(ds); }
    renderList(ds);
    renderForm(ds);
    if (CFG[ds].catStore) renderCats(ds);
    $("#new-" + ds).addEventListener("click", () => { editing[ds] = -1; renderForm(ds); });
  }

  /* ---------- Instagram/Telegram-style composer (gallery + blog) ---------- */
  function composerHTML(ds) {
    if (ds === "gallery") {
      return `<div class="composer glass" id="composer-gallery">
        <div class="composer-title">📸 New album / photos</div>
        <div class="cmp-fields">
          <input class="cmp-album" placeholder="Album name — e.g. Istanbul 2025 (optional)">
          <input class="cmp-cat-in" placeholder="Category key — e.g. travel (optional)">
        </div>
        <div class="composer-drop" id="cmp-drop-gallery">
          <div class="cmp-ph"><span class="cmp-ic">⬆</span><b>Drop photos here</b><span>or tap to choose · select 30+ at once</span></div>
          <input type="file" hidden accept="image/*" multiple>
        </div>
        <div class="cmp-grid" hidden></div>
        <div class="cmp-busy" hidden>⏳ Uploading…</div>
        <textarea class="cmp-text" rows="2" placeholder="Caption applied to all (optional)"></textarea>
        <div class="composer-actions">
          <button class="btn btn-primary cmp-post" disabled>Post album</button>
          <button class="btn btn-ghost cmp-clear" type="button">Clear</button>
          <span class="cmp-status"></span>
        </div>
      </div>`;
    }
    const isBlog = ds === "blog";
    return `<div class="composer glass" id="composer-${ds}">
      <div class="composer-title">${isBlog ? "✍️ Write a post" : "📸 New photo"}</div>
      <div class="composer-drop" id="cmp-drop-${ds}">
        <div class="cmp-ph"><span class="cmp-ic">⬆</span><b>Drop photo or video here</b><span>or tap to choose${isBlog ? " · optional" : ""}</span></div>
        <div class="cmp-prev" hidden></div>
        <input type="file" hidden accept="image/*,video/*">
      </div>
      <div class="cmp-busy" hidden>⏳ Uploading…</div>
      ${isBlog ? `<input class="cmp-title-in" placeholder="Title (optional)">` : ""}
      ${isBlog ? `<input class="cmp-cat-in" placeholder="Category (optional, e.g. travel)">` : ""}
      ${isBlog ? `<input class="cmp-yt" placeholder="…or paste a YouTube link (optional)">` : ""}
      <textarea class="cmp-text" rows="3" placeholder="${isBlog ? "Write something…" : "Caption (optional)"}"></textarea>
      <div class="composer-actions">
        <button class="btn btn-primary cmp-post" disabled>Post</button>
        <button class="btn btn-ghost cmp-clear" type="button">Clear</button>
        <span class="cmp-status"></span>
      </div>
    </div>`;
  }

  /* ---------- Gallery album uploader (multi-file) ---------- */
  function wireGalleryComposer() {
    const root = $("#composer-gallery");
    const dz = $("#cmp-drop-gallery", root);
    const fileInput = dz.querySelector('input[type="file"]');
    const ph = dz.querySelector(".cmp-ph");
    const grid = root.querySelector(".cmp-grid");
    const busy = root.querySelector(".cmp-busy");
    const postBtn = root.querySelector(".cmp-post");
    const status = root.querySelector(".cmp-status");
    const textEl = root.querySelector(".cmp-text");
    const albumEl = root.querySelector(".cmp-album");
    const catEl = root.querySelector(".cmp-cat-in");
    let items = []; // { url, type }

    const updateBtn = () => { postBtn.disabled = !items.length; postBtn.textContent = items.length > 1 ? `Post album (${items.length})` : "Post album"; };
    const renderGrid = () => {
      grid.hidden = !items.length;
      grid.innerHTML = items.map((m, i) => `<figure class="cmp-thumb">${m.type === "video" ? `<video src="${esc(BE() ? m.url : "")}" muted></video>` : `<img src="${esc(BE() ? m.url : "")}" data-i="${i}">`}<button class="cmp-thumb-x" data-i="${i}" title="Remove">✕</button></figure>`).join("");
      if (!BE() && F) items.forEach((m, i) => { F.url(F.refId(m.url)).then((u) => { const im = grid.querySelector(`[data-i="${i}"]`); if (im && im.tagName === "IMG") im.src = u; }); });
      grid.querySelectorAll(".cmp-thumb-x").forEach((b) => b.addEventListener("click", () => { items.splice(+b.dataset.i, 1); renderGrid(); updateBtn(); }));
    };
    const addFiles = async (files) => {
      const arr = [...files]; if (!arr.length) return;
      busy.hidden = false;
      for (let f of arr) {
        try { const isVid = (f.type || "").indexOf("video") === 0; if (!isVid) f = await compressImage(f); const url = BE() ? await KTBackend.uploadFile(f) : "idb:" + await F.put(f); items.push({ url, type: isVid ? "video" : "image" }); renderGrid(); }
        catch (e) { toast("Upload failed: " + (e.message || e)); }
      }
      busy.hidden = true; updateBtn();
    };
    dz.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => { if (fileInput.files.length) addFiles(fileInput.files); fileInput.value = ""; });
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); }));
    dz.addEventListener("drop", (e) => { if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
    root.querySelector(".cmp-clear").addEventListener("click", () => { items = []; renderGrid(); textEl.value = ""; albumEl.value = ""; catEl.value = ""; updateBtn(); });

    postBtn.addEventListener("click", async () => {
      if (!items.length) return;
      const album = albumEl.value.trim(), cat = catEl.value.trim(), cap = textEl.value.trim();
      postBtn.disabled = true; status.textContent = "Posting…";
      try {
        for (const m of items) {
          const obj = { src: m.url, caption: cap, captionUz: cap };
          if (album) { obj.album = album; obj.albumUz = album; }
          if (cat) obj.cat = cat;
          if (m.type === "video") obj.video = true;
          if (BE()) await KTBackend.add("gallery", obj);
          else { const a = S.get(CFG.gallery.store, CFG.gallery.def()); a.push(obj); saveLocal("gallery", a); }
        }
        const n = items.length;
        items = []; renderGrid(); textEl.value = ""; albumEl.value = ""; catEl.value = ""; updateBtn();
        await refresh("gallery"); renderList("gallery");
        status.textContent = ""; toast(`✓ ${n} photo${n > 1 ? "s" : ""} posted — live now!`);
      } catch (e) { status.textContent = ""; toast("Error: " + (e.message || e)); postBtn.disabled = false; }
    });
  }

  function wireComposer(ds) {
    const root = $("#composer-" + ds);
    const dz = $("#cmp-drop-" + ds, root);
    const fileInput = dz.querySelector('input[type="file"]');
    const prev = dz.querySelector(".cmp-prev");
    const ph = dz.querySelector(".cmp-ph");
    const busy = root.querySelector(".cmp-busy");
    const postBtn = root.querySelector(".cmp-post");
    const status = root.querySelector(".cmp-status");
    const textEl = root.querySelector(".cmp-text");
    const ytEl = root.querySelector(".cmp-yt");
    let media = null, mediaType = null;

    const refreshPostState = () => {
      const hasContent = media || (ytEl && ytEl.value.trim()) || (ds === "blog" && textEl.value.trim());
      postBtn.disabled = !hasContent;
    };
    textEl.addEventListener("input", refreshPostState);
    if (ytEl) ytEl.addEventListener("input", refreshPostState);

    const setMedia = async (file) => {
      if (!file) return;
      const isVid = (file.type || "").indexOf("video") === 0;
      busy.hidden = false; postBtn.disabled = true;
      try {
        if (!isVid) file = await compressImage(file);
        const url = BE() ? await KTBackend.uploadFile(file) : "idb:" + await F.put(file);
        media = url; mediaType = isVid ? "video" : "image";
        ph.hidden = true; prev.hidden = false;
        prev.innerHTML = mediaType === "video"
          ? `<video src="${esc(BE() ? url : "")}" muted></video><span class="cmp-x">✕ change</span>`
          : `<img src="${esc(BE() ? url : "")}"><span class="cmp-x">✕ change</span>`;
        if (!BE() && F) { F.url(F.refId(url)).then((u) => { const m = prev.querySelector("img,video"); if (m) m.src = u; }); }
        toast("Uploaded");
      } catch (e) { toast("Upload failed: " + (e.message || e)); }
      finally { busy.hidden = true; refreshPostState(); }
    };

    dz.addEventListener("click", () => { if (media) { media = null; mediaType = null; prev.hidden = true; prev.innerHTML = ""; ph.hidden = false; refreshPostState(); } else fileInput.click(); });
    fileInput.addEventListener("change", () => { if (fileInput.files[0]) setMedia(fileInput.files[0]); });
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); }));
    dz.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) setMedia(f); });

    root.querySelector(".cmp-clear").addEventListener("click", () => {
      media = null; mediaType = null; prev.hidden = true; prev.innerHTML = ""; ph.hidden = false;
      textEl.value = ""; if (ytEl) ytEl.value = ""; const t = root.querySelector(".cmp-title-in"); if (t) t.value = "";
      const ci = root.querySelector(".cmp-cat-in"); if (ci) ci.value = "";
      refreshPostState();
    });

    postBtn.addEventListener("click", async () => {
      const text = textEl.value.trim();
      const yt = ytEl ? ytEl.value.trim() : "";
      let obj;
      if (ds === "gallery") {
        obj = { src: media, caption: text, captionUz: text };
        if (mediaType === "video") obj.video = true;
      } else {
        const title = (root.querySelector(".cmp-title-in").value || "").trim();
        const catEl = root.querySelector(".cmp-cat-in"); const cat = catEl ? catEl.value.trim() : "";
        let type = "text", med = "";
        if (media) { type = mediaType; med = media; }
        else if (yt) { type = "youtube"; med = yt; }
        obj = { type, media: med, title, titleUz: title, body: text, bodyUz: text, date: new Date().toISOString().slice(0, 10) };
        if (cat) obj.cat = cat;
        if (!med) delete obj.media;
      }
      postBtn.disabled = true; status.textContent = "Posting…";
      try {
        if (BE()) await KTBackend.add(ds, obj);
        else { const a = S.get(CFG[ds].store, CFG[ds].def()); CFG[ds].addTop ? a.unshift(obj) : a.push(obj); saveLocal(ds, a); }
        root.querySelector(".cmp-clear").click();
        await refresh(ds); renderList(ds);
        status.textContent = ""; toast("✓ Posted — live now!");
      } catch (e) { status.textContent = ""; toast("Error: " + (e.message || e)); postBtn.disabled = false; }
    });
  }

  function renderList(ds) {
    const wrap = $("#list-" + ds);
    const data = getData(ds);
    if (!data.length) { wrap.innerHTML = `<p class="admin-hint">No items yet. Add one →</p>`; return; }
    wrap.innerHTML = data.map((it, i) =>
      `<div class="admin-item${editing[ds] === i ? " active" : ""}" data-i="${i}">
        <span class="admin-item-title">${it.pinned ? "📌 " : ""}${esc(CFG[ds].title(it))}</span>
        <span class="admin-item-actions">
          <button title="Pin" data-act="pin" data-i="${i}" class="${it.pinned ? "on" : ""}">📌</button>
          <button title="Up" data-act="up" data-i="${i}">↑</button>
          <button title="Down" data-act="down" data-i="${i}">↓</button>
          <button title="Edit" data-act="edit" data-i="${i}">✎</button>
          <button title="Delete" data-act="del" data-i="${i}" class="danger">🗑</button>
        </span>
      </div>`).join("");
    $$(".admin-item-actions button", wrap).forEach((b) =>
      b.addEventListener("click", (e) => { e.stopPropagation(); itemAction(ds, +b.dataset.i, b.dataset.act); }));
    $$(".admin-item", wrap).forEach((el) =>
      el.addEventListener("click", () => { editing[ds] = +el.dataset.i; renderForm(ds); renderList(ds); }));
  }

  async function itemAction(ds, i, act) {
    const data = getData(ds);
    const item = data[i];
    if (act === "edit") { editing[ds] = i; renderForm(ds); renderList(ds); return; }
    try {
      if (act === "del") {
        if (!confirm("Delete this item?")) return;
        if (BE()) await KTBackend.del(ds, item.__id);
        else { const a = S.get(CFG[ds].store, CFG[ds].def()); a.splice(i, 1); saveLocal(ds, a); }
        editing[ds] = -1; toast("Deleted");
      } else if (act === "pin") {
        const val = !item.pinned;
        if (BE()) await KTBackend.setPinned(ds, item.__id, val);
        else { const a = S.get(CFG[ds].store, CFG[ds].def()); a[i].pinned = val; saveLocal(ds, a); }
        toast(val ? "Pinned" : "Unpinned");
      } else if (act === "up" || act === "down") {
        if (BE()) await KTBackend.move(ds, item.__id, act);
        else {
          const a = S.get(CFG[ds].store, CFG[ds].def());
          const j = act === "up" ? i - 1 : i + 1;
          if (j < 0 || j >= a.length) return;
          [a[j], a[i]] = [a[i], a[j]]; saveLocal(ds, a);
        }
      }
      await refresh(ds); renderList(ds); renderForm(ds);
    } catch (e) { toast("Error: " + (e.message || e)); }
  }

  function renderForm(ds) {
    const form = $("#form-" + ds);
    const idx = editing[ds];
    const item = idx >= 0 ? getData(ds)[idx] : {};
    $("#formTitle-" + ds).textContent = idx >= 0 ? "Edit item" : "New item";
    const catKeys = CFG[ds].catStore ? Object.keys(getCats(ds)) : [];

    form.innerHTML = FIELDS[ds].map((f) => {
      const val = item[f.k] != null ? (Array.isArray(item[f.k]) ? item[f.k].join("\n") : item[f.k]) : "";
      let input;
      if (f.t === "textarea" || f.t === "list") input = `<textarea name="${f.k}" rows="3" placeholder="${esc(f.ph || "")}">${esc(val)}</textarea>`;
      else if (f.t === "select") input = `<select name="${f.k}">${f.opts.map((o) => `<option${val === o ? " selected" : ""}>${o}</option>`).join("")}</select>`;
      else if (f.t === "cat") {
        const list = catKeys.length ? `<datalist id="dl-${ds}-${f.k}">${catKeys.map((k) => `<option value="${esc(k)}">`).join("")}</datalist>` : "";
        input = `<input type="text" name="${f.k}" value="${esc(val)}" list="dl-${ds}-${f.k}" placeholder="${esc(catKeys.join(" / ") || "category key")}" />${list}`;
      } else if (f.t === "file") {
        input = `<input type="text" name="${f.k}" value="${esc(val)}" placeholder="path, URL, or drop a file below" />
          <div class="dropzone dz-sm" data-for="${f.k}"><div class="dz-inner"><span class="dz-icon">⬆</span><span>Drop file or click</span></div><input type="file" hidden accept="${f.accept || ""}"></div>
          <div class="dz-preview" data-prev="${f.k}"></div>`;
      } else input = `<input type="${f.t === "date" ? "date" : "text"}" name="${f.k}" value="${esc(val)}" placeholder="${esc(f.ph || "")}" />`;
      return `<label class="admin-field"><span>${esc(f.label)}</span>${input}</label>`;
    }).join("") +
      `<div class="admin-form-actions">
        <button type="submit" class="btn btn-primary">${idx >= 0 ? "Save changes" : "Add item"}</button>
        ${idx >= 0 ? '<button type="button" class="btn btn-ghost" id="cancel-' + ds + '">Cancel</button>' : ""}
      </div>`;

    $$(".dropzone[data-for]", form).forEach((dz) => wireFileDrop(dz, form));
    FIELDS[ds].forEach((f) => { if (f.t === "file" && item[f.k]) showPreview(form, f.k, item[f.k]); });

    form.onsubmit = async (e) => {
      e.preventDefault();
      const obj = idx >= 0 ? Object.assign({}, getData(ds)[idx]) : {};
      FIELDS[ds].forEach((f) => {
        const el = form.elements[f.k]; if (!el) return;
        const v = el.value;
        if (f.t === "list") { const arr = v.split("\n").map((s) => s.trim()).filter(Boolean); if (arr.length) obj[f.k] = arr; else delete obj[f.k]; }
        else if (v !== "") obj[f.k] = v; else delete obj[f.k];
      });
      try {
        if (BE()) {
          if (idx >= 0) await KTBackend.save(ds, obj.__id, obj);
          else await KTBackend.add(ds, obj);
        } else {
          const a = S.get(CFG[ds].store, CFG[ds].def());
          if (idx >= 0) a[idx] = obj;
          else if (CFG[ds].addTop) a.unshift(obj); else a.push(obj);
          saveLocal(ds, a);
        }
        editing[ds] = -1;
        await refresh(ds); renderList(ds); renderForm(ds);
        toast(idx >= 0 ? "Saved" : "Added");
      } catch (err) { toast("Error: " + (err.message || err)); }
    };
    const cancel = $("#cancel-" + ds);
    if (cancel) cancel.addEventListener("click", () => { editing[ds] = -1; renderForm(ds); renderList(ds); });
  }

  /* ---------- File upload (Storage in backend mode, IndexedDB locally) ---------- */
  function wireFileDrop(dz, form) {
    const key = dz.dataset.for;
    const fileInput = dz.querySelector('input[type="file"]');
    const set = async (file) => {
      if (!file) return;
      dz.classList.add("busy");
      try {
        let ref;
        file = await compressImage(file);
        if (BE()) ref = await KTBackend.uploadFile(file);     // public https URL
        else if (F) ref = "idb:" + await F.put(file);          // local IndexedDB
        else throw new Error("no storage");
        form.elements[key].value = ref;
        showPreview(form, key, ref, file);
        toast("Uploaded: " + file.name);
      } catch (e) { toast("Upload failed: " + (e.message || e)); }
      finally { dz.classList.remove("busy"); }
    };
    dz.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => { if (fileInput.files[0]) set(fileInput.files[0]); });
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); }));
    dz.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) set(f); });
  }
  async function showPreview(form, key, val, file) {
    const box = form.querySelector(`[data-prev="${key}"]`);
    if (!box) return;
    let name = file ? file.name : val, type = file ? file.type : "", url = val;
    if (F && F.isRef(val)) { url = await F.url(F.refId(val)); if (!type) { const rec = await F.get(F.refId(val)); if (rec) { type = rec.type; name = rec.name; } } }
    const isImg = (type && type.indexOf("image") === 0) || /\.(jpg|jpeg|png|webp|gif)$/i.test(name || "") || /\/media\//.test(val) && /image/i.test(val);
    box.innerHTML = isImg && url ? `<img src="${esc(url)}" alt=""><span>${esc(name || "")}</span>` : `<span class="dz-file">📄 ${esc(name || val)}</span>`;
  }

  /* ---------- Categories CRUD ---------- */
  function renderCats(ds) {
    const wrap = $("#cats-" + ds);
    if (!wrap) return;
    const cats = getCats(ds);
    const rows = Object.keys(cats).map((k) =>
      `<div class="cat-row" data-key="${esc(k)}">
        <input class="cat-icon" value="${esc(cats[k].icon || "")}" placeholder="🔖" />
        <input class="cat-key" value="${esc(k)}" readonly />
        <input class="cat-en" value="${esc(cats[k].en || "")}" placeholder="EN" />
        <input class="cat-uz" value="${esc(cats[k].uz || "")}" placeholder="UZ" />
        <button class="cat-del danger" title="Remove">🗑</button>
      </div>`).join("");
    wrap.innerHTML =
      `<h2>Categories</h2>
       <p class="admin-hint">Keys must match items' <code>cat</code> field.</p>
       <div class="cat-list">${rows || '<p class="admin-hint">No categories yet.</p>'}</div>
       <div class="cat-add">
         <input id="nc-key-${ds}" placeholder="key" />
         <input id="nc-icon-${ds}" placeholder="🔖" />
         <input id="nc-en-${ds}" placeholder="EN" />
         <input id="nc-uz-${ds}" placeholder="UZ" />
         <button class="btn btn-ghost btn-sm" id="nc-add-${ds}">+ Add</button>
       </div>
       <button class="btn btn-primary btn-sm" id="cat-save-${ds}" style="margin-top:14px">Save labels</button>`;

    $("#nc-add-" + ds).addEventListener("click", async () => {
      const key = $("#nc-key-" + ds).value.trim();
      if (!key) { toast("Enter a category key"); return; }
      const obj = { en: $("#nc-en-" + ds).value.trim() || key, uz: $("#nc-uz-" + ds).value.trim() || key, icon: $("#nc-icon-" + ds).value.trim() };
      try {
        if (BE()) await KTBackend.catSave(ds, key, obj);
        else { const c = S.get(CFG[ds].catStore, CFG[ds].catDef()); c[key] = obj; saveLocalCats(ds, c); }
        await refreshCats(ds); renderCats(ds); renderForm(ds); toast("Category added");
      } catch (e) { toast("Error: " + (e.message || e)); }
    });
    $$(".cat-del", wrap).forEach((b) =>
      b.addEventListener("click", async () => {
        const key = b.closest(".cat-row").dataset.key;
        if (!confirm("Remove category '" + key + "'?")) return;
        try {
          if (BE()) await KTBackend.catDel(ds, key);
          else { const c = S.get(CFG[ds].catStore, CFG[ds].catDef()); delete c[key]; saveLocalCats(ds, c); }
          await refreshCats(ds); renderCats(ds); renderForm(ds); toast("Removed");
        } catch (e) { toast("Error: " + (e.message || e)); }
      }));
    $("#cat-save-" + ds).addEventListener("click", async () => {
      try {
        for (const row of $$(".cat-row", wrap)) {
          const key = row.dataset.key;
          const obj = { en: row.querySelector(".cat-en").value.trim(), uz: row.querySelector(".cat-uz").value.trim(), icon: row.querySelector(".cat-icon").value.trim() };
          if (BE()) await KTBackend.catSave(ds, key, obj);
          else { const c = S.get(CFG[ds].catStore, CFG[ds].catDef()); c[key] = obj; saveLocalCats(ds, c); }
        }
        await refreshCats(ds); renderForm(ds); toast("Categories saved");
      } catch (e) { toast("Error: " + (e.message || e)); }
    });
  }

  /* ---------- Media library ---------- */
  async function renderMedia() {
    const grid = $("#mediaGrid");
    try {
      let items;
      if (BE()) items = await KTBackend.storageList();
      else if (F) items = (await F.list()).map((it) => ({ id: it.id, name: it.name, type: it.type, size: it.size }));
      else { grid.innerHTML = `<p class="admin-hint">File storage unavailable.</p>`; return; }
      if (!items.length) { grid.innerHTML = `<p class="admin-hint">No uploaded files yet.</p>`; return; }
      grid.innerHTML = "";
      for (const it of items) {
        const url = BE() ? it.url : await F.url(it.id);
        const ref = BE() ? it.url : "idb:" + it.id;
        const isImg = it.type && it.type.indexOf("image") === 0;
        const card = document.createElement("div");
        card.className = "media-card glass";
        card.innerHTML =
          `<div class="media-thumb">${isImg ? `<img src="${esc(url)}" alt="">` : `<span>${it.type && it.type.indexOf("pdf") >= 0 ? "📕" : it.type && it.type.indexOf("video") === 0 ? "🎬" : "📄"}</span>`}</div>
           <div class="media-name" title="${esc(it.name)}">${esc(it.name)}</div>
           <div class="media-meta">${(it.size / 1024).toFixed(0)} KB</div>
           <div class="media-actions">
             <button data-act="copy">Copy ref</button>
             <button data-act="dl">Open</button>
             <button data-act="del" class="danger">Delete</button>
           </div>`;
        card.querySelector('[data-act="copy"]').addEventListener("click", async () => { try { await navigator.clipboard.writeText(ref); toast("Copied"); } catch (e) { toast(ref); } });
        card.querySelector('[data-act="dl"]').addEventListener("click", () => window.open(url, "_blank"));
        card.querySelector('[data-act="del"]').addEventListener("click", async () => {
          if (!confirm("Delete this file?")) return;
          if (BE()) await KTBackend.storageRemove(it.name); else await F.del(it.id);
          renderMedia(); toast("Deleted");
        });
        grid.appendChild(card);
      }
    } catch (e) { grid.innerHTML = `<p class="admin-hint">Error: ${esc(e.message || e)}</p>`; }
  }
  function initMedia() {
    const dz = $("#mediaDrop"), input = $("#mediaInput");
    if (!dz) return;
    const upload = async (files) => {
      dz.classList.add("busy");
      for (let f of files) { try { f = await compressImage(f); if (BE()) await KTBackend.uploadFile(f); else await F.put(f); } catch (e) { toast("Upload failed"); } }
      dz.classList.remove("busy"); renderMedia(); toast(files.length + " file(s) uploaded");
    };
    dz.addEventListener("click", () => input.click());
    input.addEventListener("change", () => { if (input.files.length) upload([...input.files]); input.value = ""; });
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); }));
    dz.addEventListener("drop", (e) => { if (e.dataTransfer.files.length) upload([...e.dataTransfer.files]); });
  }

  /* ---------- Inbox (contact messages) ---------- */
  async function renderInbox() {
    const wrap = $("#inboxList");
    if (!BE()) { wrap.innerHTML = `<p class="admin-hint">Available in backend mode only.</p>`; return; }
    wrap.innerHTML = `<p class="admin-hint">Loading…</p>`;
    try {
      const msgs = await KTBackend.listMessages();
      if (!msgs.length) { wrap.innerHTML = `<p class="admin-hint">No messages yet.</p>`; return; }
      wrap.innerHTML = msgs.map((m) =>
        `<div class="msg-card">
          <div class="msg-top"><b>${esc(m.name || "(no name)")}</b><span>${esc(m.created_at ? new Date(m.created_at).toLocaleString() : "")}</span></div>
          ${m.email ? `<a class="msg-email" href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ""}
          <p class="msg-body">${esc(m.message || "")}</p>
          <button class="btn btn-ghost btn-sm msg-del" data-id="${esc(m.id)}">Delete</button>
        </div>`).join("");
      $$(".msg-del", wrap).forEach((b) => b.addEventListener("click", async () => {
        if (!confirm("Delete this message?")) return;
        try { await KTBackend.deleteMessage(b.dataset.id); renderInbox(); toast("Deleted"); } catch (e) { toast("Error"); }
      }));
    } catch (e) { wrap.innerHTML = `<p class="admin-hint">Error: ${esc(e.message || e)}</p>`; }
  }

  /* ---------- Analytics ---------- */
  async function renderAnalytics() {
    const wrap = $("#analyticsView");
    if (!BE()) { wrap.innerHTML = `<p class="admin-hint">Available in backend mode only.</p>`; return; }
    wrap.innerHTML = `<p class="admin-hint">Loading…</p>`;
    try {
      const views = await KTBackend.listViews();
      const total = views.length;
      const today = new Date().toISOString().slice(0, 10);
      const todayCount = views.filter((v) => (v.created_at || "").slice(0, 10) === today).length;
      const byPage = {}; views.forEach((v) => { const p = v.path || "/"; byPage[p] = (byPage[p] || 0) + 1; });
      const days = {}; for (let i = 6; i >= 0; i--) days[new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)] = 0;
      views.forEach((v) => { const d = (v.created_at || "").slice(0, 10); if (d in days) days[d]++; });
      const max = Math.max(1, ...Object.values(days));
      wrap.innerHTML =
        `<div class="astat-row"><div class="astat"><span class="anum">${total}</span><span class="alabel">Total views</span></div>` +
        `<div class="astat"><span class="anum">${todayCount}</span><span class="alabel">Today</span></div></div>` +
        `<h3 class="asub">Last 7 days</h3><div class="abars">` +
        Object.entries(days).map(([d, c]) => `<div class="abar"><b>${c}</b><i style="height:${Math.round(c / max * 80) + 2}px"></i><span>${d.slice(5)}</span></div>`).join("") +
        `</div><h3 class="asub">By page</h3><div class="apages">` +
        Object.entries(byPage).sort((a, b) => b[1] - a[1]).map(([p, c]) => `<div class="apage"><span>${esc(p)}</span><b>${c}</b></div>`).join("") +
        `</div>`;
    } catch (e) { wrap.innerHTML = `<p class="admin-hint">Error: ${esc(e.message || e)}</p>`; }
  }

  /* ---------- Site text editor (hero / about / contact) ---------- */
  const SITE_FIELDS = [
    { k: "heroBadge", label: "Hero badge (EN)", t: "text" },
    { k: "heroBadgeUz", label: "Hero badge (UZ)", t: "text" },
    { k: "heroRoles", label: "Rotating titles (EN, one per line)", t: "list" },
    { k: "heroRolesUz", label: "Rotating titles (UZ, one per line)", t: "list" },
    { k: "heroDesc", label: "Hero description (EN)", t: "textarea" },
    { k: "heroDescUz", label: "Hero description (UZ)", t: "textarea" },
    { k: "aboutTitle", label: "About title (EN)", t: "text" },
    { k: "aboutTitleUz", label: "About title (UZ)", t: "text" },
    { k: "aboutP1", label: "About paragraph 1 (EN)", t: "textarea" },
    { k: "aboutP1Uz", label: "About paragraph 1 (UZ)", t: "textarea" },
    { k: "aboutP2", label: "About paragraph 2 (EN)", t: "textarea" },
    { k: "aboutP2Uz", label: "About paragraph 2 (UZ)", t: "textarea" },
    { k: "aboutP3", label: "About paragraph 3 (EN)", t: "textarea" },
    { k: "aboutP3Uz", label: "About paragraph 3 (UZ)", t: "textarea" },
    { k: "contactTitle", label: "Contact title (EN)", t: "text" },
    { k: "contactTitleUz", label: "Contact title (UZ)", t: "text" },
    { k: "contactDesc", label: "Contact description (EN)", t: "textarea" },
    { k: "contactDescUz", label: "Contact description (UZ)", t: "textarea" },
    { k: "socialLinkedin", label: "LinkedIn URL", t: "text", ph: "https://linkedin.com/in/…" },
    { k: "socialWebsite", label: "Website URL", t: "text", ph: "https://vasfiy.uz" },
    { k: "socialEmail", label: "Email address", t: "text", ph: "you@example.com" },
    { k: "contactLocation", label: "Location (EN)", t: "text", ph: "Tashkent, Uzbekistan" },
    { k: "contactLocationUz", label: "Location (UZ)", t: "text" },
    { k: "contactWebsite", label: "Website label (shown)", t: "text", ph: "vasfiy.uz" },
    { k: "contactRelocate", label: "Relocation note (EN)", t: "text", ph: "Open to relocation (Europe)" },
    { k: "contactRelocateUz", label: "Relocation note (UZ)", t: "text" },
    { k: "stat1Num", label: "Stat 1 — number", t: "text", ph: "1" },
    { k: "stat1Suffix", label: "Stat 1 — suffix", t: "text", ph: "%" },
    { k: "stat1Label", label: "Stat 1 — label (EN)", t: "text" },
    { k: "stat1LabelUz", label: "Stat 1 — label (UZ)", t: "text" },
    { k: "stat2Num", label: "Stat 2 — number", t: "text", ph: "40" },
    { k: "stat2Suffix", label: "Stat 2 — suffix", t: "text", ph: "%" },
    { k: "stat2Label", label: "Stat 2 — label (EN)", t: "text" },
    { k: "stat2LabelUz", label: "Stat 2 — label (UZ)", t: "text" },
    { k: "stat3Num", label: "Stat 3 — number", t: "text", ph: "20700" },
    { k: "stat3Suffix", label: "Stat 3 — suffix", t: "text", ph: "+" },
    { k: "stat3Label", label: "Stat 3 — label (EN)", t: "text" },
    { k: "stat3LabelUz", label: "Stat 3 — label (UZ)", t: "text" },
    { k: "stat4Num", label: "Stat 4 — number", t: "text", ph: "3" },
    { k: "stat4Suffix", label: "Stat 4 — suffix", t: "text" },
    { k: "stat4Label", label: "Stat 4 — label (EN)", t: "text" },
    { k: "stat4LabelUz", label: "Stat 4 — label (UZ)", t: "text" },
    { k: "skillsTitle", label: "Skills section heading (EN)", t: "text", ph: "Technical toolkit" },
    { k: "skillsTitleUz", label: "Skills section heading (UZ)", t: "text" },
    { k: "expTitle", label: "Experience heading (EN)", t: "text", ph: "Where I've worked" },
    { k: "expTitleUz", label: "Experience heading (UZ)", t: "text" },
    { k: "projTitle", label: "Projects heading (EN)", t: "text", ph: "Projects & online presence" },
    { k: "projTitleUz", label: "Projects heading (UZ)", t: "text" },
    { k: "galleryTitle", label: "Gallery heading (EN)", t: "text", ph: "Moments & snapshots" },
    { k: "galleryTitleUz", label: "Gallery heading (UZ)", t: "text" },
    { k: "travelTitle", label: "Journal heading (EN)", t: "text", ph: "Notes from the road" },
    { k: "travelTitleUz", label: "Journal heading (UZ)", t: "text" },
    { k: "libraryTitle", label: "Library heading (EN)", t: "text", ph: "Books & resources" },
    { k: "libraryTitleUz", label: "Library heading (UZ)", t: "text" },
    { k: "eduTitle", label: "Education heading (EN)", t: "text", ph: "Education & certifications" },
    { k: "eduTitleUz", label: "Education heading (UZ)", t: "text" },
    { k: "footerText", label: "Footer line (EN)", t: "text", ph: "Built with HTML, CSS & JavaScript" },
    { k: "footerTextUz", label: "Footer line (UZ)", t: "text" },
    { k: "metaTitle", label: "SEO browser title (EN)", t: "text" },
    { k: "metaTitleUz", label: "SEO browser title (UZ)", t: "text" },
    { k: "metaDesc", label: "SEO meta description (EN)", t: "textarea" },
    { k: "metaDescUz", label: "SEO meta description (UZ)", t: "textarea" },
  ];
  async function renderSiteText() {
    const form = $("#siteTextForm");
    if (!form) return;
    let cur = {};
    try { cur = (BE() ? (await KTBackend.getSettings()).siteText : S.get("siteText", {})) || {}; } catch (e) { cur = {}; }
    form.innerHTML = SITE_FIELDS.map((f) => {
      const val = cur[f.k] != null ? (Array.isArray(cur[f.k]) ? cur[f.k].join("\n") : cur[f.k]) : "";
      const input = (f.t === "textarea" || f.t === "list") ? `<textarea name="${f.k}" rows="3">${esc(val)}</textarea>` : `<input type="text" name="${f.k}" value="${esc(val)}">`;
      return `<label class="admin-field"><span>${esc(f.label)}</span>${input}</label>`;
    }).join("") + `<div class="admin-form-actions"><button type="submit" class="btn btn-primary">Save site text</button></div>`;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const obj = {};
      SITE_FIELDS.forEach((f) => {
        const el = form.elements[f.k]; if (!el) return;
        const v = el.value;
        if (f.t === "list") { const arr = v.split("\n").map((s) => s.trim()).filter(Boolean); if (arr.length) obj[f.k] = arr; }
        else if (v.trim() !== "") obj[f.k] = v;
      });
      try { if (BE()) await KTBackend.setSetting("siteText", obj); else S.set("siteText", obj); toast("Site text saved"); }
      catch (err) { toast("Error: " + (err.message || err)); }
    };
  }

  /* ---------- Tabs ---------- */
  function initTabs() {
    $$(".admin-tab").forEach((tab) =>
      tab.addEventListener("click", () => {
        $$(".admin-tab").forEach((t) => t.classList.toggle("active", t === tab));
        $$(".admin-panel").forEach((p) => (p.hidden = p.id !== "panel-" + tab.dataset.tab));
        if (tab.dataset.tab === "media") renderMedia();
        if (tab.dataset.tab === "inbox") renderInbox();
        if (tab.dataset.tab === "analytics") renderAnalytics();
      }));
  }

  /* ---------- Export ---------- */
  function download(name, text) {
    const blob = new Blob([text], { type: "text/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const J = (v) => JSON.stringify(v, null, 2);
  function stripIds(arr) { return arr.map((o) => { const c = Object.assign({}, o); delete c.__id; return c; }); }
  function initSettings() {
    $("#exportContent").addEventListener("click", () => {
      const t = "/* Generated by admin. Replace data/content.js to publish. */\n" +
        "window.GALLERY_CATEGORIES = " + J(getCats("gallery")) + ";\n\nwindow.GALLERY = " + J(stripIds(getData("gallery"))) + ";\n\nwindow.BLOG = " + J(stripIds(getData("blog"))) + ";\n";
      download("content.js", t); toast("Exported content.js");
    });
    $("#exportLessons").addEventListener("click", () => {
      const t = "/* Generated by admin. Replace data/lessons.js to publish. */\n" +
        "window.LESSON_CATEGORIES = " + J(getCats("lessons")) + ";\n\nwindow.LESSONS = " + J(stripIds(getData("lessons"))) + ";\n";
      download("lessons.js", t); toast("Exported lessons.js");
    });
    $("#exportBooks").addEventListener("click", () => {
      const t = "/* Generated by admin. Replace data/books.js to publish. */\n" +
        "window.BOOK_CATEGORIES = " + J(getCats("books")) + ";\n\nwindow.BOOKS = " + J(stripIds(getData("books"))) + ";\n";
      download("books.js", t); toast("Exported books.js");
    });
    $$("[data-reset]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (BE()) { toast("Backend mode: edit/delete items directly."); return; }
        if (!confirm("Reset " + b.dataset.reset + " to defaults?")) return;
        S.remove(b.dataset.reset);
        if (CFG[b.dataset.reset]) await renderPanel(b.dataset.reset);
        toast("Reset " + b.dataset.reset);
      }));
    $("#savePass").addEventListener("click", () => {
      const v = $("#newPass").value.trim();
      if (!v) { toast("Enter a passcode"); return; }
      S.set("adminPass", v); $("#newPass").value = ""; toast("Passcode updated (local mode)");
    });

    // Profile photo (backend mode only — stored in Supabase settings)
    if (BE()) {
      const card = $("#profileCard"); card.hidden = false;
      const dz = $("#profileDrop"), input = $("#profileInput"), prev = $("#profilePrev");
      const showPrev = (url) => { prev.innerHTML = url ? `<img src="${esc(url)}" alt=""><span>Current photo</span>` : ""; };
      KTBackend.getSettings().then((s) => showPrev(s && s.profilePhoto)).catch(() => {});
      const up = async (file) => {
        if (!file) return; dz.classList.add("busy");
        try { file = await compressImage(file, 800, 0.85); const url = await KTBackend.uploadFile(file); await KTBackend.setSetting("profilePhoto", url); showPrev(url); toast("Profile photo updated"); }
        catch (e) { toast("Upload failed: " + (e.message || e)); }
        finally { dz.classList.remove("busy"); }
      };
      dz.addEventListener("click", () => input.click());
      input.addEventListener("change", () => { if (input.files[0]) up(input.files[0]); });
      ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
      ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); }));
      dz.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) up(f); });
    }
  }

  /* ---------- CV (PDF) upload → Supabase storage + settings.cvUrl ---------- */
  async function initCvUpload() {
    if (!BE()) return;
    const card = $("#cvCard"); if (!card) return; card.hidden = false;
    const dz = $("#cvDrop"), input = $("#cvInput"), prev = $("#cvPrev");
    const show = (url) => { prev.innerHTML = url ? `<a href="${esc(url)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">📄 Current CV ↗</a>` : ""; };
    KTBackend.getSettings().then((s) => show(s && s.cvUrl)).catch(() => {});
    const up = async (file) => {
      if (!file) return;
      if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) { toast("Please upload a PDF file"); return; }
      dz.classList.add("busy");
      try { const url = await KTBackend.uploadFile(file); await KTBackend.setSetting("cvUrl", url); show(url); toast("CV updated — live on the site"); }
      catch (e) { toast("Upload failed: " + (e.message || e)); }
      finally { dz.classList.remove("busy"); }
    };
    dz.addEventListener("click", () => input.click());
    input.addEventListener("change", () => { if (input.files[0]) up(input.files[0]); });
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); }));
    dz.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) up(f); });
  }

  /* ---------- Gate (Supabase auth OR local passcode) ---------- */
  async function unlock() {
    $("#adminLock").style.display = "none";
    $("#adminApp").hidden = false;
    for (const ds of ["gallery", "blog", "books", "lessons", "experience", "skills", "certs", "projects", "education", "languages"]) await renderPanel(ds);
    renderSiteText();
    initMedia();
    initCvUpload();
  }
  function initGate() {
    const lock = $("#adminLock"), input = $("#lockInput"), btn = $("#lockBtn");
    if (BE()) {
      $("#lockMsg").textContent = "Sign in with your Supabase admin email & password.";
      input.placeholder = "Password";
      const email = document.createElement("input");
      email.type = "email"; email.id = "lockEmail"; email.placeholder = "Admin email"; email.autocomplete = "username";
      input.parentNode.insertBefore(email, input);
      $(".lock-note").innerHTML = "Real account login (Supabase). Changes go live for everyone.";
      const tryUnlock = async () => {
        btn.disabled = true; $("#lockMsg").textContent = "Signing in…";
        try { await KTBackend.signIn(email.value.trim(), input.value); await unlock(); }
        catch (e) { $("#lockMsg").textContent = "Login failed: " + (e.message || e); }
        finally { btn.disabled = false; }
      };
      btn.addEventListener("click", tryUnlock);
      [email, input].forEach((el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); }));
      email.focus();
      KTBackend.getUser().then((u) => { if (u) unlock(); });
    } else {
      const getPass = () => S.get("adminPass", "admin");
      const tryUnlock = () => {
        if (input.value === getPass() || sessionStorage.getItem("kt_admin_ok") === "1") { sessionStorage.setItem("kt_admin_ok", "1"); unlock(); }
        else { $("#lockMsg").textContent = "Wrong passcode — try again."; input.value = ""; input.focus(); }
      };
      if (sessionStorage.getItem("kt_admin_ok") === "1") unlock();
      btn.addEventListener("click", tryUnlock);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });
      input.focus();
    }
    $("#lockNow").addEventListener("click", async () => {
      if (BE()) { await KTBackend.signOut(); } else { sessionStorage.removeItem("kt_admin_ok"); }
      location.reload();
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    initTabs();
    initSettings();
    if (BE()) { try { await KTBackend.init(); } catch (e) { /* fall back */ } }
    initGate();
  });
})();
