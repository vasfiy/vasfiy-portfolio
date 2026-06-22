"use client";
import { useEffect, useState } from "react";
import { useLang } from "./Providers";

const THEMES = ["ocean", "sunset", "cyber", "matrix"] as const;

export default function ThemeFab() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("ocean");
  const [mode, setMode] = useState("dark");

  useEffect(() => {
    setTheme(localStorage.getItem("theme") || "ocean");
    setMode(localStorage.getItem("mode") || "dark");
  }, []);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const fab = document.getElementById("themeFab");
      const panel = document.getElementById("themePanel");
      if (panel && !panel.contains(e.target as Node) && e.target !== fab) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const applyTheme = (th: string) => { setTheme(th); document.documentElement.setAttribute("data-theme", th); localStorage.setItem("theme", th); };
  const applyMode = (m: string) => { setMode(m); document.documentElement.setAttribute("data-mode", m); localStorage.setItem("mode", m); };

  return (
    <>
      <button className="theme-fab" id="themeFab" aria-label="Change colors" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>🎨</button>
      <div className={"theme-panel glass" + (open ? " open" : "")} id="themePanel" role="dialog" aria-label="Color themes">
        <h4>{t("theme.title")}</h4>
        <div className="swatches">
          {THEMES.map((th) => (
            <button key={th} className={"swatch" + (theme === th ? " active" : "")} onClick={() => applyTheme(th)}>
              <span className={"swatch-bar sw-" + th} /><span className="swatch-name">{th[0].toUpperCase() + th.slice(1)}</span>
            </button>
          ))}
        </div>
        <div className="mode-row">
          <span>{t("theme.mode")}</span>
          <button className="mode-toggle" aria-label="Toggle light/dark mode" onClick={() => applyMode(mode === "light" ? "dark" : "light")}>
            <span className={"mode-opt" + (mode === "dark" ? " active" : "")}>🌙</span>
            <span className={"mode-opt" + (mode === "light" ? " active" : "")}>☀️</span>
          </button>
        </div>
      </div>
    </>
  );
}
