"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Equal, Plus } from "lucide-react";
import type { Party, PolicyTopic, Proposal, SourceDocument } from "@/lib/schema";
import { buildMatrix, clampSelection, encodeCompareState } from "@/lib/compare";
import { CYCLE_LABELS } from "@/lib/labels";
import { partyVars } from "@/lib/party-theme";
import { PartyAvatar, TopicIcon } from "./ui";
import { Sheet } from "./sheet";
import { ProposalDetail } from "./proposal-detail";

type Mode = "todo" | "diferencias";

function ProposalCard({
  p,
  party,
  sharedWith,
  highlighted,
  onOpen,
  onHover,
}: {
  p: Proposal;
  party: Party;
  sharedWith: Party[];
  highlighted: boolean;
  onOpen: () => void;
  onHover: (k: string | null) => void;
}) {
  const v = partyVars(party.id);
  return (
    <motion.button
      layout
      type="button"
      onClick={onOpen}
      onMouseEnter={() => onHover(p.positionKey ?? null)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(p.positionKey ?? null)}
      onBlur={() => onHover(null)}
      className="group block w-full rounded-[18px] bg-surface p-4 text-left transition-shadow"
      style={{ boxShadow: highlighted ? `0 0 0 3px ${v.primary}, var(--shadow-lg)` : `inset 4px 0 0 ${v.primary}, var(--shadow)` }}
    >
      <span className="block text-[1.02rem] font-bold leading-snug">{p.summary}</span>
      <span className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="tag">{CYCLE_LABELS[p.cycle]?.replace("Generales ", "")}</span>
        <span className="tag">pág. {p.citations[0].pdfPage}</span>
        {sharedWith.length > 0 && (
          <span className="tag !bg-brand-soft !text-ink">
            <Equal size={12} aria-hidden /> igual que {sharedWith.map((s) => s.shortName).join(", ")}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-sm font-extrabold transition-transform group-hover:translate-x-0.5" style={{ color: v.strong }}>
          Explorar <ArrowRight size={14} aria-hidden />
        </span>
      </span>
    </motion.button>
  );
}

export function Comparator({ parties, topics, proposals, sources }: { parties: Party[]; topics: PolicyTopic[]; proposals: Proposal[]; sources: SourceDocument[] }) {
  const sp = useSearchParams();
  const reduce = useReducedMotion();
  const allIds = parties.map((p) => p.id);
  const [selected, setSelected] = useState<string[]>(() => {
    const u = sp.get("p");
    return u ? clampSelection(u.split(","), allIds) : allIds;
  });
  const [topicId, setTopicId] = useState<string>(() => (topics.some((t) => t.id === sp.get("t")) ? (sp.get("t") as string) : "vivienda"));
  const [mode, setMode] = useState<Mode>(sp.get("m") === "diferencias" ? "diferencias" : "todo");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  useEffect(() => {
    window.history.replaceState(null, "", `?${encodeCompareState({ parties: selected, topic: topicId, mode })}`);
  }, [selected, topicId, mode]);

  const topic = topics.find((t) => t.id === topicId)!;
  const rows = useMemo(() => buildMatrix(proposals, topic, selected, mode), [proposals, topic, selected, mode]);
  const visibleRows = rows.filter((r) => !r.collapsed);
  const pmap = useMemo(() => Object.fromEntries(parties.map((p) => [p.id, p])), [parties]);
  const smap = useMemo(() => Object.fromEntries(sources.map((s) => [s.id, s])), [sources]);
  const countByTopic = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of proposals) if (selected.includes(p.partyId)) m[p.topicId] = (m[p.topicId] ?? 0) + 1;
    return m;
  }, [proposals, selected]);
  const keyOwners = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const p of proposals) if (p.positionKey && selected.includes(p.partyId)) (m[p.positionKey] ??= []).push(p.partyId);
    return m;
  }, [proposals, selected]);
  const hidden = rows.reduce((a, r) => a + r.cells.reduce((b, c) => b + c.hiddenAsCoincidence.length, 0), 0);
  const perParty = (pid: string) => proposals.filter((p) => p.topicId === topicId && p.partyId === pid).length;

  const toggle = (id: string) =>
    setSelected((cur) => {
      if (cur.includes(id)) {
        if (cur.length <= 2) {
          setNotice("La comparación necesita al menos dos partidos.");
          return cur;
        }
        setNotice("");
        return cur.filter((x) => x !== id);
      }
      setNotice("");
      return [...cur, id];
    });
  const move = (id: string, d: -1 | 1) =>
    setSelected((cur) => {
      const i = cur.indexOf(id);
      const j = i + d;
      if (j < 0 || j >= cur.length) return cur;
      const n = [...cur];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const open = proposals.find((p) => p.id === openId) ?? null;
  const shared = (p: Proposal) => (p.positionKey ? (keyOwners[p.positionKey] ?? []).filter((x) => x !== p.partyId).map((x) => pmap[x]) : []);

  return (
    <div>
      <div role="group" aria-labelledby="sel" className="mb-6">
        <p id="sel" className="eyebrow mb-3">
          Elige de 2 a 5 · {selected.length} seleccionados
        </p>
        <div className="lane -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:px-0">
          {parties.map((p) => {
            const on = selected.includes(p.id);
            const v = partyVars(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(p.id)}
                className="flex min-w-[150px] shrink-0 items-center gap-3 rounded-[20px] p-3 text-left transition-all md:min-w-0"
                style={on ? { background: v.primary, color: v.on, boxShadow: "var(--shadow)" } : { background: "var(--surface)", boxShadow: "inset 0 0 0 1.5px var(--line)", opacity: 0.75 }}
              >
                <PartyAvatar party={p} size={44} ring={on ? 2 : 0} label={false} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{p.shortName}</span>
                  <span className="block text-xs font-bold">{on ? "Comparando" : "Añadir"}</span>
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-black/10" aria-hidden>
                  {on ? <Check size={15} /> : <Plus size={15} />}
                </span>
              </button>
            );
          })}
        </div>
        <p role="status" aria-live="polite" className="mt-1 min-h-5 text-sm font-bold text-no-ink">
          {notice}
        </p>
      </div>

      <div className="sticky top-16 z-30 -mx-4 bg-bg/90 px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
        <div className="lane flex gap-2 overflow-x-auto" role="tablist" aria-label="Tema">
          {topics.map((t) => {
            const on = t.id === topicId;
            const n = countByTopic[t.id] ?? 0;
            return (
              <button key={t.id} role="tab" aria-selected={on} onClick={() => setTopicId(t.id)} className={`chip shrink-0 ${!n && !on ? "opacity-50" : ""}`}>
                <TopicIcon id={t.id} size={16} />
                {t.short}
                <span className={`rounded-full px-1.5 text-xs ${on ? "bg-brand text-brand-ink" : "bg-surface-2"}`}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-ink text-brand">
            <TopicIcon id={topic.id} size={28} />
          </span>
          <div>
            <h2 className="display text-4xl md:text-5xl">{topic.name}</h2>
            <details className="mt-1 text-sm font-semibold text-ink-2">
              <summary className="cursor-pointer underline decoration-brand decoration-2 underline-offset-4">¿Quién decide sobre esto?</summary>
              <p className="mt-1 max-w-xl">{topic.competence}</p>
            </details>
          </div>
        </div>
        <div role="radiogroup" aria-label="Modo" className="flex rounded-full bg-surface p-1 shadow-[inset_0_0_0_1.5px_var(--line)]">
          {(["todo", "diferencias"] as Mode[]).map((m) => (
            <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`rounded-full px-4 py-2.5 text-sm font-extrabold transition-colors ${mode === m ? "bg-ink text-bg" : "text-ink-2"}`}>
              {m === "todo" ? "Mostrar todo" : "Solo diferencias"}
            </button>
          ))}
        </div>
      </div>
      {mode === "diferencias" && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-sm font-bold">
          <Equal size={16} aria-hidden /> {hidden > 0 ? `${hidden} coincidencias ocultas` : "Sin coincidencias entre todos los seleccionados"}
        </p>
      )}

      <LayoutGroup>
        <div className="mt-6 hidden md:block">
          <div className="sticky top-[8.5rem] z-20 grid gap-3 pb-3" style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0,1fr))` }}>
            {selected.map((id, i) => {
              const p = pmap[id];
              const v = partyVars(id);
              return (
                <motion.div layout={!reduce} key={id} className="flex items-center gap-3 rounded-[20px] p-3" style={{ background: v.primary, color: v.on }}>
                  <PartyAvatar party={p} size={42} ring={2} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{p.shortName}</p>
                    <p className="text-xs font-bold">{perParty(id)} propuestas</p>
                  </div>
                  <span className="flex gap-1">
                    <button type="button" onClick={() => move(id, -1)} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-full bg-black/15 disabled:opacity-30" aria-label={`Mover ${p.shortName} a la izquierda`}>
                      <ArrowLeft size={14} aria-hidden />
                    </button>
                    <button type="button" onClick={() => move(id, 1)} disabled={i === selected.length - 1} className="grid h-8 w-8 place-items-center rounded-full bg-black/15 disabled:opacity-30" aria-label={`Mover ${p.shortName} a la derecha`}>
                      <ArrowRight size={14} aria-hidden />
                    </button>
                  </span>
                </motion.div>
              );
            })}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={topicId + mode} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -10 }} transition={{ duration: 0.28 }}>
              {visibleRows.map((row) => (
                <section key={row.dimensionId} className="mt-6" aria-labelledby={`r-${row.dimensionId}`}>
                  <h3 id={`r-${row.dimensionId}`} className="mb-3 flex items-center gap-3 text-sm font-extrabold uppercase tracking-wide text-ink-2">
                    <span className="h-px flex-1 bg-line" aria-hidden />
                    {row.label}
                    <span className="h-px flex-1 bg-line" aria-hidden />
                  </h3>
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0,1fr))` }}>
                    {row.cells.map((cell) => (
                      <motion.div layout={!reduce} key={cell.partyId} className="space-y-3">
                        <span className="sr-only">{pmap[cell.partyId].shortName}:</span>
                        {cell.proposals.length === 0 ? (
                          <div className="hatch grid min-h-24 place-items-center rounded-[18px] p-3 text-center text-sm font-bold text-ink-3 shadow-[inset_0_0_0_1.5px_var(--line)]">
                            {cell.hiddenAsCoincidence.length ? "Coincidencia (oculta)" : "Sin posición documentada"}
                          </div>
                        ) : (
                          cell.proposals.map((p) => (
                            <ProposalCard key={p.id} p={p} party={pmap[cell.partyId]} sharedWith={shared(p)} highlighted={!!hoverKey && p.positionKey === hoverKey} onOpen={() => setOpenId(p.id)} onHover={setHoverKey} />
                          ))
                        )}
                      </motion.div>
                    ))}
                  </div>
                </section>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </LayoutGroup>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={topicId + mode + "m"} className="mt-6 space-y-5 md:hidden" initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
          {visibleRows.map((row) => (
            <section key={row.dimensionId} className="card p-4" aria-labelledby={`m-${row.dimensionId}`}>
              <h3 id={`m-${row.dimensionId}`} className="mb-3 text-base font-extrabold">
                {row.label}
              </h3>
              <ul className="space-y-2.5">
                {row.cells.map((cell) => {
                  const p = pmap[cell.partyId];
                  const v = partyVars(cell.partyId);
                  return (
                    <li key={cell.partyId} className="rounded-2xl p-3" style={{ background: v.soft }}>
                      <p className="mb-1.5 flex items-center gap-2 text-sm font-extrabold" style={{ color: v.strong }}>
                        <PartyAvatar party={p} size={26} ring={2} label={false} /> {p.shortName}
                      </p>
                      {cell.proposals.length === 0 ? (
                        <p className="text-sm font-semibold text-ink-3">{cell.hiddenAsCoincidence.length ? "Coincidencia (oculta)" : "Sin posición documentada"}</p>
                      ) : (
                        cell.proposals.map((pr) => (
                          <button key={pr.id} type="button" onClick={() => setOpenId(pr.id)} className="mt-1 flex w-full items-start justify-between gap-2 rounded-xl bg-surface p-3 text-left font-bold leading-snug">
                            <span>
                              {pr.summary}
                              {shared(pr).length > 0 && (
                                <span className="tag ml-1 !bg-brand-soft !text-ink">
                                  <Equal size={11} aria-hidden /> {shared(pr).map((s) => s.shortName).join(", ")}
                                </span>
                              )}
                            </span>
                            <ArrowRight size={16} className="mt-1 shrink-0" style={{ color: v.strong }} aria-hidden />
                          </button>
                        ))
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </motion.div>
      </AnimatePresence>

      {visibleRows.length === 0 && (
        <div className="hatch mt-6 rounded-[24px] p-10 text-center shadow-[inset_0_0_0_1.5px_var(--line)]">
          <p className="display text-3xl">Nada documentado aquí todavía</p>
          <p className="mx-auto mt-2 max-w-md font-semibold text-ink-2">Que no aparezca no significa que no tengan posición: aún no hay propuestas verificadas de estos partidos sobre este tema.</p>
        </div>
      )}

      <Sheet open={!!open} onClose={() => setOpenId(null)} title="Propuesta" accent={open ? partyVars(open.partyId).primary : undefined}>
        {open && (
          <ProposalDetail
            proposal={open}
            source={smap[open.citations[0].sourceId]}
            party={pmap[open.partyId]}
            topic={topics.find((t) => t.id === open.topicId)!}
            related={proposals.filter((p) => p.partyId === open.partyId && p.topicId === open.topicId && p.id !== open.id)}
          />
        )}
      </Sheet>
    </div>
  );
}
