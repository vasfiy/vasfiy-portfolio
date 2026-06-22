import type { Lang } from "./types";

export const DICT = {
  en: {
    "nav.about": "About", "nav.skills": "Skills", "nav.experience": "Experience", "nav.projects": "Projects",
    "nav.explore": "Explore", "nav.gallery": "Gallery", "nav.journal": "Journal", "nav.library": "Library",
    "nav.contact": "Contact", "nav.lab": "Linux Lab", "nav.portfolio": "Portfolio",
    "hero.cta": "Get in touch", "hero.cv": "Download CV", "hero.work": "View my work",
    "about.kicker": "About", "skills.kicker": "Skills", "skills.title": "Technical toolkit", "skills.langs": "Languages",
    "exp.kicker": "Experience", "exp.title": "Where I've worked",
    "proj.kicker": "Projects", "proj.title": "Projects & online presence",
    "edu.kicker": "Education", "edu.title": "Education & certifications", "edu.eduTitle": "🎓 Education", "edu.certTitle": "📜 Certifications",
    "explore.kicker": "Explore", "explore.title": "Step into another room", "explore.open": "Open",
    "explore.galleryDesc": "Albums, moments & snapshots", "explore.journalDesc": "Notes, posts & long reads",
    "explore.libraryDesc": "Books & resources I recommend", "explore.labDesc": "Interactive Linux lessons + terminal",
    "contact.kicker": "Contact", "contact.title": "Let's work together",
    "contact.name": "Name", "contact.email": "Email", "contact.message": "Your message…",
    "contact.send": "Send message", "contact.sending": "Sending…", "contact.sent": "Thanks! I'll get back to you soon.", "contact.error": "Something went wrong. Please email me directly.",
    "blog.title": "Journal", "blog.sub": "Notes, posts & moments from the road.", "blog.empty": "No posts yet.", "blog.read": "Read post →", "blog.viewall": "View all posts →", "blog.all": "All", "blog.min": "min read", "blog.back": "← All posts", "blog.share": "Share this post", "blog.copy": "Copy link", "blog.copied": "Link copied!", "blog.more": "More posts", "blog.notfound": "Post not found.",
    "gallery.title": "Gallery", "gallery.sub": "Albums, moments & snapshots.", "gallery.empty": "No photos yet.", "gallery.viewall": "View all albums →", "gallery.all": "All", "gallery.photos": "photos", "gallery.photo": "photo", "gallery.back": "← All albums",
    "library.title": "Library", "library.sub": "Books & resources worth your time.", "library.empty": "No books yet.", "library.read": "Read", "library.download": "Download", "library.by": "by", "library.viewall": "Open library →",
    "theme.title": "Color theme", "theme.mode": "Appearance", "footer.built": "Built with Next.js, Three.js & Supabase",
  },
  uz: {
    "nav.about": "Men haqimda", "nav.skills": "Ko'nikmalar", "nav.experience": "Tajriba", "nav.projects": "Loyihalar",
    "nav.explore": "Ko'rib chiqish", "nav.gallery": "Galereya", "nav.journal": "Jurnal", "nav.library": "Kutubxona",
    "nav.contact": "Aloqa", "nav.lab": "Linux Lab", "nav.portfolio": "Portfolio",
    "hero.cta": "Bog'lanish", "hero.cv": "CV yuklab olish", "hero.work": "Ishlarimni ko'rish",
    "about.kicker": "Men haqimda", "skills.kicker": "Ko'nikmalar", "skills.title": "Texnik to'plam", "skills.langs": "Tillar",
    "exp.kicker": "Tajriba", "exp.title": "Qayerda ishlaganman",
    "proj.kicker": "Loyihalar", "proj.title": "Loyihalar va onlayn faollik",
    "edu.kicker": "Ta'lim", "edu.title": "Ta'lim va sertifikatlar", "edu.eduTitle": "🎓 Ta'lim", "edu.certTitle": "📜 Sertifikatlar",
    "explore.kicker": "Ko'rib chiqish", "explore.title": "Boshqa xonaga o'ting", "explore.open": "Ochish",
    "explore.galleryDesc": "Albomlar, lahzalar va suratlar", "explore.journalDesc": "Eslatmalar, postlar va uzun maqolalar",
    "explore.libraryDesc": "Tavsiya etgan kitob va resurslarim", "explore.labDesc": "Interaktiv Linux darslari + terminal",
    "contact.kicker": "Aloqa", "contact.title": "Keling, birga ishlaylik",
    "contact.name": "Ism", "contact.email": "Email", "contact.message": "Xabaringiz…",
    "contact.send": "Xabar yuborish", "contact.sending": "Yuborilmoqda…", "contact.sent": "Rahmat! Tez orada javob beraman.", "contact.error": "Xatolik yuz berdi. Iltimos, to'g'ridan-to'g'ri email yozing.",
    "blog.title": "Jurnal", "blog.sub": "Yo'ldan eslatmalar, postlar va lahzalar.", "blog.empty": "Hali post yo'q.", "blog.read": "O'qish →", "blog.viewall": "Barcha postlarni ko'rish →", "blog.all": "Hammasi", "blog.min": "daq o'qish", "blog.back": "← Barcha postlar", "blog.share": "Ushbu postni ulashing", "blog.copy": "Havoladan nusxa olish", "blog.copied": "Havola nusxalandi!", "blog.more": "Boshqa postlar", "blog.notfound": "Post topilmadi.",
    "gallery.title": "Galereya", "gallery.sub": "Albomlar, lahzalar va suratlar.", "gallery.empty": "Hali rasm yo'q.", "gallery.viewall": "Barcha albomlarni ko'rish →", "gallery.all": "Hammasi", "gallery.photos": "ta rasm", "gallery.photo": "rasm", "gallery.back": "← Barcha albomlar",
    "library.title": "Kutubxona", "library.sub": "Vaqtingizga arziydigan kitob va resurslar.", "library.empty": "Hali kitob yo'q.", "library.read": "O'qish", "library.download": "Yuklab olish", "library.by": "muallif", "library.viewall": "Kutubxonani ochish →",
    "theme.title": "Rang temasi", "theme.mode": "Ko'rinish", "footer.built": "Next.js, Three.js va Supabase bilan qurilgan",
  },
} as const;

export type DictKey = keyof typeof DICT["en"];
export const tr = (lang: Lang, k: DictKey) => (DICT[lang] || DICT.en)[k] || (DICT.en as any)[k] || k;

/** Pick a bilingual field: base = "title" → returns title or titleUz based on lang, with fallback. */
export function pick<T extends Record<string, any>>(obj: T, base: string, lang: Lang): string {
  const uz = obj[base + "Uz"];
  const en = obj[base];
  return (lang === "uz" ? (uz || en) : (en || uz)) || "";
}
