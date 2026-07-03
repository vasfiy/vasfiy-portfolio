"use client";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/data";
import { MDICT, pickM, fmtPrice, stockKey } from "@/lib/market";
import { useMarketLang } from "./MarketFrame";
import type { Product } from "@/lib/types";

export default function ProductView({ product }: { product: Product | null }) {
  const { lang } = useMarketLang();
  const t = MDICT[lang];
  const [imgIdx, setImgIdx] = useState(0);
  const [form, setForm] = useState({ name: "", contact: "", note: "" });
  const [status, setStatus] = useState<"" | "send" | "ok" | "err">("");

  if (!product) return (
    <section className="section page-hero"><div className="container">
      <Link className="post-back" href="/market">{t.back}</Link>
      <p className="empty-note">{t.notfound}</p>
    </div></section>
  );

  const title = pickM(product, "title", lang);
  const desc = pickM(product, "desc", lang);
  const imgs = (product.images || []).filter((im) => im?.url);
  const main = imgs[imgIdx]?.url;
  const sk = stockKey(product.stock);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim()) return;
    setStatus("send");
    // Orders reuse the existing messages inbox (anon insert is the one allowed write).
    const { error } = await supabase.from("messages").insert({
      name: form.name.trim(),
      email: form.contact.trim(),
      message: `🛒 [MARKET ORDER] ${title} — ${fmtPrice(product.price, product.currency)} (id: ${product.__id})\n${form.note.trim()}`,
    });
    if (error) setStatus("err");
    else { setStatus("ok"); setForm({ name: "", contact: "", note: "" }); }
  };

  return (
    <section className="section page-hero mkt-product">
      <div className="container">
        <Link className="post-back" href="/market">{t.back}</Link>
        <div className="mkt-detail">
          <div className="mkt-gallery">
            <div className="mkt-gallery-main glass">{main ? <img src={main} alt={title} /> : <span className="mkt-ph">📦</span>}</div>
            {imgs.length > 1 && (
              <div className="mkt-thumbs">
                {imgs.map((im, i) => (
                  <button key={i} className={"mkt-thumb" + (i === imgIdx ? " active" : "")} onClick={() => setImgIdx(i)}><img src={im.url} alt="" /></button>
                ))}
              </div>
            )}
          </div>
          <div className="mkt-info">
            <h1>{title}</h1>
            <div className="mkt-info-meta">
              <span className="mkt-price big">{fmtPrice(product.price, product.currency)}</span>
              <span className={"mkt-stock " + sk}>{t[sk]}</span>
              {product.origin && <span className="mkt-origin-chip">{t.direction}: <b>{product.origin}</b></span>}
            </div>
            {desc && <p className="mkt-desc">{desc}</p>}

            <form className="mkt-order glass" onSubmit={submit}>
              <h3>{t.orderTitle}</h3>
              <input required placeholder={t.yourName} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input required placeholder={t.contact} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              <textarea rows={3} placeholder={t.note} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              <button className="btn btn-primary" disabled={status === "send"} type="submit">{status === "send" ? t.sending : t.send}</button>
              {status === "ok" && <p className="mkt-ok">{t.sent}</p>}
              {status === "err" && <p className="mkt-err">{t.error}</p>}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}