"use client";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./Providers";

type Line = { t: string; msg: string; cls: "" | "ok" | "alert" };

const OK: string[] = [
  "AUTH ok user=kamoliddin mfa=✔ src=10.0.4.12",
  "FW allow tcp/443 → edge-gw-01",
  "SIEM heartbeat OK · latency 12ms",
  "DNS query api.github.com — clean",
  "integrity check passed · 0 drift",
  "EDR sweep: 184 endpoints healthy",
  "TLS cert chain valid · vasfiy.com",
  "backup snapshot verified · s3://vault",
  "IDS scan completed — 0 threats",
  "patch level current · CVE feed synced",
];
const ALERTS: string[] = [
  "ALERT brute-force blocked src=185.220.x.x → fail2ban",
  "ALERT phishing.eml quarantined → sandbox",
  "ALERT port-scan detected — honeypot engaged",
  "ALERT anomalous login geo=RU denied",
];

/* Decorative "live SOC console" for the hero — pure CSS/JS, no deps.
   Client-only stream (starts empty on the server, so no hydration mismatch);
   pauses in background tabs; static for prefers-reduced-motion. */
export default function SocPanel() {
  const { lang } = useLang();
  const [lines, setLines] = useState<Line[]>([]);
  const n = useRef(0);

  useEffect(() => {
    const mk = (): Line => {
      n.current++;
      const alert = n.current % 7 === 5; // periodic, not chaotic
      const pool = alert ? ALERTS : OK;
      const msg = pool[n.current % pool.length];
      const d = new Date();
      const t = [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, "0")).join(":");
      return { t, msg, cls: alert ? "alert" : n.current % 3 === 0 ? "ok" : "" };
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLines(Array.from({ length: 8 }, mk));
      return;
    }
    setLines(Array.from({ length: 5 }, mk));
    const iv = setInterval(() => { if (!document.hidden) setLines((p) => [...p.slice(-11), mk()]); }, 1400);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="soc-panel glass" aria-hidden="true">
      <div className="soc-head">
        <span className="soc-live"><i /> SOC CONSOLE — {lang === "uz" ? "JONLI" : "LIVE"}</span>
        <span className="soc-chips"><b>TryHackMe TOP 1%</b><b>Blue Team</b></span>
      </div>
      <div className="soc-body">
        {lines.map((l, i) => (
          <div className={"soc-line " + l.cls} key={i}>
            <span className="soc-t">{l.t}</span> {l.msg}
          </div>
        ))}
      </div>
      <div className="soc-foot">{lang === "uz" ? "▲ simulyatsiya · haqiqiy laboratoriya →" : "▲ simulation · try the real lab →"} <a href="/linux">Linux Lab</a></div>
    </div>
  );
}
