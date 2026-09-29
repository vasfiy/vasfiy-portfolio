"use client";
import { useRef, useEffect, type ReactNode } from "react";

/* Scroll-in reveal on IntersectionObserver + a CSS transition.
   This used to pull in GSAP + ScrollTrigger (~100 KB of JS) to fade an element
   up by 30px; the platform does the same thing for nothing. Elements start
   hidden only once JS confirms it can reveal them, so with JS disabled — or if
   this never runs — the content stays visible. */
export default function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number; }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    el.style.transitionDelay = delay ? `${delay}s` : "";
    el.classList.add("reveal-init");

    const io = new IntersectionObserver(
      ([entry], obs) => {
        if (!entry.isIntersecting) return;
        el.classList.add("reveal-in");
        obs.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <div ref={ref} className={className}>{children}</div>;
}
