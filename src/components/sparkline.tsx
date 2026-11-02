/** Minigráfico SVG accesible (decorativo: el valor se da siempre en texto). */
export function Sparkline({ values, width = 160, height = 40 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 4 - ((v - min) / span) * (height - 8)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden className="overflow-visible">
      <path d={`${d} L${width},${height} L0,${height} Z`} fill="var(--accent-soft)" opacity="0.55" />
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.6" fill="var(--accent)" />
    </svg>
  );
}
