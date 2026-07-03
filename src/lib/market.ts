export type MLang = "en" | "uz" | "ru" | "de";
export const M_LANGS: MLang[] = ["en", "uz", "ru", "de"];

const SUF: Record<MLang, string> = { en: "", uz: "Uz", ru: "Ru", de: "De" };

/** Pick a 4-language field (title/desc…) with sensible fallbacks. */
export function pickM(obj: any, base: string, lang: MLang): string {
  const order: MLang[] = [lang, "en", "uz", "ru", "de"];
  for (const l of order) { const v = obj?.[base + SUF[l]]; if (v) return v; }
  return "";
}

export const MDICT: Record<MLang, Record<string, string>> = {
  en: {
    tag: "Europe ⇄ Uzbekistan trade", sub: "Quality goods in both directions — order directly.",
    search: "Search products…", all: "All", order: "Order", back: "← All products",
    empty: "No products yet — the catalog opens soon.", notfound: "Product not found.",
    inStock: "In stock", preorder: "Pre-order", soldOut: "Sold out",
    orderTitle: "Order this product", yourName: "Your name", contact: "Phone / Telegram / Email",
    note: "Quantity, city, questions…", send: "Send order", sending: "Sending…",
    sent: "✓ Order received! We'll contact you soon.", error: "Something went wrong — please try again.",
    mainSite: "Portfolio", direction: "Direction",
  },
  uz: {
    tag: "Yevropa ⇄ O'zbekiston savdo", sub: "Ikkala yo'nalishda sifatli mahsulotlar — to'g'ridan-to'g'ri buyurtma qiling.",
    search: "Mahsulot qidirish…", all: "Hammasi", order: "Buyurtma", back: "← Barcha mahsulotlar",
    empty: "Hozircha mahsulot yo'q — katalog tez orada ochiladi.", notfound: "Mahsulot topilmadi.",
    inStock: "Sotuvda bor", preorder: "Oldindan buyurtma", soldOut: "Sotilgan",
    orderTitle: "Shu mahsulotga buyurtma", yourName: "Ismingiz", contact: "Telefon / Telegram / Email",
    note: "Miqdor, shahar, savollar…", send: "Buyurtma yuborish", sending: "Yuborilmoqda…",
    sent: "✓ Buyurtma qabul qilindi! Tez orada bog'lanamiz.", error: "Xatolik yuz berdi — qayta urinib ko'ring.",
    mainSite: "Portfolio", direction: "Yo'nalish",
  },
  ru: {
    tag: "Торговля Европа ⇄ Узбекистан", sub: "Качественные товары в обе стороны — заказывайте напрямую.",
    search: "Поиск товаров…", all: "Все", order: "Заказать", back: "← Все товары",
    empty: "Товаров пока нет — каталог скоро откроется.", notfound: "Товар не найден.",
    inStock: "В наличии", preorder: "Предзаказ", soldOut: "Продано",
    orderTitle: "Заказать этот товар", yourName: "Ваше имя", contact: "Телефон / Telegram / Email",
    note: "Количество, город, вопросы…", send: "Отправить заказ", sending: "Отправка…",
    sent: "✓ Заказ принят! Мы скоро свяжемся с вами.", error: "Произошла ошибка — попробуйте ещё раз.",
    mainSite: "Портфолио", direction: "Направление",
  },
  de: {
    tag: "Handel Europa ⇄ Usbekistan", sub: "Qualitätswaren in beide Richtungen — direkt bestellen.",
    search: "Produkte suchen…", all: "Alle", order: "Bestellen", back: "← Alle Produkte",
    empty: "Noch keine Produkte — der Katalog öffnet bald.", notfound: "Produkt nicht gefunden.",
    inStock: "Auf Lager", preorder: "Vorbestellung", soldOut: "Ausverkauft",
    orderTitle: "Dieses Produkt bestellen", yourName: "Ihr Name", contact: "Telefon / Telegram / E-Mail",
    note: "Menge, Stadt, Fragen…", send: "Bestellung senden", sending: "Wird gesendet…",
    sent: "✓ Bestellung erhalten! Wir melden uns bald.", error: "Etwas ist schiefgelaufen — bitte erneut versuchen.",
    mainSite: "Portfolio", direction: "Richtung",
  },
};

export const stockKey = (s = "") => (s === "preorder" ? "preorder" : s === "sold out" ? "soldOut" : "inStock");
export const fmtPrice = (p = "", cur = "") => {
  const n = Number(String(p).replace(/[^\d.]/g, ""));
  if (!n) return p ? `${p} ${cur}` : "";
  return `${n.toLocaleString("en-US").replace(/,/g, " ")} ${cur}`.trim();
};