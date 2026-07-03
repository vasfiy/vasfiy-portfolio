import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section page-hero nf-page">
      <div className="container nf-inner">
        <p className="nf-code">404</p>
        <h1 className="section-title">Page not found</h1>
        <p className="hero-desc">Sahifa topilmadi — bu manzil mavjud emas yoki ko&apos;chirilgan.</p>
        <div className="nf-actions">
          <Link className="btn btn-primary" href="/">← Home / Bosh sahifa</Link>
          <Link className="btn btn-ghost" href="/blog">Journal</Link>
          <Link className="btn btn-ghost" href="/gallery">Gallery</Link>
        </div>
      </div>
    </section>
  );
}
