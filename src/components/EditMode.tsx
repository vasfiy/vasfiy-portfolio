"use client";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./Providers";
import { useAdminSession } from "@/lib/useAdminSession";

/* Webflow-style in-place editing for the site's own text.
   Visible only to a logged-in admin: a ✏️ toggle makes every [data-edit] element
   contentEditable; blur saves the text into the matching siteText key
   (…Uz when the UZ language is active). */
export default function EditMode() {
  const isAdmin = useAdminSession();
  const { lang } = useLang();
  const [on, setOn] = useState(false);
  const [toast, setToast] = useState("");
  const stRef = useRef<any>(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  useEffect(() => {
    if (!on) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-edit]"));
    const save = async (e: Event) => {
      const el = e.currentTarget as HTMLElement;
      const base = el.dataset.edit!;
      const key = langRef.current === "uz" ? base + "Uz" : base;
      const text = el.innerText.trim();
      try {
        const A = await import("@/lib/admin");
        if (!stRef.current) stRef.current = (await A.getSettings()).siteText || {};
        if ((stRef.current[key] || "") === text) return;
        stRef.current = { ...stRef.current, [key]: text };
        await A.setSetting("siteText", stRef.current);
        flash("✓ Saved — live within ~30s");
      } catch (err: any) { flash("⚠ " + (err?.message || err)); }
    };
    els.forEach((el) => {
      try { el.contentEditable = "plaintext-only"; } catch { el.contentEditable = "true"; }
      el.addEventListener("blur", save);
    });
    document.body.classList.add("edit-on");
    return () => {
      els.forEach((el) => { el.contentEditable = "false"; el.removeEventListener("blur", save); });
      document.body.classList.remove("edit-on");
    };
  }, [on]);

  if (!isAdmin) return null;
  return (
    <>
      <button
        className={"edit-fab" + (on ? " on" : "")}
        onClick={() => setOn((v) => !v)}
        title={on ? "Exit edit mode" : "Edit this page in place"}
        aria-pressed={on}
      >
        {on ? "✓ Editing" : "✏️ Edit"}
      </button>
      {on && <span className="edit-hint">{lang === "uz" ? "Belgilangan matnga bosib tahrirlang — chetga bossangiz saqlanadi" : "Click highlighted text to edit — it saves when you click away"}</span>}
      {toast && <span className="edit-toast">{toast}</span>}
    </>
  );
}
