"use client";

import { asset } from "@/lib/asset";
import { useEffect, useMemo, useState } from "react";
import { hemicycleSeats } from "@/lib/hemicycle";
import { GROUP_LABELS, VOTE_COLORS, VOTE_LABELS } from "@/lib/groups";
import { GROUP_COLORS } from "@/lib/party-theme";
import { normalize } from "@/lib/search";

type Code = keyof typeof VOTE_LABELS;
type Row = { name: string; group: string; vote: Code };

/** Decodifica el formato compacto de public/data/votes/S###.json (ver scripts/import-congreso.ts). */
export function decodeVote(enc: string, deputies: string[], groups: string[]): Row[] {
  const out: Row[] = [];
  for (let i = 0; i + 4 <= enc.length; i += 4) {
    const d = parseInt(enc.slice(i, i + 2), 36);
    const g = enc.charCodeAt(i + 2) - 97;
    out.push({ name: deputies[d], group: groups[g], vote: enc[i + 3] as Code });
  }
  return out;
}

export function Hemicycle({ session, number, title }: { session: number; number: number; title: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tilt, setTilt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [colorBy, setColorBy] = useState<"voto" | "grupo">("voto");
  const [hover, setHover] = useState<number | null>(null);
  const [focusGroup, setFocusGroup] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const s = `S${String(session).padStart(3, "0")}`;
    Promise.all([fetch(asset(`/data/votes/registry.json`)).then((r) => r.json()), fetch(asset(`/data/votes/${s}.json`)).then((r) => r.json())])
      .then(([reg, ses]) => {
        const enc = ses[String(number)];
        if (!enc) throw new Error("sin detalle nominal");
        setRows(decodeVote(enc, reg.deputies, reg.groups));
      })
      .catch((e) => setError(`No se pudo cargar el voto nominal (${e.message}).`));
  }, [session, number]);

  const groupOrder = useMemo(() => {
    if (!rows) return [];
    const c = new Map<string, number>();
    for (const r of rows) c.set(r.group, (c.get(r.group) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([g]) => g);
  }, [rows]);

  const ordered = useMemo(() => {
    if (!rows) return [];
    const order = { S: 0, A: 1, N: 2, X: 3 };
    return [...rows].sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) || order[a.vote] - order[b.vote] || a.name.localeCompare(b.name, "es"));
  }, [rows, groupOrder]);

  const seats = useMemo(() => hemicycleSeats(ordered.length), [ordered.length]);

  if (error) return <p className="rounded border border-rule p-4 text-sm">{error}</p>;
  if (!rows)
    return (
      <p role="status" className="py-16 text-center text-sm text-ink-3">
        Cargando el voto de cada diputado…
      </p>
    );

  const W = 600;
  const H = 320;
  const scale = 280;
  const rSeat = Math.min(7.4, 2600 / Math.max(ordered.length, 1) / 1.6);
  const h = hover !== null ? ordered[hover] : null;
  const nq = normalize(q.trim());

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Leyenda de voto">
          {(["S", "N", "A", "X"] as Code[]).map((c) => (
            <li key={c} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full border border-ink-3" style={{ background: VOTE_COLORS[c] }} aria-hidden />
              {VOTE_LABELS[c]} <span className="font-mono text-xs text-ink-3">{rows.filter((r) => r.vote === c).length}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <span role="radiogroup" aria-label="Colorear por" className="flex rounded-full bg-surface p-1 shadow-[inset_0_0_0_1.5px_var(--line)]">
            {(["voto", "grupo"] as const).map((c) => (
              <button key={c} role="radio" aria-checked={colorBy === c} onClick={() => setColorBy(c)} className={`rounded-full px-3 py-1.5 ${colorBy === c ? "bg-ink text-bg" : ""}`}>
                {c === "voto" ? "Por voto" : "Por grupo"}
              </button>
            ))}
          </span>
          <label className="flex items-center gap-2">
            Inclinar
            <input type="range" min={0} max={60} value={tilt} onChange={(e) => setTilt(Number(e.target.value))} className="w-24" style={{ accentColor: "var(--ink)" }} />
          </label>
          <button type="button" className="chip !min-h-[36px]" onClick={() => setZoom((z) => Math.min(1.8, z + 0.2))} aria-label="Ampliar">+</button>
          <button type="button" className="chip !min-h-[36px]" onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))} aria-label="Reducir">−</button>
        </div>
      </div>

      <div className="relative mt-4" style={{ perspective: "1100px" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto w-full max-w-[760px] transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: `rotateX(${tilt}deg) scale(${zoom})`, transformOrigin: "50% 100%" }}
          role="img"
          aria-label={`Hemiciclo de la votación «${title}». ${rows.filter((r) => r.vote === "S").length} sí, ${rows.filter((r) => r.vote === "N").length} no, ${rows.filter((r) => r.vote === "A").length} abstenciones. El detalle por diputado está en la lista inferior.`}
          onMouseLeave={() => setHover(null)}
        >
          {tilt > 0 && <ellipse cx={W / 2} cy={H - 6} rx={scale + 14} ry="10" fill="var(--ink)" opacity="0.07" />}
          {seats.map((s, i) => {
            const d = ordered[i];
            const dim = (focusGroup && d.group !== focusGroup) || (nq && !normalize(d.name).includes(nq));
            const cx = W / 2 + s.x * scale;
            const cy = H - 12 - s.y * scale;
            return (
              <g key={i} style={{ opacity: dim ? 0.15 : 1, transition: "opacity .25s" }}>
                {tilt > 0 && <circle cx={cx} cy={cy + 2.2} r={rSeat} fill="var(--ink)" opacity="0.18" />}
                <circle
                  cx={cx}
                  cy={cy}
                  r={rSeat}
                  fill={colorBy === "grupo" ? (d.vote === "X" ? "transparent" : GROUP_COLORS[d.group] ?? "#9aa1b8") : VOTE_COLORS[d.vote]}
                  stroke={d.vote === "X" ? (colorBy === "grupo" ? GROUP_COLORS[d.group] ?? "var(--ink-3)" : "var(--ink-3)") : hover === i ? "var(--ink)" : "var(--paper)"}
                  strokeWidth={d.vote === "X" ? 1 : hover === i ? 1.6 : 0.6}
                  onMouseEnter={() => setHover(i)}
                  onClick={() => setHover(i)}
                />
              </g>
            );
          })}
          <text x={W / 2} y={H - 30} textAnchor="middle" className="display" fontSize="34" fill="var(--ink)">
            {rows.filter((r) => r.vote === "S").length}–{rows.filter((r) => r.vote === "N").length}
          </text>
        </svg>
        <div className="pointer-events-none absolute left-2 top-2 min-h-[3.5rem] max-w-[60%] rounded bg-paper/90 p-2 text-sm" aria-live="polite">
          {h ? (
            <>
              <p className="font-semibold">{h.name}</p>
              <p className="text-ink-2">
                {GROUP_LABELS[h.group] ?? h.group} · <strong>{VOTE_LABELS[h.vote]}</strong>
              </p>
            </>
          ) : (
            <p className="text-ink-3">Pasa el cursor o toca un escaño</p>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-ink-3">
        Grupos ordenados por tamaño, de izquierda a derecha, y dentro de cada grupo por sentido del voto. No reproduce la ubicación real de los escaños.
      </p>

      {/* grupos */}
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <caption className="kicker mb-2 text-left">Voto por grupo parlamentario (calculado a partir del voto nominal)</caption>
          <thead>
            <tr className="text-left text-ink-3">
              <th scope="col" className="py-1 font-normal">
                Grupo
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                Sí
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                No
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                Abst.
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                No vota
              </th>
              <th scope="col" className="w-1/3 py-1 pl-4 font-normal">
                Distribución
              </th>
            </tr>
          </thead>
          <tbody>
            {groupOrder.map((g) => {
              const rs = rows.filter((r) => r.group === g);
              const c = { S: 0, N: 0, A: 0, X: 0 } as Record<Code, number>;
              rs.forEach((r) => c[r.vote]++);
              const divided = [c.S, c.N, c.A].filter((x) => x > 0).length > 1;
              return (
                <tr key={g} className={`border-t border-rule ${focusGroup === g ? "bg-paper-2" : ""}`} onMouseEnter={() => setFocusGroup(g)} onMouseLeave={() => setFocusGroup(null)}>
                  <th scope="row" className="py-2 text-left font-normal">
                    <button className="text-left hover:underline" onClick={() => setFocusGroup((f) => (f === g ? null : g))} aria-pressed={focusGroup === g}>
                      <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: GROUP_COLORS[g] ?? "#9aa1b8" }} aria-hidden />
                      {GROUP_LABELS[g] ?? g}
                    </button>
                    {divided && <span className="cite-chip ml-2 border-accent text-accent">voto dividido</span>}
                  </th>
                  <td className="text-right font-mono">{c.S}</td>
                  <td className="text-right font-mono">{c.N}</td>
                  <td className="text-right font-mono">{c.A}</td>
                  <td className="text-right font-mono">{c.X}</td>
                  <td className="pl-4">
                    <div className="flex h-2.5 overflow-hidden rounded-sm bg-paper-3">
                      {(["S", "N", "A"] as Code[]).map((k) => (
                        <span key={k} style={{ width: `${(c[k] / rs.length) * 100}%`, background: VOTE_COLORS[k] }} />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* diputados */}
      <details className="mt-8">
        <summary className="cursor-pointer text-sm font-medium">Ver el voto de los {rows.length} diputados</summary>
        <label className="mt-3 block max-w-sm text-sm">
          <span className="kicker mb-1 block">Buscar diputado</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded border border-rule bg-paper px-3 py-2" placeholder="Apellido…" />
        </label>
        <ul className="mt-3 grid gap-x-6 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {ordered
            .filter((r) => !nq || normalize(r.name).includes(nq))
            .map((r) => (
              <li key={r.name} className="flex items-center justify-between gap-2 border-t border-rule py-1.5">
                <span>
                  {r.name} <span className="text-xs text-ink-3">· {r.group}</span>
                </span>
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border border-ink-3" style={{ background: VOTE_COLORS[r.vote] }} aria-hidden />
                  {VOTE_LABELS[r.vote]}
                </span>
              </li>
            ))}
        </ul>
      </details>
    </div>
  );
}
