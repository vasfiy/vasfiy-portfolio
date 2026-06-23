"use client";
import { useEffect, useState } from "react";
import { COLLECTIONS } from "@/lib/adminSchema";
import * as A from "@/lib/admin";
import ItemManager from "./ItemManager";
import { SiteText, Inbox, Analytics, MediaLib } from "./Panels";

const EXTRA = [
  { id: "sitetext", label: "Site text", icon: "📝" },
  { id: "media", label: "Media", icon: "📁" },
  { id: "inbox", label: "Inbox", icon: "📨" },
  { id: "analytics", label: "Analytics", icon: "📊" },
];

export default function AdminApp() {
  const [user, setUser] = useState<any>(undefined); // undefined = checking
  const [active, setActive] = useState("gallery");
  const [navOpen, setNavOpen] = useState(false);
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    A.getUser().then(setUser);
    const { data } = A.sb().auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (user) A.getSettings().then((s) => setPhoto(s.profilePhoto || "")).catch(() => {}); }, [user]);

  if (user === undefined) return <div className="ad-loading">Loading…</div>;
  if (!user) return <Login />;

  const col = COLLECTIONS.find((c) => c.id === active);
  return (
    <div className="ad-app">
      <aside className={"ad-side" + (navOpen ? " open" : "")}>
        <div className="ad-brand">{photo ? <img className="ad-avatar" src={photo} alt="" /> : <span className="brand-mark">KT</span>} <b>Admin</b></div>
        <nav>
          <p className="ad-navlabel">Content</p>
          {COLLECTIONS.map((c) => <button key={c.id} className={active === c.id ? "active" : ""} onClick={() => { setActive(c.id); setNavOpen(false); }}>{c.icon} {c.label}</button>)}
          <p className="ad-navlabel">Manage</p>
          {EXTRA.map((e) => <button key={e.id} className={active === e.id ? "active" : ""} onClick={() => { setActive(e.id); setNavOpen(false); }}>{e.icon} {e.label}</button>)}
        </nav>
        <div className="ad-side-foot">
          <a href="https://vasfiy.com" className="btn btn-ghost btn-sm" target="_blank" rel="noopener">Open site ↗</a>
          <a href="https://vasfiy.com/linux" className="btn btn-ghost btn-sm" target="_blank" rel="noopener">Linux Lab ↗</a>
          <button className="btn btn-ghost btn-sm" onClick={() => A.signOut()}>Log out</button>
        </div>
      </aside>
      <button className="ad-burger" onClick={() => setNavOpen((o) => !o)} aria-label="Menu">☰</button>
      <main className="ad-main">
        {col && <ItemManager collection={col} key={col.id} />}
        {active === "sitetext" && <SiteText />}
        {active === "media" && <MediaLib />}
        {active === "inbox" && <Inbox />}
        {active === "analytics" && <Analytics />}
      </main>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { await A.signIn(email.trim(), pw); } catch (ex: any) { setErr(ex.message || "Sign-in failed"); } finally { setBusy(false); }
  };
  return (
    <div className="ad-lock">
      <form className="ad-lock-card glass" onSubmit={submit}>
        <div className="ad-lock-icon">🔒</div>
        <h1>Admin panel</h1>
        <p>Sign in with your Supabase admin email &amp; password.</p>
        <input type="email" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        <input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
        <button className="btn btn-primary" disabled={busy}>{busy ? "…" : "Unlock"}</button>
        {err && <p className="ad-err">{err}</p>}
        <p className="ad-lock-note">Real account login (Supabase). Changes go live for everyone.</p>
      </form>
    </div>
  );
}
