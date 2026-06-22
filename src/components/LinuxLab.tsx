"use client";
import Script from "next/script";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { useLang } from "./Providers";
import Reveal from "./Reveal";
import { pinSort } from "@/lib/data";
import { pick } from "@/lib/i18n";
import type { Lang, Category } from "@/lib/types";

declare global { interface Window { WebTerm?: { init: (el: HTMLElement) => void; run: (cmd: string) => void }; } }

const LX = {
  en: { back: "← Portfolio", badge: "🐧 Interactive · in your browser", title: "Linux & Cybersecurity Lab", desc: "Daily Linux and cybersecurity lessons — paired with a real, interactive terminal you can practice in. Type commands, explore a virtual filesystem, and learn by doing.", ctaLessons: "Browse lessons", ctaTerminal: "Open the terminal", lessonsKicker: "Lessons", lessonsTitle: "Daily Linux & security notes", termKicker: "Terminal", termTitle: "Practice in a live shell", termNote: "Safe, simulated shell — nothing leaves your browser. ↑/↓ history, Tab to autocomplete.", all: "All", search: "Search lessons…", noResults: "No lessons match your search.", progress: "Your progress", markDone: "Mark as done", completed: "Completed", tryIt: "Try in terminal ↓", done: "done", ctfKicker: "CTF Challenges", ctfTitle: "Capture the flag — prove it in the terminal", points: "pts", solved: "solved", submit: "Submit", yourAnswer: "Your answer / flag…", correct: "Correct!", wrong: "Not quite — try again", showHint: "💡 Show hint", rankVisitor: "Visitor", rankRecruit: "Recruit", rankAnalyst: "Analyst", rankHunter: "Threat Hunter", rankLead: "SOC Lead" },
  uz: { back: "← Portfolio", badge: "🐧 Interaktiv · brauzeringizda", title: "Linux & Kibxavfsizlik Laboratoriyasi", desc: "Har kungi Linux va kibxavfsizlik darslari — mashq qilish uchun haqiqiy interaktiv terminal bilan. Buyruqlarni yozing, virtual fayl tizimini o'rganing va amaliyot orqali o'rganing.", ctaLessons: "Darslarni ko'rish", ctaTerminal: "Terminalni ochish", lessonsKicker: "Darslar", lessonsTitle: "Kunlik Linux & xavfsizlik eslatmalari", termKicker: "Terminal", termTitle: "Jonli terminalda mashq qiling", termNote: "Xavfsiz, simulyatsiya terminal — hech narsa chiqmaydi. ↑/↓ tarix, Tab avtoto'ldirish.", all: "Hammasi", search: "Darslarni qidirish…", noResults: "Mos dars topilmadi.", progress: "Natijangiz", markDone: "Bajarildi", completed: "Bajarildi", tryIt: "Terminalda sinash ↓", done: "bajarildi", ctfKicker: "CTF vazifalar", ctfTitle: "Flagni qo'lga kirit — terminalda isbotla", points: "ball", solved: "yechildi", submit: "Yuborish", yourAnswer: "Javobingiz / flag…", correct: "To'g'ri!", wrong: "Noto'g'ri — qayta urinib ko'ring", showHint: "💡 Maslahat", rankVisitor: "Mehmon", rankRecruit: "Boshlovchi", rankAnalyst: "Analitik", rankHunter: "Tahdid Ovchisi", rankLead: "SOC Rahbari" },
};

const PROG_KEY = "kt-lesson-progress";
const CTF_KEY = "kt-ctf-solved";

export default function LinuxLab({ lessons, challenges = [], cats }: { lessons: any[]; challenges?: any[]; cats: Record<string, Category> }) {
  const { lang: ctxLang } = useLang();
  const lang = (ctxLang || "en") as Lang;
  const T = LX[lang] || LX.en;
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const termRef = useRef<HTMLDivElement>(null);
  const inited = useRef(false);

  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem(PROG_KEY) || "[]")); } catch {} }, []);
  const toggleDone = (id: string) => setDone((p) => { const n = p.includes(id) ? p.filter((x) => x !== id) : [...p, id]; localStorage.setItem(PROG_KEY, JSON.stringify(n)); return n; });

  const initTerm = useCallback(() => { if (!inited.current && window.WebTerm && termRef.current) { window.WebTerm.init(termRef.current); inited.current = true; } }, []);
  useEffect(() => { initTerm(); }, [initTerm]);

  const runCmd = (cmd: string) => {
    document.getElementById("terminal")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => window.WebTerm?.run(cmd), 380);
  };

  const present = Array.from(new Set(lessons.map((l) => l.cat).filter(Boolean))) as string[];
  let items = filter === "all" ? lessons : lessons.filter((l) => l.cat === filter);
  if (q) { const s = q.toLowerCase(); items = items.filter((l) => [l.title, l.titleUz, l.body, l.bodyUz, (l.commands || []).join(" ")].some((x: string) => (x || "").toLowerCase().includes(s))); }
  items = pinSort(items);
  const total = lessons.length;
  const completedCount = lessons.filter((l) => done.includes(l.__id)).length;
  const pctDone = total ? Math.round((completedCount / total) * 100) : 0;

  return (
    <>
      <Script src="/js/terminal.js" strategy="afterInteractive" onReady={initTerm} />

      <section className="section page-hero" id="lab-hero">
        <div className="container">
          <Reveal className="section-head">
            <span className="section-kicker"><span className="kicker-num">🐧</span> <span>{T.badge}</span></span>
            <h1 className="section-title">{T.title}</h1>
            <p className="hero-desc" style={{ marginTop: 12 }}>{T.desc}</p>
            <div className="hero-cta" style={{ marginTop: 22 }}>
              <a href="#lessons" className="btn btn-primary">{T.ctaLessons}</a>
              <a href="#terminal" className="btn btn-ghost">{T.ctaTerminal}</a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="lessons">
        <div className="container">
          <Reveal className="section-head">
            <span className="section-kicker"><span className="kicker-num">01</span> <span>{T.lessonsKicker}</span></span>
            <h2 className="section-title">{T.lessonsTitle}</h2>
          </Reveal>

          <div className="lx-progress">
            <span>{T.progress}: <b>{completedCount}/{total}</b></span>
            <div className="lx-prog-bar"><i style={{ width: pctDone + "%" }} /></div>
            <span>{pctDone}%</span>
          </div>

          <div className="lx-controls">
            <input className="lx-search" placeholder={T.search} value={q} onChange={(e) => setQ(e.target.value)} />
            {present.length > 0 && (
              <div className="filter-bar">
                <button className={"filter-chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>{T.all}</button>
                {present.map((c) => <button key={c} className={"filter-chip" + (filter === c ? " active" : "")} onClick={() => setFilter(c)}>{(cats[c] && (cats[c].icon ? cats[c].icon + " " : "") + (cats[c][lang] || cats[c].en)) || c}</button>)}
              </div>
            )}
          </div>

          {items.length === 0 ? <p className="empty-note">{T.noResults}</p> : (
            <div className="lessons-grid">
              {items.map((l) => {
                const title = pick(l, "title", lang);
                const body = pick(l, "body", lang);
                const cat = cats[l.cat] || {};
                const isDone = done.includes(l.__id);
                return (
                  <article className={"lesson-card glass" + (isDone ? " done" : "")} key={l.__id}>
                    {l.pinned && <span className="pin-badge">📌</span>}
                    <div className="lesson-meta">{l.date && <span className="lesson-date">{l.date}</span>}{l.cat && <span className="lesson-cat">{cat.icon || ""} {(cat[lang] || cat.en || l.cat)}</span>}</div>
                    <h3>{title}</h3>
                    <div className="lesson-body" dangerouslySetInnerHTML={{ __html: body }} />
                    {(l.attachments || []).length > 0 && (
                      <div className="lesson-files">
                        {(l.attachments as any[]).map((a, i) => {
                          const ty = a.type || "";
                          if (/^image/.test(ty)) return <a className="lesson-att-img" key={i} href={a.url} target="_blank" rel="noopener"><img src={a.url} alt={a.name || ""} loading="lazy" /></a>;
                          if (/video/.test(ty)) return <video className="lesson-att-vid" key={i} src={a.url} controls preload="metadata" />;
                          const icon = /pdf/.test(ty) ? "📄" : /html/.test(ty) ? "🌐" : "📎";
                          return <a className="lesson-att" key={i} href={a.url} target="_blank" rel="noopener">{icon} {a.name || "file"} ↗</a>;
                        })}
                      </div>
                    )}
                    {(l.commands || []).length > 0 && (
                      <div className="lesson-cmds"><span className="lesson-cmds-label">{T.tryIt}</span>
                        {(l.commands as string[]).map((cmd, i) => <button className="cmd-chip" key={i} onClick={() => runCmd(cmd)}>{cmd}</button>)}
                      </div>
                    )}
                    <div className="lesson-foot">
                      <button className={"lesson-done" + (isDone ? " is-done" : "")} onClick={() => toggleDone(l.__id)}>
                        <span className="check">{isDone ? "✓" : ""}</span>{isDone ? T.completed : T.markDone}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Challenges list={pinSort(challenges)} runCmd={runCmd} lang={lang} T={T} />

      <section className="section" id="terminal">
        <div className="container">
          <Reveal className="section-head">
            <span className="section-kicker"><span className="kicker-num">03</span> <span>{T.termKicker}</span></span>
            <h2 className="section-title">{T.termTitle}</h2>
          </Reveal>
          <div className="term-window glass" onClick={() => (termRef.current?.querySelector(".term-input") as HTMLInputElement)?.focus()}>
            <div className="term-bar">
              <span className="term-dot d-red" /><span className="term-dot d-yellow" /><span className="term-dot d-green" />
              <span className="term-bar-title">kamoliddin@kali-lab — webterm</span>
            </div>
            <div className="term" id="webterm" ref={termRef} />
          </div>
          <p className="term-note">{T.termNote}</p>
        </div>
      </section>
    </>
  );
}

/* ---------------- CTF Challenges ---------------- */
function Challenges({ list, runCmd, lang, T }: { list: any[]; runCmd: (c: string) => void; lang: Lang; T: any }) {
  const [solved, setSolved] = useState<string[]>([]);
  const [ans, setAns] = useState<Record<string, string>>({});
  const [fb, setFb] = useState<Record<string, "ok" | "err" | "">>({});
  const [hints, setHints] = useState<string[]>([]);
  useEffect(() => { try { setSolved(JSON.parse(localStorage.getItem(CTF_KEY) || "[]")); } catch {} }, []);

  if (!list.length) return null;
  const norm = (s: string) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const pts = (c: any) => parseInt(c.points) || 0;
  const total = list.reduce((s, c) => s + pts(c), 0);
  const score = list.filter((c) => solved.includes(c.__id)).reduce((s, c) => s + pts(c), 0);
  const solvedN = list.filter((c) => solved.includes(c.__id)).length;
  const rank = total === 0 ? T.rankVisitor : score >= total ? T.rankLead : score >= total * 0.6 ? T.rankHunter : score >= total * 0.3 ? T.rankAnalyst : score > 0 ? T.rankRecruit : T.rankVisitor;
  const submit = (c: any) => {
    if (ans[c.__id] && norm(ans[c.__id]) === norm(c.answer)) {
      setSolved((p) => { const n = p.includes(c.__id) ? p : [...p, c.__id]; localStorage.setItem(CTF_KEY, JSON.stringify(n)); return n; });
      setFb((f) => ({ ...f, [c.__id]: "ok" }));
    } else { setFb((f) => ({ ...f, [c.__id]: "err" })); setTimeout(() => setFb((f) => ({ ...f, [c.__id]: "" })), 1200); }
  };

  return (
    <section className="section" id="challenges">
      <div className="container">
        <Reveal className="section-head">
          <span className="section-kicker"><span className="kicker-num">02</span> <span>{T.ctfKicker}</span></span>
          <h2 className="section-title">{T.ctfTitle}</h2>
        </Reveal>
        <div className="ctf-score">
          <div className="ctf-score-main"><b>{score}</b><span>/ {total} {T.points}</span></div>
          <div className="lx-prog-bar" style={{ maxWidth: "none", flex: 1 }}><i style={{ width: (total ? (score / total) * 100 : 0) + "%" }} /></div>
          <div className="ctf-score-meta"><span>{solvedN}/{list.length} {T.solved}</span><span className="ctf-rank">🏅 {rank}</span></div>
        </div>
        <div className="ctf-grid">
          {list.map((c) => {
            const done = solved.includes(c.__id);
            const f = fb[c.__id];
            const showHint = hints.includes(c.__id);
            const hint = pick(c, "hint", lang);
            return (
              <article className={"ctf-card glass" + (done ? " solved" : "")} key={c.__id}>
                <div className="ctf-top"><h3>{pick(c, "title", lang)}</h3><span className="ctf-pts">{pts(c)} {T.points}</span></div>
                <div className="ctf-prompt" dangerouslySetInnerHTML={{ __html: pick(c, "prompt", lang) }} />
                {c.command && <div className="lesson-cmds"><span className="lesson-cmds-label">{T.tryIt}</span><button className="cmd-chip" onClick={() => runCmd(c.command)}>{c.command}</button></div>}
                {hint && (showHint ? <p className="ctf-hint">💡 {hint}</p> : <button className="ctf-hint-btn" onClick={() => setHints((h) => [...h, c.__id])}>{T.showHint}</button>)}
                {done ? (
                  <div className="ctf-solved-row">✓ {T.correct} <b>+{pts(c)}</b></div>
                ) : (
                  <div className={"ctf-answer" + (f === "err" ? " shake" : "")}>
                    <input placeholder={T.yourAnswer} value={ans[c.__id] || ""} onChange={(e) => setAns((a) => ({ ...a, [c.__id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") submit(c); }} />
                    <button className="btn btn-primary btn-sm" onClick={() => submit(c)}>{T.submit}</button>
                    {f === "err" && <span className="ctf-fb-err">✗ {T.wrong}</span>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
