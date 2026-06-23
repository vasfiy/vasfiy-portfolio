"use client";
import { useEffect, useState } from "react";
import { COLLECTIONS } from "@/lib/adminSchema";
import * as A from "@/lib/admin";

export default function Dashboard({ onGo }: { onGo: (id: string) => void }) {
  const [counts, setCounts] = useState<{ byKind: Record<string, number>; messages: number; views: number } | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    A.getCounts().then(setCounts).catch(() => {});
    A.listMessages().then((m) => setRecent(m.slice(0, 4))).catch(() => {});
  }, []);

  return (
    <div className="ad-section">
      <div className="ad-head"><h2>📋 Overview</h2></div>

      <div className="ad-dash-grid">
        {COLLECTIONS.map((c) => (
          <button className="ad-dash-card" key={c.id} onClick={() => onGo(c.id)}>
            <span className="ad-dash-ic">{c.icon}</span>
            <b>{counts ? (counts.byKind[c.kind] || 0) : "…"}</b>
            <span className="ad-dash-label">{c.label}</span>
          </button>
        ))}
        <button className="ad-dash-card" onClick={() => onGo("inbox")}>
          <span className="ad-dash-ic">📨</span><b>{counts ? counts.messages : "…"}</b><span className="ad-dash-label">Messages</span>
        </button>
        <button className="ad-dash-card" onClick={() => onGo("analytics")}>
          <span className="ad-dash-ic">📊</span><b>{counts ? counts.views : "…"}</b><span className="ad-dash-label">Page views</span>
        </button>
      </div>

      <div className="ad-card">
        <h3>⚡ Quick actions</h3>
        <div className="ad-actions" style={{ flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-sm" onClick={() => onGo("blog")}>✍️ New post</button>
          <button className="btn btn-ghost btn-sm" onClick={() => onGo("gallery")}>📸 Add photos</button>
          <button className="btn btn-ghost btn-sm" onClick={() => onGo("challenges")}>🏴 New challenge</button>
          <button className="btn btn-ghost btn-sm" onClick={() => onGo("sitetext")}>📝 Edit site text</button>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => { setBusy(true); try { await A.exportAll(); } finally { setBusy(false); } }}>{busy ? "…" : "⬇ Backup (JSON)"}</button>
        </div>
      </div>

      <div className="ad-card">
        <h3>📨 Recent messages</h3>
        {recent.length === 0 && <p className="ad-hint">No messages yet.</p>}
        {recent.map((m) => (
          <button className="ad-recent" key={m.id} onClick={() => onGo("inbox")}>
            <b>{m.name || "(no name)"}</b>
            <span>{m.audio ? "🎙 voice message" : (m.message || "").slice(0, 80)}</span>
            <span className="ad-recent-date">{new Date(m.created_at).toLocaleDateString()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
