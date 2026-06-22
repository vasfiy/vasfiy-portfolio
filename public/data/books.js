/* ============================================================
   KUTUBXONA (PDF kitoblar) — standart kontent
   ------------------------------------------------------------
   Admin panel orqali ham qo'shasiz/tahrirlaysiz. Har bir kitob:
   {
     title: "English title", titleUz: "O'zbekcha nom",
     author: "Author name",
     cover: "📕"  yoki "assets/books/cover.jpg" yoki "idb:<id>",
     file:  "assets/books/book.pdf" yoki "idb:<id>",   // o'qish/yuklash uchun
     desc: "English description", descUz: "Tavsif",
     cat: "linux",          // kategoriya kaliti (ixtiyoriy)
     pinned: false          // tepaga qadash
   }
   ============================================================ */

window.BOOK_CATEGORIES = {
  linux:    { en: "Linux",        uz: "Linux",        icon: "🐧" },
  security: { en: "Security",     uz: "Xavfsizlik",   icon: "🛡️" },
  general:  { en: "General",      uz: "Umumiy",       icon: "📚" }
};

window.BOOKS = [
  {
    title: "The Linux Command Line",
    titleUz: "Linux buyruqlar qatori",
    author: "William Shotts",
    cover: "📗", cat: "linux", pinned: true,
    file: "assets/books/tlcl.pdf",
    desc: "A complete introduction to the Linux command line — the book this lab is based on.",
    descUz: "Linux buyruqlar qatoriga to'liq kirish — bu laboratoriya shu kitob asosida tuzilgan."
  },
  {
    title: "Cybersecurity Fundamentals",
    titleUz: "Kibxavfsizlik asoslari",
    author: "Sample Author",
    cover: "📕", cat: "security",
    file: "assets/books/security-basics.pdf",
    desc: "Notes and references on blue-team fundamentals, SIEM and incident response.",
    descUz: "Blue-team asoslari, SIEM va incident response bo'yicha eslatma va manbalar."
  }
];
