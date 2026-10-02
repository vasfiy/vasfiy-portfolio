"use client";
import { useEffect, useState } from "react";

/* A SOC console that "tail -f"s a threat feed in the hero. Pure theatre, but it
   says "this is what I do" faster than any paragraph — and it doubles as a
   status card: availability + relocation in the last line. */
type Line = { k: "cmd" | "out" | "ok" | "dim"; x: string };
const SCRIPT: Line[] = [
  { k: "cmd", x: "whoami" },
  { k: "out", x: "kamoliddin — soc analyst · blue team" },
  { k: "cmd", x: "tail -f /var/log/siem/alerts.log" },
  { k: "ok", x: "[02:14:07] ssh brute-force → BLOCKED ✓" },
  { k: "ok", x: "[02:14:52] phishing domain → sinkholed ✓" },
  { k: "dim", x: "[02:15:31] 1,284 events normalized · 0 escalations" },
  { k: "cmd", x: "status --availability" },
  { k: "out", x: "● open to work · relocation: EU" },
];

export default function HeroTerminal() {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(SCRIPT.length); return; }
    let t: ReturnType<typeof setTimeout>, alive = true;
    const step = (i: number) => {
      if (!alive) return;
      setN(i);
      if (i >= SCRIPT.length) { t = setTimeout(() => step(0), 4600); return; }
      t = setTimeout(() => step(i + 1), i % 3 === 2 ? 420 : 680);
    };
    step(1);
    return () => { alive = false; clearTimeout(t); };
  }, []);

  return (
    <aside className="hero-console" aria-hidden="true">
      <div className="term-window glass">
        <div className="term-bar">
          <span className="term-dot d-red" /><span className="term-dot d-yellow" /><span className="term-dot d-green" />
          <span className="term-bar-title">soc@vasfiy:~ — live feed</span>
        </div>
        <div className="term hero-term">
          {SCRIPT.slice(0, n).map((l, i) => (
            <p className={`term-line cl-${l.k}`} key={i}>
              {l.k === "cmd" && <span className="term-prompt">$ </span>}
              {l.x}
            </p>
          ))}
          <p className="term-line term-inputline"><span className="term-prompt">$ </span><span className="caret" /></p>
        </div>
      </div>
    </aside>
  );
}
