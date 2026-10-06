"use client";
import { useEffect, useState } from "react";
import { useLang } from "./Providers";

/* First-party consent banner. The visitor's choice gates the Tracker:
   analytics off by default until accepted; precise GPS location is a separate
   browser permission asked only after analytics consent. Cross-site browsing
   history is never collected — browsers make that impossible by design. */

type Consent = { a: boolean; m: boolean; ts: number };
export function readConsent(): Consent | null {
  try { const raw = localStorage.getItem("vt_consent"); if (!raw) return null; const c = JSON.parse(raw); return { a: !!c.a, m: !!c.m, ts: c.ts || 0 }; } catch { return null; }
}

const COPY = {
  uz: {
    note: "Bu sayt faqat o'z tashrif ma'lumotlarini yig'adi — sahifalar, qurilma, IP va joylashuv (xizmatni yaxshilash uchun). Ma'lumotlar uchinchi tomonlarga uzatilmaydi. Boshqa saytlardagi brauzer tarixi hech qachon o'qilmaydi — brauzerlar bunga texnik jihatdan yo'l qo'ymaydi.",
    all: "Hammasini qabul qilish", need: "Faqat keraklilari", more: "Batafsil", less: "Yopish", save: "Tanlanganni saqlash",
    t1: "Analitika — IP, joylashuv, qurilma", t2: "Marketing — qaytuvchi mehmon ID, UTM",
    hist: "Boshqa saytlardagi tarix: brauzer himoyasi tufayli hech qanday sayt buni o'qiy olmaydi.",
    gps: "Aniq joylashuv faqat siz brauzer oynasida ruxsat berganingizdan so'ng, alohida so'raladi.",
  },
  en: {
    note: "This site only collects its own visit data — pages, device, IP and location (to improve the service). Nothing is shared with third parties. Your browsing history on other sites is never read — browsers make that technically impossible.",
    all: "Accept all", need: "Necessary only", more: "Details", less: "Close", save: "Save choices",
    t1: "Analytics — IP, location, device", t2: "Marketing — returning visitor ID, UTM",
    hist: "Cross-site history: browser protection means no website can read it.",
    gps: "Precise location is asked separately, only after you allow it in the browser prompt.",
  },
} as const;

export default function CookieConsent() {
  const { lang } = useLang();
  const [show, setShow] = useState(false);
  const [details, setDetails] = useState(false);
  const [a, setA] = useState(true);
  const [m, setM] = useState(true);
  const c = COPY[lang === "uz" ? "uz" : "en"];

  useEffect(() => {
    try { if (localStorage.getItem("vt_consent")) return; } catch {}
    if (typeof window !== "undefined" && (window.location.hostname.startsWith("admin.") || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) return;
    setShow(true);
  }, []);

  if (!show) return null;
  const save = (all: boolean, analytics = true, marketing = true) => {
    const consent: Consent = { a: all ? true : analytics, m: all ? true : marketing, ts: Date.now() };
    try { localStorage.setItem("vt_consent", JSON.stringify(consent)); } catch {}
    window.dispatchEvent(new Event("vt-consent"));
    setShow(false);
  };

  return (
    <div role="dialog" aria-label={lang === "uz" ? "Maxfiylik sozlamalari" : "Privacy settings"}
      style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 130, maxWidth: 560, margin: "0 auto",
        background: "var(--panel, #0a101f)", color: "var(--text, #e9eefb)", border: "1px solid var(--border, rgba(148,170,220,.2))",
        borderRadius: 14, padding: "14px 16px", boxShadow: "0 12px 40px rgba(0,0,0,.45)", fontSize: ".86rem", lineHeight: 1.5 }}>
      <b style={{ display: "block", marginBottom: 4 }}>{lang === "uz" ? "🔒 Maxfiylik" : "🔒 Privacy"}</b>
      <p style={{ margin: "0 0 10px", color: "var(--text-dim, #aab6d4)" }}>{c.note}</p>
      {details && (
        <div style={{ marginBottom: 10, display: "grid", gap: 8 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={a} onChange={(e) => setA(e.target.checked)} /> {c.t1}
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={m} onChange={(e) => setM(e.target.checked)} /> {c.t2}
          </label>
          <p style={{ margin: 0, fontSize: ".78rem", color: "var(--text-faint, #8b98b8)" }}>{c.hist}<br />{c.gps}</p>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn btn-sm btn-primary" onClick={() => save(true)}>{c.all}</button>
        <button className="btn btn-sm btn-ghost" onClick={() => save(false, false, false)}>{c.need}</button>
        {details
          ? <button className="btn btn-sm btn-ghost" onClick={() => save(false, a, m)}>{c.save}</button>
          : <button className="btn btn-sm btn-ghost" onClick={() => setDetails(true)}>{c.more}</button>}
      </div>
    </div>
  );
}
