"use client";

import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";

/** Número que cuenta hasta su valor al entrar en pantalla. */
export function CountUp({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? value : 0);
  useEffect(() => {
    if (!inView || reduce) {
      setV(value);
      return;
    }
    const c = animate(0, value, { duration: 1.1, ease: [0.2, 0.8, 0.2, 1], onUpdate: setV });
    return () => c.stop();
  }, [inView, value, reduce]);
  return (
    <span ref={ref} className={className}>
      {formatNumber(v, decimals)}
    </span>
  );
}

/** Minigráfico que se dibuja al aparecer. Decorativo: el valor siempre está en texto. */
export function DrawSpark({ values, color = "var(--ink)", height = 56 }: { values: number[]; color?: string; height?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  if (values.length < 2) return null;
  const w = 200;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - 6 - ((v - min) / span) * (height - 12)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg ref={ref} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden>
      <motion.path d={`${d} L${w},${height} L0,${height} Z`} fill={color} initial={{ opacity: 0 }} animate={{ opacity: inView ? 0.12 : 0 }} transition={{ duration: 0.8, delay: 0.5 }} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: inView ? 1 : 0 }} transition={{ duration: 1.2, ease: "easeOut" }} />
      <motion.circle cx={lx} cy={ly} r={4} fill={color} initial={{ scale: 0 }} animate={{ scale: inView ? 1 : 0 }} transition={{ delay: 1.1 }} />
    </svg>
  );
}

/** Barra horizontal que crece al aparecer. */
export function GrowBar({ pct, color, label }: { pct: number; color: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="h-3 w-full overflow-hidden rounded-full bg-surface-2" role={label ? "img" : undefined} aria-label={label}>
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: inView ? `${Math.max(0, Math.min(100, pct))}%` : 0 }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  );
}
