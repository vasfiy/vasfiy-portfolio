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
  en: { back: "← Portfolio", badge: "🐧 Interactive · in your browser", title: "Linux & Cybersecurity Lab", desc: "Daily Linux and cybersecurity lessons — paired with a real, interactive terminal you can practice in. Type commands, explore a virtual filesystem, and learn by doing.", ctaLessons: "Browse lessons", ctaTerminal: "Open the terminal", lessonsKicker: "Lessons", lessonsTitle: "Daily Linux & security notes", termKicker: "Terminal", termTitle: "Practice in a live shell", termNote: "Safe, simulated shell — nothing leaves your browser. ↑/↓ history, Tab to autocomplete.", all: "All", search: "Search lessons…", noResults: "No lessons match your search.", progress: "Your progress", markDone: "Mark as done", completed: "Completed", tryIt: "Try in terminal ↓", done: "done" },
  uz: { back: "← Portfolio", badge: "🐧 Interaktiv · brauzeringizda", title: "Linux & Kibxavfsizlik Laboratoriyasi", desc: "Har kungi Linux va kibxavfsizlik darslari — mashq qilish uchun haqiqiy interaktiv terminal bilan. Buyruqlarni yozing, virtual fayl tizimini o'rganing va amaliyot orqali o'rganing.", ctaLessons: "Darslarni ko'rish", ctaTerminal: "Terminalni ochish", lessonsKicker: "Darslar", lessonsTitle: "Kunlik Linux & xavfsizlik eslatmalari", termKicker: "Terminal", termTitle: "Jonli terminalda mashq qiling", termNote: "Xavfsiz, simulyatsiya terminal — hech narsa chiqmaydi. ↑/↓ tarix, Tab avtoto'ldirish.", all: "Hammasi", search: "Darslarni qidirish…", noResults: "Mos dars topilmadi.", progress: "Natijangiz", markDone: "Bajarildi", completed: "Bajarildi", tryIt: "Terminalda sinash ↓", done: "bajarildi" },
};

const PROG_KEY = "kt-lesson-progress";

export default function LinuxLab({ lessons, cats }: { lessons: any[]; cats: Record<string, Category> }) {
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

      <section className="section" id="terminal">
        <div className="container">
          <Reveal className="section-head">
            <span className="section-kicker"><span className="kicker-num">02</span> <span>{T.termKicker}</span></span>
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
