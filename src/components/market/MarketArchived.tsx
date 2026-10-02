import Link from "next/link";

/* Vasfiy Market is archived for now — shown on /market and market.vasfiy.com.
   The catalog, admin collection and seed data are untouched; flipping these
   pages back restores the shop. */
export default function MarketArchived() {
  return (
    <section className="section page-hero">
      <div className="container">
        <div className="mkt-arch-box glass">
          <span className="mkt-arch-icon">📦</span>
          <p className="section-kicker center"><span>Vasfiy Market</span></p>
          <h1 className="section-title center">On hold for now</h1>
          <p className="hero-desc">
            Bozor bo&apos;limi hozircha arxivda — tez orada qaytadi.
            <br />
            The marketplace is taking a short break and will be back.
          </p>
          <Link className="btn btn-primary" href="/">← Back to the portfolio</Link>
        </div>
      </div>
    </section>
  );
}
