/* ============================================================
   Linux & Cybersecurity Lab — page logic
   i18n, theme, lessons render + filter, terminal wiring
   ============================================================ */

const LX_I18N = {
  en: {
    "lx.nav.back": "← Portfolio",
    "lx.nav.lessons": "Lessons",
    "lx.nav.terminal": "Terminal",
    "lx.badge": "🐧 Interactive · in your browser",
    "lx.title": "Linux & Cybersecurity Lab",
    "lx.desc": "Daily Linux and cybersecurity lessons — paired with a real, interactive terminal you can practice in. Type commands, explore a virtual filesystem, and learn by doing.",
    "lx.ctaLessons": "Browse lessons",
    "lx.ctaTerminal": "Open the terminal",
    "lx.lessons.kicker": "Lessons",
    "lx.lessons.title": "Daily Linux & security notes",
    "lx.term.kicker": "Terminal",
    "lx.term.title": "Practice in a live shell",
    "lx.term.try": "Try:",
    "lx.term.note": "This is a safe, simulated shell — nothing leaves your browser. Use ↑/↓ for history and Tab to autocomplete.",
    "lx.all": "All",
    "lx.tryIt": "Try in terminal ↓",
    "lx.search": "Search lessons…",
    "lx.noResults": "No lessons match your search.",
    "lx.progress": "Your progress",
    "lx.markDone": "Mark as done",
    "lx.completed": "Completed",
    "theme.title": "Color theme",
    "theme.mode": "Appearance"
  },
  uz: {
    "lx.nav.back": "← Portfolio",
    "lx.nav.lessons": "Darslar",
    "lx.nav.terminal": "Terminal",
    "lx.badge": "🐧 Interaktiv · brauzeringizda",
    "lx.title": "Linux & Kibxavfsizlik Laboratoriyasi",
    "lx.desc": "Har kungi Linux va kibxavfsizlik darslari — mashq qilish uchun haqiqiy, interaktiv terminal bilan birga. Buyruqlarni yozing, virtual fayl tizimini o'rganing va amaliyot orqali o'rganing.",
    "lx.ctaLessons": "Darslarni ko'rish",
    "lx.ctaTerminal": "Terminalni ochish",
    "lx.lessons.kicker": "Darslar",
    "lx.lessons.title": "Kunlik Linux & xavfsizlik eslatmalari",
    "lx.term.kicker": "Terminal",
    "lx.term.title": "Jonli terminalda mashq qiling",
    "lx.term.try": "Sinab ko'ring:",
    "lx.term.note": "Bu xavfsiz, simulyatsiya qilingan terminal — hech narsa brauzeringizdan chiqmaydi. Tarix uchun ↑/↓, avtoto'ldirish uchun Tab.",
    "lx.all": "Hammasi",
    "lx.tryIt": "Terminalda sinab ko'rish ↓",
    "lx.search": "Darslarni qidirish…",
    "lx.noResults": "Qidiruvingizga mos dars topilmadi.",
    "lx.progress": "Sizning natijangiz",
    "lx.markDone": "Bajarildi deb belgilash",
    "lx.completed": "Bajarildi",
    "theme.title": "Rang temasi",
    "theme.mode": "Ko'rinish"
  }
};

let lxLang = localStorage.getItem("lang") || "en";
let lessonFilter = "all";
let lessonQuery = "";

/* Data sources: backend cache (KTData) → localStorage (KTStore) → defaults */
function LDATA() { return (window.KTData ? window.KTData.lessons : (window.KTStore ? KTStore.lessons() : window.LESSONS)) || []; }
function LCATS() { return (window.KTData ? window.KTData.lessonCats : (window.KTStore ? KTStore.lessonCats() : window.LESSON_CATEGORIES)) || {}; }
function lessonId(l) { return window.KTStore ? KTStore.lessonId(l) : (l.date + "|" + (l.title || "")); }
function isDone(l) { return window.KTStore ? !!KTStore.progress()[lessonId(l)] : false; }

function lxEsc(s) {
  return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
/* render lesson body: \n\n -> paragraphs, `code` -> <code> */
function lxRich(text) {
  return lxEsc(text)
    .split(/\n\n+/)
    .map((p) => "<p>" + p.replace(/\n/g, "<br>").replace(/`([^`]+)`/g, "<code>$1</code>") + "</p>")
    .join("");
}
function lxDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  try { return dt.toLocaleDateString(lxLang === "uz" ? "uz-UZ" : "en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch (e) { return d; }
}

/* ---------- i18n ---------- */
function lxApplyLang(lang) {
  lxLang = lang;
  document.documentElement.lang = lang;
  localStorage.setItem("lang", lang);
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = LX_I18N[lang][el.getAttribute("data-i18n")];
    if (v !== undefined) el.innerHTML = v;
  });
  document.querySelectorAll(".lang-opt").forEach((o) => o.classList.toggle("active", o.dataset.lang === lang));
  const search = document.getElementById("lessonSearch");
  if (search) search.placeholder = LX_I18N[lang]["lx.search"];
  renderFilters();
  renderLessons();
}

/* ---------- Lessons + filters ---------- */
function lessonCats() {
  const map = LCATS();
  const present = {};
  LDATA().forEach((l) => { if (l.cat) present[l.cat] = true; });
  return Object.keys(map).filter((k) => present[k]);
}
function renderFilters() {
  const bar = document.getElementById("lessonFilters");
  if (!bar) return;
  const map = LCATS();
  const cats = lessonCats();
  const chip = (key, label, icon) =>
    `<button class="filter-chip${lessonFilter === key ? " active" : ""}" data-filter="${key}">${icon ? icon + " " : ""}${lxEsc(label)}</button>`;
  let html = chip("all", LX_I18N[lxLang]["lx.all"], "✦");
  html += cats.map((k) => chip(k, (map[k][lxLang] || map[k].en || k), map[k].icon)).join("");
  bar.innerHTML = html;
  bar.querySelectorAll(".filter-chip").forEach((b) =>
    b.addEventListener("click", () => { lessonFilter = b.dataset.filter; renderFilters(); renderLessons(); }));
}
function renderProgress() {
  const wrap = document.getElementById("lessonProgress");
  if (!wrap) return;
  const all = LDATA();
  const done = all.filter(isDone).length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  wrap.innerHTML =
    `<div class="prog-top"><span>${LX_I18N[lxLang]["lx.progress"]}</span><span class="prog-count">${done}/${all.length}</span></div>` +
    `<div class="prog-bar"><i style="width:${pct}%"></i></div>`;
}
function renderLessons() {
  const grid = document.getElementById("lessonsGrid");
  if (!grid) return;
  const map = LCATS();
  let posts = LDATA();
  renderProgress();
  if (lessonFilter !== "all") posts = posts.filter((l) => l.cat === lessonFilter);
  if (lessonQuery) {
    const q = lessonQuery.toLowerCase();
    posts = posts.filter((l) =>
      [l.title, l.titleUz, l.body, l.bodyUz, (l.commands || []).join(" ")]
        .some((s) => (s || "").toLowerCase().includes(q)));
  }
  posts = posts.map((x, i) => [x, i]).sort((a, b) => (b[0].pinned ? 1 : 0) - (a[0].pinned ? 1 : 0) || a[1] - b[1]).map((p) => p[0]);
  if (!posts.length) { grid.innerHTML = `<p class="empty-note">${LX_I18N[lxLang]["lx.noResults"]}</p>`; return; }

  grid.innerHTML = posts.map((l) => {
    const title = lxLang === "uz" ? (l.titleUz || l.title || "") : (l.title || l.titleUz || "");
    const body = lxLang === "uz" ? (l.bodyUz || l.body || "") : (l.body || l.bodyUz || "");
    const cat = map[l.cat] || {};
    const badge = l.cat ? `<span class="lesson-cat">${cat.icon || ""} ${lxEsc(cat[lxLang] || cat.en || l.cat)}</span>` : "";
    const cmds = (l.commands || []).map((c) =>
      `<button class="cmd-chip" data-cmd="${lxEsc(c)}">${lxEsc(c)}</button>`).join("");
    const cmdBlock = cmds ? `<div class="lesson-cmds"><span class="lesson-cmds-label">${LX_I18N[lxLang]["lx.tryIt"]}</span>${cmds}</div>` : "";
    const done = isDone(l);
    const doneBtn = `<button class="lesson-done${done ? " is-done" : ""}" data-lid="${lxEsc(lessonId(l))}">
        <span class="check">${done ? "✓" : ""}</span>${done ? LX_I18N[lxLang]["lx.completed"] : LX_I18N[lxLang]["lx.markDone"]}</button>`;
    const pin = l.pinned ? `<span class="pin-badge">📌</span>` : "";
    return `<article class="lesson-card glass${done ? " done" : ""}">${pin}
        <div class="lesson-meta"><span class="lesson-date">${lxEsc(lxDate(l.date))}</span>${badge}</div>
        <h3>${lxEsc(title)}</h3>
        <div class="lesson-body">${lxRich(body)}</div>
        ${cmdBlock}
        <div class="lesson-foot">${doneBtn}</div>
      </article>`;
  }).join("");

  grid.querySelectorAll(".lesson-done").forEach((b) =>
    b.addEventListener("click", () => {
      if (window.KTStore) KTStore.toggleProgress(b.dataset.lid);
      renderLessons();
    }));
  bindCmdChips();
}

/* ---------- Command chips → terminal ---------- */
function bindCmdChips() {
  document.querySelectorAll(".cmd-chip").forEach((b) => {
    if (b.dataset.bound) return;
    b.dataset.bound = "1";
    b.addEventListener("click", () => {
      if (!window.WebTerm) return;
      document.getElementById("terminal").scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => window.WebTerm.run(b.dataset.cmd), 350);
    });
  });
}

/* ---------- Theme (shared behaviour) ---------- */
function lxApplyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  document.querySelectorAll(".swatch").forEach((s) => s.classList.toggle("active", s.dataset.themeVal === theme));
}
function lxApplyMode(mode) {
  document.documentElement.setAttribute("data-mode", mode);
  localStorage.setItem("mode", mode);
  document.querySelectorAll(".mode-opt").forEach((o) => o.classList.toggle("active", o.dataset.modeVal === mode));
}
function lxInitTheme() {
  const fab = document.getElementById("themeFab");
  const panel = document.getElementById("themePanel");
  if (!fab || !panel) return;
  lxApplyTheme(localStorage.getItem("theme") || "ocean");
  lxApplyMode(localStorage.getItem("mode") || "dark");
  fab.addEventListener("click", (e) => { e.stopPropagation(); panel.classList.toggle("open"); });
  document.querySelectorAll(".swatch").forEach((s) => s.addEventListener("click", () => lxApplyTheme(s.dataset.themeVal)));
  const mt = document.getElementById("modeToggle");
  if (mt) mt.addEventListener("click", () => lxApplyMode(document.documentElement.getAttribute("data-mode") === "light" ? "dark" : "light"));
  document.addEventListener("click", (e) => { if (!panel.contains(e.target) && e.target !== fab) panel.classList.remove("open"); });
}

/* ---------- Reveal / nav / menu ---------- */
function lxInitReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
}
function lxInitScroll() {
  const navbar = document.getElementById("navbar");
  const progress = document.getElementById("scrollProgress");
  let ticking = false, lastScrolled = null;
  function update() {
    ticking = false;
    const y = window.scrollY;
    const scrolled = y > 30;
    if (scrolled !== lastScrolled) { navbar.classList.toggle("scrolled", scrolled); lastScrolled = scrolled; }
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  }
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}
function lxInitMenu() {
  const btn = document.getElementById("menuBtn");
  const links = document.getElementById("navLinks");
  if (!btn) return;
  const close = () => { btn.classList.remove("open"); links.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); };
  btn.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    btn.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  });
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("langToggle").addEventListener("click", () => lxApplyLang(lxLang === "en" ? "uz" : "en"));

  const search = document.getElementById("lessonSearch");
  if (search) search.addEventListener("input", () => { lessonQuery = search.value.trim(); renderLessons(); });

  lxInitTheme();
  if (window.WebTerm) window.WebTerm.init(document.getElementById("webterm"));
  lxApplyLang(lxLang);     // renders filters + lessons, binds chips
  bindCmdChips();          // bind the static "Try:" chips too
  lxInitReveal();
  lxInitScroll();
  lxInitMenu();
  lxInitBackend();
});

async function lxInitBackend() {
  if (!window.KTBackend || !KTBackend.enabled) return;
  try {
    if (!(await KTBackend.init())) return;
    window.KTData = await KTBackend.loadAll();
    renderFilters(); renderLessons();
    KTBackend.logView(location.pathname);
    KTBackend.subscribe(async () => {
      window.KTData = await KTBackend.loadAll();
      renderFilters(); renderLessons();
    });
  } catch (e) { console.warn("Backend init failed; using local data.", e); }
}
