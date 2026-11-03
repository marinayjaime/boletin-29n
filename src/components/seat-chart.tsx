"use client";

import { useMemo, useRef, useState } from "react";
import { hemicycleSeats } from "@/lib/hemicycle";

export type SeatBlock = { key: string; name: string; color: string; seats: number; dim?: boolean; outline?: boolean };

/**
 * Hemiciclo de escaños por formación. Los escaños se asignan por orden de bloque
 * de izquierda a derecha (orden visual elegido por quien llama, no ideológico).
 * Interacción: arrastrar para inclinar/girar, botones de zoom; respeta movimiento reducido.
 */
export function SeatChart({
  blocks,
  total = 350,
  majority = 176,
  height = 300,
  interactive = false,
  caption,
  center,
}: {
  blocks: SeatBlock[];
  total?: number;
  majority?: number;
  height?: number;
  interactive?: boolean;
  caption?: string;
  center?: React.ReactNode;
}) {
  const seats = useMemo(() => hemicycleSeats(total), [total]);
  const assigned = useMemo(() => {
    const out: (SeatBlock | null)[] = [];
    for (const b of blocks) for (let i = 0; i < b.seats && out.length < total; i++) out.push(b);
    while (out.length < total) out.push(null);
    return out;
  }, [blocks, total]);
  const [tilt, setTilt] = useState(0);
  const [spin, setSpin] = useState(0);
  const [zoom, setZoom] = useState(1);
  const drag = useRef<{ x: number; y: number; t: number; s: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const W = 600;
  const H = 320;
  const R = 286;
  const r = Math.max(3.2, Math.min(7.2, 2550 / total / 1.55));
  const majAngle = Math.PI - (Math.PI * majority) / total;
  const hovered = blocks.find((b) => b.key === hover);

  return (
    <figure className="relative">
      <div
        className={`relative ${interactive ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
        style={{ perspective: "1000px" }}
        onPointerDown={(e) => {
          if (!interactive) return;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, t: tilt, s: spin };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setTilt(Math.max(0, Math.min(62, drag.current.t + (drag.current.y - e.clientY) * 0.35)));
          setSpin(Math.max(-35, Math.min(35, drag.current.s + (e.clientX - drag.current.x) * 0.2)));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <svg
          suppressHydrationWarning
          viewBox={`0 0 ${W} ${H}`}
          style={{
            height,
            transform: `rotateX(${tilt}deg) rotateZ(${spin}deg) scale(${zoom})`,
            transformOrigin: "50% 92%",
            transition: "transform .5s cubic-bezier(.2,.8,.2,1)",
          }}
          className="mx-auto block w-full max-w-[720px] overflow-visible"
          role="img"
          aria-label={`Hemiciclo de ${total} escaños. ${blocks
            .filter((b) => b.seats > 0)
            .map((b) => `${b.name}: ${b.seats}`)
            .join(", ")}. Mayoría absoluta: ${majority}.`}
        >
          {tilt > 4 && <ellipse cx={W / 2} cy={H - 8} rx={R + 12} ry={12} fill="var(--ink)" opacity={0.06} />}
          {/* referencia de mayoría absoluta */}
          <line
            x1={(W / 2 + Math.cos(majAngle) * (R * 0.32)).toFixed(2)}
            y1={(H - 14 - Math.sin(majAngle) * (R * 0.32)).toFixed(2)}
            x2={(W / 2 + Math.cos(majAngle) * (R + 14)).toFixed(2)}
            y2={(H - 14 - Math.sin(majAngle) * (R + 14)).toFixed(2)}
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <text x={(W / 2 + Math.cos(majAngle) * (R + 22)).toFixed(2)} y={(H - 14 - Math.sin(majAngle) * (R + 22)).toFixed(2)} textAnchor="middle" fontSize="13" fontWeight="800" fill="currentColor">
            {majority}
          </text>
          {seats.map((s, i) => {
            const b = assigned[i];
            const dimmed = b?.dim || (hover && b?.key !== hover);
            return (
              <circle
                key={i}
                cx={Math.round((W / 2 + s.x * R) * 100) / 100}
                cy={Math.round((H - 14 - s.y * R) * 100) / 100}
                r={r}
                fill={b ? (b.outline ? "transparent" : b.color) : "var(--surface-3)"}
                stroke={b?.outline ? b.color : "none"}
                strokeWidth={b?.outline ? 1.6 : 0}
                opacity={dimmed ? 0.18 : 1}
                style={{ transition: "fill .45s ease, opacity .3s ease", transitionDelay: `${(i % 40) * 4}ms` }}
                onPointerEnter={() => b && setHover(b.key)}
                onPointerLeave={() => setHover(null)}
              />
            );
          })}
          {center && (
            <foreignObject x={W / 2 - 130} y={H - 120} width={260} height={110}>
              <div className="flex h-full flex-col items-center justify-end text-center">{center}</div>
            </foreignObject>
          )}
        </svg>
        {hovered && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-2xl bg-surface px-3 py-2 text-sm font-bold shadow-[var(--shadow)]" aria-live="polite">
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: hovered.color }} />
            {hovered.name}: {hovered.seats}
          </div>
        )}
      </div>
      {interactive && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
          <span className="text-ink-3">Arrastra para girar ·</span>
          <button type="button" className="chip" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))} aria-label="Ampliar">
            +
          </button>
          <button type="button" className="chip" onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))} aria-label="Reducir">
            −
          </button>
          <button type="button" className="chip" onClick={() => setTilt((t) => (t ? 0 : 45))} aria-pressed={tilt > 0}>
            3D
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => {
              setTilt(0);
              setSpin(0);
              setZoom(1);
            }}
          >
            Restablecer
          </button>
        </div>
      )}
      {caption && <figcaption className="mt-2 text-center text-xs font-semibold text-ink-3">{caption}</figcaption>}
    </figure>
  );
}
