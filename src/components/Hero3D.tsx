"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function Field({ color, count }: { color: string; count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 6;
      const t = Math.acos(2 * Math.random() - 1);
      const p = Math.random() * Math.PI * 2;
      arr[i * 3] = r * Math.sin(t) * Math.cos(p);
      arr[i * 3 + 1] = r * Math.sin(t) * Math.sin(p);
      arr[i * 3 + 2] = r * Math.cos(t);
    }
    return arr;
  }, [count]);
  useFrame((_, d) => { if (ref.current) { ref.current.rotation.y += d * 0.04; ref.current.rotation.x += d * 0.015; } });
  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial transparent color={color} size={0.045} sizeAttenuation depthWrite={false} opacity={0.7} />
    </Points>
  );
}

function Core({ color, accent }: { color: string; accent: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  useFrame((state, d) => {
    if (mesh.current) { mesh.current.rotation.x += d * 0.18; mesh.current.rotation.y += d * 0.25; }
    if (group.current) {
      const { x, y } = state.pointer;
      group.current.rotation.y += (x * 0.4 - group.current.rotation.y) * 0.04;
      group.current.rotation.x += (-y * 0.3 - group.current.rotation.x) * 0.04;
    }
  });
  return (
    <group ref={group}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[2.1, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.55} />
      </mesh>
      <mesh scale={0.62}>
        <icosahedronGeometry args={[2.1, 0]} />
        <meshBasicMaterial color={accent} wireframe transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

export default function Hero3D() {
  const [colors, setColors] = useState({ cyan: "#00e5ff", violet: "#7c5cff" });
  const [active, setActive] = useState(true);
  const [count, setCount] = useState(900);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Theme-reactive colors
    const read = () => setColors({ cyan: cssVar("--cyan", "#00e5ff"), violet: cssVar("--violet", "#7c5cff") });
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode"] });

    // Fewer particles on small / low-power devices; skip on reduced motion
    const small = window.innerWidth < 760;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCount(reduce ? 300 : small ? 550 : 900);

    // Pause the render loop when the hero is scrolled out of view (saves GPU → smooth scroll)
    let io: IntersectionObserver | null = null;
    if (wrap.current) {
      io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.01 });
      io.observe(wrap.current);
    }
    const onVis = () => setActive(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => { obs.disconnect(); io?.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return (
    <div ref={wrap} style={{ position: "absolute", inset: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={active ? "always" : "never"}
        style={{ pointerEvents: "none" }}
      >
        <Field color={colors.violet} count={count} />
        <Core color={colors.cyan} accent={colors.violet} />
      </Canvas>
    </div>
  );
}
