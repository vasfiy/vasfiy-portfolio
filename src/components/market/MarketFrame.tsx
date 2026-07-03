"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { MDICT, M_LANGS, type MLang } from "@/lib/market";

const Ctx = createContext<{ lang: MLang; setLang: (l: MLang) => void }>({ lang: "en", setLang: () => {} });
export const useMarketLang = () => useContext(Ctx);

/* Marketplace chrome: own 4-language switcher, independent of the main site's EN/UZ. */
export default function MarketFrame({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<MLang>("en");
  useEffect(() => {
    const saved = localStorage.getItem("mkt-lang") as MLang | null;
    if (saved && M_LANGS.includes(saved)) { setLangState(saved); return; }
    const nav = (navigator.language || "").slice(0, 2).toLowerCase();
    if (nav === "uz" || nav === "ru" || nav === "de") setLangState(nav as MLang);
  }, []);
  const setLang = (l: MLang) => { setLangState(l); try { localStorage.setItem("mkt-lang", l); } catch {} };
  const t = MDICT[lang];

  return (
    <Ctx.Provider value={{ lang, setLang }}>
      <header className="mkt-header">
        <div className="container mkt-header-in">
          <Link href="/market" className="mkt-logo">🛒 <b>VASFIY</b> MARKET</Link>
          <div className="mkt-header-right">
            <div className="mkt-langs" role="group" aria-label="Language">
              {M_LANGS.map((l) => (
                <button key={l} className={"mkt-lang" + (lang === l ? " active" : "")} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
              ))}
            </div>
            <a className="mkt-main-link" href="https://vasfiy.com" target="_blank" rel="noopener">{t.mainSite} ↗</a>
          </div>
        </div>
      </header>
      <main className="mkt-main">{children}</main>
      <footer className="mkt-footer">
        <div className="container">© {new Date().getFullYear()} Vasfiy Market · {t.tag}</div>
      </footer>
    </Ctx.Provider>
  );
}