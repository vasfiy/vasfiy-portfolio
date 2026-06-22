"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Lang } from "@/lib/types";
import { tr as trBase, type DictKey } from "@/lib/i18n";

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; toggle: () => void; t: (k: DictKey) => string; }
const Ctx = createContext<LangCtx>({ lang: "en", setLang: () => {}, toggle: () => {}, t: (k) => k });

export function useLang() { return useContext(Ctx); }

export default function Providers({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = (localStorage.getItem("lang") as Lang) || "en";
    setLangState(saved);
    const d = document.documentElement;
    d.lang = saved;
    // Apply saved theme/mode as early as possible (no-flash for default; ~1 frame for custom)
    d.setAttribute("data-theme", localStorage.getItem("theme") || "ocean");
    d.setAttribute("data-mode", localStorage.getItem("mode") || "dark");
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); document.documentElement.lang = l; } catch {}
  }, []);
  const toggle = useCallback(() => setLang(((localStorage.getItem("lang") as Lang) || "en") === "en" ? "uz" : "en"), [setLang]);
  const t = useCallback((k: DictKey) => trBase(lang, k), [lang]);

  return <Ctx.Provider value={{ lang, setLang, toggle, t }}>{children}</Ctx.Provider>;
}
