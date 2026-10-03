"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/* Theme worlds: each data-theme gets a living ambient scene. Worlds are
   lazy, client-only, and swap live when the theme attribute changes.
   Scenes live in ./worlds/<theme>.tsx and never share files. */
type ComponentType = React.ComponentType;

const WORLDS: Record<string, ComponentType> = {
  cosmos: dynamic(() => import("./worlds/cosmos"), { ssr: false }),
  ocean: dynamic(() => import("./worlds/ocean"), { ssr: false }),
  cyber: dynamic(() => import("./worlds/cyber"), { ssr: false }),
  matrix: dynamic(() => import("./worlds/matrix"), { ssr: false }),
  sunset: dynamic(() => import("./worlds/sunset"), { ssr: false }),
};

export default function WorldLayer() {
  const [theme, setTheme] = useState<string | null>(null);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setTheme(localStorage.getItem("theme") || el.getAttribute("data-theme"));
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  const World = theme ? WORLDS[theme] : null;
  if (!World) return null;
  return (
    <div className="world-layer" aria-hidden="true">
      <World />
    </div>
  );
}
