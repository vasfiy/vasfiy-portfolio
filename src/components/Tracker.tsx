"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/* Fires a lightweight page-view beacon on each public route change.
   Skips the admin host/section. Best-effort: failures are ignored. */
export default function Tracker() {
  const p = usePathname();
  const last = useRef<string>("");
  useEffect(() => {
    if (!p || p === last.current) return;
    if (p.startsWith("/admin")) return;
    if (typeof window !== "undefined" && window.location.hostname.startsWith("admin.")) return;
    last.current = p;
    const payload = {
      path: p,
      ref: document.referrer || "",
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      lang: navigator.language || "",
    };
    try {
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
    } catch {}
  }, [p]);
  return null;
}
