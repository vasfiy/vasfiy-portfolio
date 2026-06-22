/* ============================================================
   CONTENT — bu yerni o'zingiz tahrirlaysiz
   ------------------------------------------------------------
   Yangi rasm yoki sayohat yozuvi qo'shish uchun shunchaki
   quyidagi ro'yxatlarga bitta { ... } obyekt qo'shing.
   Backend, build yoki kod bilimi kerak emas.
   ============================================================ */

/* -------------------- GALEREYA KATEGORIYALARI --------------------
   Filtr tugmalari shu yerdan yasaladi. Kalit (masalan "nature") har bir
   rasmning `cat` maydoniga mos kelishi kerak. Yangi kategoriya qo'shsangiz,
   bu yerga ham label qo'shing (en/uz). "All" / "Hammasi" avtomatik qo'shiladi.
*/
window.GALLERY_CATEGORIES = {
  nature: { en: "Nature",      uz: "Tabiat" },
  city:   { en: "City",        uz: "Shahar" },
  travel: { en: "Travel",      uz: "Sayohat" },
  work:   { en: "Work & Tech", uz: "Ish & Texno" }
};

/* -------------------- GALEREYA --------------------
   Har bir element:
   {
     src: "assets/gallery/rasm.jpg",  // rasm manzili (yoki tashqi URL)
     emoji: "🏔️",                      // src bo'lmasa ko'rsatiladigan belgi (ixtiyoriy)
     cat: "nature",                    // kategoriya (yuqoridagi kalitlardan biri)
     caption:   "English caption",     // izoh (ingliz)
     captionUz: "O'zbekcha izoh",      // izoh (o'zbek)
     location:  "Tashkent, UZ"         // joy (ixtiyoriy)
   }
   Eslatma: src ni assets/gallery/ papkasiga qo'ygan rasmingizga moslang.
*/
window.GALLERY = [
  { emoji: "🏔️", src: "assets/gallery/photo-1.jpg", cat: "nature",
    caption: "Mountain trail at sunrise", captionUz: "Quyosh chiqishida tog' so'qmog'i", location: "Chimgan, UZ" },
  { emoji: "🌆", src: "assets/gallery/photo-2.jpg", cat: "city",
    caption: "City lights from above", captionUz: "Tepadan shahar chiroqlari", location: "Istanbul, TR" },
  { emoji: "☕", src: "assets/gallery/photo-3.jpg", cat: "work",
    caption: "Morning coffee & code", captionUz: "Tongi qahva va kod", location: "Tashkent, UZ" },
  { emoji: "🕌", src: "assets/gallery/photo-4.jpg", cat: "city",
    caption: "Old town architecture", captionUz: "Eski shahar me'morchiligi", location: "Samarkand, UZ" },
  { emoji: "🌊", src: "assets/gallery/photo-5.jpg", cat: "nature",
    caption: "By the sea", captionUz: "Dengiz bo'yida", location: "Antalya, TR" },
  { emoji: "🚆", src: "assets/gallery/photo-6.jpg", cat: "travel",
    caption: "On the road again", captionUz: "Yana yo'lda", location: "Europe" }
];

/* -------------------- SAYOHAT KUNDALIGI / BLOG --------------------
   Har bir yozuv:
   {
     date: "2026-06-18",               // sana (YYYY-MM-DD)
     type: "image" | "video" | "youtube" | "text",
     media: "...",                     // type ga qarab:
     //   image   -> "assets/blog/rasm.jpg"
     //   video   -> "assets/blog/video.mp4"   (mahalliy fayl)
     //   youtube -> "https://youtu.be/XXXX"   yoki video ID "XXXX"
     //   text    -> kerak emas
     title:   "English title",
     titleUz: "O'zbekcha sarlavha",
     body:    "English text update...",   // kartada ko'rinadigan qisqa matn
     bodyUz:  "O'zbekcha matnli yangilanish...",
     full:    "Full English article...",  // (ixtiyoriy) "Ko'proq o'qish" da chiqadi
     fullUz:  "To'liq o'zbekcha maqola...",// agar bo'lmasa, body ishlatiladi
     location: "Tashkent, UZ"             // ixtiyoriy
   }
   Eng yangi yozuvni ro'yxat boshiga qo'ying (yuqorida ko'rinadi).
   "full"/"fullUz" da \n\n bilan yangi xatboshi yarating.
*/
window.BLOG = [
  {
    date: "2026-06-18", type: "text", location: "Tashkent, UZ",
    title: "Starting my travel journal",
    titleUz: "Sayohat kundaligimni boshlayapman",
    body: "This is where I'll share daily snapshots from the road — short notes, photos, and videos. Replace this entry with your first real update in data/content.js.",
    bodyUz: "Mana shu yerda har kungi sayohat lavhalarimni — qisqa eslatmalar, rasmlar va videolarni — bo'lishaman. Bu yozuvni data/content.js ichida birinchi haqiqiy yangilanishingiz bilan almashtiring."
  },
  {
    date: "2026-06-15", type: "image", media: "assets/blog/post-1.jpg", location: "Samarkand, UZ",
    title: "A day among ancient walls",
    titleUz: "Qadimiy devorlar orasida bir kun",
    body: "Walked through Registan at golden hour. The scale of it still amazes me every time.",
    bodyUz: "Registonni oltin soatda aylanib chiqdim. Uning ulug'vorligi har safar meni hayratga soladi.",
    full: "Walked through Registan at golden hour. The scale of it still amazes me every time.\n\nThe three madrasahs frame the square in a way photos never quite capture — the tilework shifts colour as the sun moves. I spent the afternoon just sitting and sketching the geometry of the mosaics.\n\nIf you ever visit, go right before sunset and stay until the lights come on.",
    fullUz: "Registonni oltin soatda aylanib chiqdim. Uning ulug'vorligi har safar meni hayratga soladi.\n\nUchta madrasa maydonni shunday o'rab turadiki, buni hech qanday surat to'liq aks ettira olmaydi — quyosh harakatlanar ekan, koshinkorlik ranglari o'zgarib turadi. Tushdan keyin o'tirib, mozaikalar geometriyasini chizib o'tkazdim.\n\nAgar borsangiz, quyosh botishidan biroz oldin boring va chiroqlar yonguncha qoling."
  },
  {
    date: "2026-06-10", type: "youtube", media: "https://youtu.be/dQw4w9WgXcQ", location: "Istanbul, TR",
    title: "Crossing the Bosphorus",
    titleUz: "Bosfordan o'tish",
    body: "A short clip from the ferry ride between two continents. (Replace this YouTube link with your own.)",
    bodyUz: "Ikki qit'a orasidagi parom safaridan qisqa lavha. (Bu YouTube havolasini o'zingizniki bilan almashtiring.)"
  },
  {
    date: "2026-06-05", type: "video", media: "assets/blog/clip-1.mp4", location: "Chimgan, UZ",
    title: "Hiking above the clouds",
    titleUz: "Bulutlar uzra sayr",
    body: "Local video clip example. Drop an .mp4 into assets/blog/ and point 'media' to it.",
    bodyUz: "Mahalliy video misoli. .mp4 faylni assets/blog/ ichiga qo'ying va 'media' ni unga moslang."
  }
];
