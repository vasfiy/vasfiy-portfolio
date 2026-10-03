"use client";
import { useEffect, useRef, useState } from "react";
import { COLLECTIONS } from "@/lib/adminSchema";
import * as A from "@/lib/admin";
import ItemManager, { confirmLeave } from "./ItemManager";
import { SiteText, Inbox, Analytics, MediaLib } from "./Panels";
import Dashboard from "./Dashboard";
import { DialogHost, ToastHost } from "./Dialog";

const EXTRA = [
  { id: "sitetext", label: "Site text", icon: "📝" },
  { id: "media", label: "Media", icon: "📁" },
  { id: "inbox", label: "Inbox", icon: "📨" },
  { id: "analytics", label: "Analytics", icon: "📊" },
];

export default function AdminApp() {
  const [user, setUser] = useState<any>(undefined); // undefined = checking
  const [active, setActive] = useState("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [photo, setPhoto] = useState("");
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [expired, setExpired] = useState(false); // a session just ended unexpectedly (not a deliberate logout)
  const deliberate = useRef(false); // set right before A.signOut() so SIGNED_OUT shows no banner

  useEffect(() => {
    A.getUser().then(setUser);
    const { data } = A.sb().auth.onAuthStateChange((e, session) => {
      setUser(session?.user || null);
      if (e === "SIGNED_OUT") { setExpired(!deliberate.current); deliberate.current = false; }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Deep links: /admin#blog opens a tab; /admin#blog?edit=<id> opens that item's editor.
  // The hash is stripped after first apply so leaving/returning doesn't reopen an editor.
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.slice(1);
      if (!h) return;
      const [tab, qs] = h.split("?");
      if (tab) setActive(tab);
      setEditTarget(new URLSearchParams(qs || "").get("edit"));
      history.replaceState(null, "", window.location.pathname + window.location.search);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);
  useEffect(() => { if (user) A.getSettings().then((s) => setPhoto(s.profilePhoto || "")).catch(() => {}); }, [user]);
  // Mobile drawer: lock body scroll while it's open.
  useEffect(() => {
    if (!navOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [navOpen]);

  // Tab switches go through the ItemManager dirty guard first.
  const go = async (id: string) => { if (await confirmLeave()) { setActive(id); setNavOpen(false); } };

  if (user === undefined) return <div className="ad-loading">Loading…</div>;
  if (!user) return <Login expired={expired} />;

  const col = COLLECTIONS.find((c) => c.id === active);
  return (
    <div className="ad-app">
      <DialogHost />
      <ToastHost />
      <aside className={"ad-side" + (navOpen ? " open" : "")}>
        <div className="ad-brand">{photo ? <img className="ad-avatar" src={photo} alt="" /> : <span className="brand-mark">KT</span>} <b>Admin</b></div>
        <nav>
          <button className={active === "overview" ? "active" : ""} onClick={() => go("overview")}>📋 Overview</button>
          <p className="ad-navlabel">Content</p>
          {COLLECTIONS.map((c) => <button key={c.id} className={active === c.id ? "active" : ""} onClick={() => go(c.id)}>{c.icon} {c.label}</button>)}
          <p className="ad-navlabel">Manage</p>
          {EXTRA.map((e) => <button key={e.id} className={active === e.id ? "active" : ""} onClick={() => go(e.id)}>{e.icon} {e.label}</button>)}
        </nav>
        <div className="ad-side-foot">
          <a href="https://vasfiy.com" className="btn btn-ghost btn-sm" target="_blank" rel="noopener">Open site ↗</a>
          <a href="https://vasfiy.com/linux" className="btn btn-ghost btn-sm" target="_blank" rel="noopener">Linux Lab ↗</a>
          <button className="btn btn-ghost btn-sm" onClick={async () => { deliberate.current = true; try { await A.signOut(); } catch { deliberate.current = false; } }}>Log out</button>
        </div>
      </aside>
      {navOpen && <div className="ad-backdrop" onClick={() => setNavOpen(false)} aria-hidden />}
      <button className="ad-burger" onClick={() => setNavOpen((o) => !o)} aria-label="Menu">{navOpen ? "✕" : "☰"}</button>
      <main className="ad-main">
        {active === "overview" && <Dashboard onGo={go} />}
        {col && <ItemManager collection={col} key={col.id} initialEditId={editTarget} />}
        {active === "sitetext" && <SiteText />}
        {active === "media" && <MediaLib />}
        {active === "inbox" && <Inbox />}
        {active === "analytics" && <Analytics />}
      </main>
    </div>
  );
}

function Login({ expired }: { expired?: boolean }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // Best-effort owner email from public settings — powers the "Forgot password?" mailto.
  const [owner, setOwner] = useState("");
  useEffect(() => { A.getSettings().then((s) => setOwner((s.siteText && s.siteText.socialEmail) || "")).catch(() => {}); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { await A.signIn(email.trim(), pw); } catch (ex: any) { setErr(ex.message || "Sign-in failed"); } finally { setBusy(false); }
  };
  return (
    <div className="ad-lock">
      <form className="ad-lock-card glass" onSubmit={submit}>
        <div className="ad-lock-icon">🔒</div>
        <h1>Admin panel</h1>
        {expired && <p className="ad-err">Session expired — log in to continue.</p>}
        <p>Sign in with your Supabase admin email &amp; password.</p>
        <input type="email" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        <input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
        <button className="btn btn-primary" disabled={busy}>{busy ? "Signing in…" : "Unlock"}</button>
        {err && <p className="ad-err">{err}</p>}
        <p className="ad-lock-note">Forgot password? There is no self-service reset — {owner
          ? <a href={`mailto:${owner}?subject=${encodeURIComponent("Admin password reset")}`}>email the site owner</a>
          : <>contact the site owner for a reset</>}.</p>
        <p className="ad-lock-note">Real account login (Supabase). Changes go live for everyone.</p>
      </form>
    </div>
  );
}
