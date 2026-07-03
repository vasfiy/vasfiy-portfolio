"use client";
import Link from "next/link";
import { useState } from "react";
import { MDICT, pickM, fmtPrice, stockKey } from "@/lib/market";
import { useMarketLang } from "./MarketFrame";
import { pinSort } from "@/lib/data";
import type { Product, Category } from "@/lib/types";

export default function Market({ products, cats }: { products: Product[]; cats: Record<string, Category> }) {
  const { lang } = useMarketLang();
  const t = MDICT[lang];
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const present = Array.from(new Set(products.map((p) => p.cat).filter(Boolean))) as string[];
  const catLabel = (c: string) => { const m = cats[c]; return m ? (m.icon ? m.icon + " " : "") + ((lang === "uz" ? m.uz : m.en) || m.en || c) : c; };
  const items = pinSort(products)
    .filter((p) => filter === "all" || p.cat === filter)
    .filter((p) => { const s = q.trim().toLowerCase(); return !s || (pickM(p, "title", lang) + " " + pickM(p, "desc", lang)).toLowerCase().includes(s); });

  return (
    <section className="section page-hero mkt-catalog">
      <div className="container">
        <div className="section-head">
          <span className="section-kicker"><span className="kicker-num">🛒</span> <span>{t.tag}</span></span>
          <h1 className="section-title">Vasfiy Market</h1>
          <p className="hero-desc" style={{ marginTop: 10 }}>{t.sub}</p>
        </div>
        <div className="mkt-controls">
          <div className="bl-search">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} />
          </div>
          {present.length > 0 && (
            <div className="filter-bar">
              <button className={"filter-chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>{t.all}</button>
              {present.map((c) => <button key={c} className={"filter-chip" + (filter === c ? " active" : "")} onClick={() => setFilter(c)}>{catLabel(c)}</button>)}
            </div>
          )}
        </div>
        {items.length === 0 ? (
          <div className="mkt-empty glass"><span>🛍️</span><p>{t.empty}</p></div>
        ) : (
          <div className="mkt-grid">
            {items.map((p, i) => {
              const img = (p.images || [])[0]?.url;
              const sk = stockKey(p.stock);
              return (
                <Link className="mkt-card glass" href={`/market/${p.__id ?? i}`} key={p.__id || i}>
                  <div className="mkt-card-img">{img ? <img src={img} alt={pickM(p, "title", lang)} loading="lazy" /> : <span className="mkt-ph">📦</span>}
                    {p.origin && <span className="mkt-origin">{p.origin}</span>}
                  </div>
                  <div className="mkt-card-body">
                    <h3>{pickM(p, "title", lang)}</h3>
                    <div className="mkt-card-meta">
                      <span className="mkt-price">{fmtPrice(p.price, p.currency)}</span>
                      <span className={"mkt-stock " + sk}>{t[sk]}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}