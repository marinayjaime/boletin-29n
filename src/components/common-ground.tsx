"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Plus } from "lucide-react";
import type { Commonality, Party, PolicyTopic, Proposal, SourceDocument } from "@/lib/schema";
import { KIND_LABELS, commonForSelection, pairMatrix } from "@/lib/common";
import { partyVars } from "@/lib/party-theme";
import { PartyAvatar, TopicIcon } from "./ui";
import { Sheet } from "./sheet";
import { ProposalDetail } from "./proposal-detail";

const KIND_STYLE: Record<Commonality["kind"], string> = { equivalente: "var(--ink)", objetivo: "#0e7490", parcial: "#b45309" };

export function CommonGround({ groups, parties, proposals, topics, sources }: { groups: Commonality[]; parties: Party[]; proposals: Proposal[]; topics: PolicyTopic[]; sources: SourceDocument[] }) {
  const [selected, setSelected] = useState(parties.map((p) => p.id));
  const [kind, setKind] = useState<Commonality["kind"] | "">("");
  const [pair, setPair] = useState<[string, string] | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const pmap = Object.fromEntries(parties.map((p) => [p.id, p]));
  const prmap = Object.fromEntries(proposals.map((p) => [p.id, p]));
  const tmap = Object.fromEntries(topics.map((t) => [t.id, t]));
  const smap = Object.fromEntries(sources.map((s) => [s.id, s]));

  const sel = parties.filter((p) => selected.includes(p.id));
  const scoped = useMemo(() => commonForSelection(groups, proposals, selected), [groups, proposals, selected]);
  const matrix = useMemo(() => pairMatrix(scoped, proposals, selected), [scoped, proposals, selected]);
  const list = scoped.filter((g) => (!kind || g.kind === kind) && (!pair || (g.members.some((m) => prmap[m.proposalId].partyId === pair[0]) && g.members.some((m) => prmap[m.proposalId].partyId === pair[1]))));
  const byTopic = [...new Set(list.map((g) => g.topicId))];
  const max = Math.max(1, ...selected.flatMap((a) => selected.map((b) => matrix[a]?.[b] ?? 0)));

  // posiciones del diagrama circular
  const R = 120;
  const pos = Object.fromEntries(sel.map((p, i) => [p.id, { x: 160 + R * Math.cos((i / sel.length) * 2 * Math.PI - Math.PI / 2), y: 160 + R * Math.sin((i / sel.length) * 2 * Math.PI - Math.PI / 2) }]));
  const toggle = (id: string) => setSelected((c) => (c.includes(id) ? (c.length > 2 ? c.filter((x) => x !== id) : c) : [...c, id]));
  const current = open ? prmap[open] : null;

  return (
    <div>
      <div className="lane -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:px-0" role="group" aria-label="Partidos (mínimo 2)">
        {parties.map((p) => {
          const on = selected.includes(p.id);
          const v = partyVars(p.id);
          return (
            <button key={p.id} type="button" aria-pressed={on} onClick={() => toggle(p.id)} className="flex min-w-[150px] items-center gap-3 rounded-[20px] p-3 text-left transition-all md:min-w-0" style={on ? { background: v.primary, color: v.on } : { background: "var(--surface)", boxShadow: "inset 0 0 0 1.5px var(--line)", opacity: 0.7 }}>
              <PartyAvatar party={p} size={40} ring={on ? 2 : 0} label={false} />
              <span className="flex-1 font-extrabold">{p.shortName}</span>
              {on ? <Check size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* diagrama de relaciones */}
        <div className="card p-5">
          <p className="eyebrow">Conexiones</p>
          <svg viewBox="0 0 320 320" className="mx-auto mt-2 w-full max-w-[380px]" role="img" aria-label={`Diagrama: ${sel.flatMap((a, i) => sel.slice(i + 1).map((b) => `${a.shortName} y ${b.shortName} comparten ${matrix[a.id][b.id]}`)).join("; ")}`}>
            {sel.flatMap((a, i) =>
              sel.slice(i + 1).map((b) => {
                const n = matrix[a.id][b.id];
                if (!n) return null;
                const active = !hover || hover === a.id || hover === b.id;
                const isPair = pair && ((pair[0] === a.id && pair[1] === b.id) || (pair[0] === b.id && pair[1] === a.id));
                return (
                  <g key={a.id + b.id} onClick={() => setPair(isPair ? null : [a.id, b.id])} className="cursor-pointer">
                    <motion.line
                      x1={pos[a.id].x}
                      y1={pos[a.id].y}
                      x2={pos[b.id].x}
                      y2={pos[b.id].y}
                      stroke={isPair ? "var(--brand)" : "var(--ink)"}
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1, strokeWidth: 2 + (n / max) * 12, opacity: active ? 0.75 : 0.08 }}
                      transition={{ duration: 0.6 }}
                    />
                    <circle cx={(pos[a.id].x + pos[b.id].x) / 2} cy={(pos[a.id].y + pos[b.id].y) / 2} r={11} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} opacity={active ? 1 : 0.15} />
                    <text x={(pos[a.id].x + pos[b.id].x) / 2} y={(pos[a.id].y + pos[b.id].y) / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--ink)" opacity={active ? 1 : 0.15}>
                      {n}
                    </text>
                  </g>
                );
              }),
            )}
            {sel.map((p) => (
              <g key={p.id} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)}>
                <circle cx={pos[p.id].x} cy={pos[p.id].y} r={30} fill={partyVars(p.id).primary} />
                <text x={pos[p.id].x} y={pos[p.id].y + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill={partyVars(p.id).on}>
                  {p.shortName.length > 8 ? p.monogram : p.shortName}
                </text>
              </g>
            ))}
          </svg>
          <p className="text-center text-sm font-bold text-ink-3">El grosor indica cuántos puntos en común documentados comparten. Pulsa una línea.</p>
        </div>

        {/* matriz */}
        <div className="card overflow-x-auto p-5">
          <p className="eyebrow">Matriz de coincidencias</p>
          <table className="mt-3 w-full min-w-[360px] border-separate border-spacing-1 text-sm">
            <caption className="sr-only">Número de puntos en común por pareja de partidos</caption>
            <thead>
              <tr>
                <th />
                {sel.map((p) => (
                  <th key={p.id} scope="col" className="pb-1 text-xs font-extrabold" style={{ color: partyVars(p.id).strong }}>
                    {p.shortName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sel.map((a) => (
                <tr key={a.id}>
                  <th scope="row" className="pr-2 text-left text-xs font-extrabold" style={{ color: partyVars(a.id).strong }}>
                    {a.shortName}
                  </th>
                  {sel.map((b) => {
                    const n = matrix[a.id][b.id];
                    const isPair = pair && pair.includes(a.id) && pair.includes(b.id) && a.id !== b.id;
                    return (
                      <td key={b.id}>
                        {a.id === b.id ? (
                          <span className="block h-12 rounded-xl" style={{ background: partyVars(a.id).soft }} aria-hidden />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPair(isPair ? null : [a.id, b.id])}
                            aria-pressed={!!isPair}
                            aria-label={`${a.shortName} y ${b.shortName}: ${n} puntos en común`}
                            className="num grid h-12 w-full place-items-center rounded-xl text-xl transition-transform hover:scale-105"
                            style={{ background: n ? `color-mix(in oklab, var(--ink) ${12 + (n / max) * 70}%, var(--surface))` : "var(--surface-2)", color: n / max > 0.5 ? "var(--bg)" : "var(--ink)", outline: isPair ? "3px solid var(--brand)" : undefined }}
                          >
                            {n}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(Object.keys(KIND_LABELS) as Commonality["kind"][]).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind((x) => (x === k ? "" : k))} className="chip" title={KIND_LABELS[k].help}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_STYLE[k] }} aria-hidden /> {KIND_LABELS[k].label}
          </button>
        ))}
        {pair && (
          <button type="button" className="chip" aria-pressed onClick={() => setPair(null)}>
            {pmap[pair[0]].shortName} + {pmap[pair[1]].shortName} ✕
          </button>
        )}
        <span className="ml-auto text-sm font-extrabold text-ink-3" role="status">
          {list.length} puntos en común
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {byTopic.map((tid) => (
          <motion.section layout key={tid} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8" aria-labelledby={`c-${tid}`}>
            <h2 id={`c-${tid}`} className="mb-3 flex items-center gap-3 display text-3xl">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-brand">
                <TopicIcon id={tid} size={20} />
              </span>
              {tmap[tid]?.name}
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {list
                .filter((g) => g.topicId === tid)
                .map((g) => (
                  <motion.article layout key={g.id} className="card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="tag !text-white" style={{ background: KIND_STYLE[g.kind] }}>
                        {KIND_LABELS[g.kind].label}
                      </span>
                      <span className="flex -space-x-2">
                        {[...new Set(g.members.map((m) => prmap[m.proposalId].partyId))].map((pid) => (
                          <PartyAvatar key={pid} party={pmap[pid]} size={30} ring={2} />
                        ))}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-extrabold">{g.title}</h3>
                    <p className="mt-1 font-semibold text-ink-2">{g.shared}</p>
                    <ul className="mt-4 space-y-2">
                      {g.members.map((m) => {
                        const pr = prmap[m.proposalId];
                        const v = partyVars(pr.partyId);
                        return (
                          <li key={m.proposalId}>
                            <button type="button" onClick={() => setOpen(pr.id)} className="flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-transform hover:translate-x-0.5" style={{ background: v.soft }}>
                              <span className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-extrabold" style={{ background: v.primary, color: v.on }}>
                                {pmap[pr.partyId].shortName}
                              </span>
                              <span className="flex-1 text-sm font-bold">{m.difference ?? pr.summary}</span>
                              <ArrowRight size={16} className="mt-0.5 shrink-0" style={{ color: v.strong }} aria-hidden />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </motion.article>
                ))}
            </div>
          </motion.section>
        ))}
      </AnimatePresence>
      {list.length === 0 && <p className="hatch mt-8 rounded-[24px] p-8 text-center font-bold text-ink-2 shadow-[inset_0_0_0_1.5px_var(--line)]">No hay puntos en común documentados para esta selección.</p>}

      <Sheet open={!!current} onClose={() => setOpen(null)} title="Propuesta" accent={current ? partyVars(current.partyId).primary : undefined}>
        {current && <ProposalDetail proposal={current} source={smap[current.citations[0].sourceId]} party={pmap[current.partyId]} topic={tmap[current.topicId]} related={[]} />}
      </Sheet>
    </div>
  );
}
