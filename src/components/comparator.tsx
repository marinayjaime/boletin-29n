"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Party, PolicyTopic, Proposal, SourceDocument } from "@/lib/schema";
import { buildMatrix, clampSelection, encodeCompareState } from "@/lib/compare";
import { PartyMark } from "./party-mark";
import { Sheet } from "./sheet";
import { ProposalDetail } from "./proposal-detail";
import { CYCLE_LABELS } from "@/lib/labels";

type Mode = "todo" | "diferencias";

export function Comparator({
  parties,
  topics,
  proposals,
  sources,
}: {
  parties: Party[];
  topics: PolicyTopic[];
  proposals: Proposal[];
  sources: SourceDocument[];
}) {
  const sp = useSearchParams();
  const reduce = useReducedMotion();
  const allIds = parties.map((p) => p.id);

  const [selected, setSelected] = useState<string[]>(() => {
    const fromUrl = sp.get("p");
    return fromUrl ? clampSelection(fromUrl.split(","), allIds) : allIds;
  });
  const [topicId, setTopicId] = useState<string>(() => (topics.some((t) => t.id === sp.get("t")) ? (sp.get("t") as string) : "vivienda"));
  const [mode, setMode] = useState<Mode>(sp.get("m") === "diferencias" ? "diferencias" : "todo");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  // sincronizar URL (comparación compartible)
  useEffect(() => {
    const qs = encodeCompareState({ parties: selected, topic: topicId, mode });
    window.history.replaceState(null, "", `?${qs}`);
  }, [selected, topicId, mode]);

  const topic = topics.find((t) => t.id === topicId)!;
  const rows = useMemo(() => buildMatrix(proposals, topic, selected, mode), [proposals, topic, selected, mode]);
  const partyById = useMemo(() => Object.fromEntries(parties.map((p) => [p.id, p])), [parties]);
  const sourceById = useMemo(() => Object.fromEntries(sources.map((s) => [s.id, s])), [sources]);
  const countByTopic = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of proposals) if (selected.includes(p.partyId)) m[p.topicId] = (m[p.topicId] ?? 0) + 1;
    return m;
  }, [proposals, selected]);

  const toggle = (id: string) => {
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
  };
  const move = (id: string, dir: -1 | 1) =>
    setSelected((cur) => {
      const i = cur.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const n = [...cur];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  // scroll sincronizado de los carriles (móvil): las columnas se desplazan juntas
  const lanes = useRef<HTMLDivElement[]>([]);
  const syncing = useRef(false);
  const onLaneScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (syncing.current) return;
    syncing.current = true;
    const x = e.currentTarget.scrollLeft;
    for (const l of lanes.current) if (l && l !== e.currentTarget) l.scrollLeft = x;
    requestAnimationFrame(() => (syncing.current = false));
  }, []);
  lanes.current = [];
  const laneRef = (el: HTMLDivElement | null) => {
    if (el) lanes.current.push(el);
  };

  const open = proposals.find((p) => p.id === openId) ?? null;
  const cols = selected.length;
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(min(78vw, 260px), 1fr))` };
  const hiddenCount = rows.reduce((a, r) => a + r.cells.reduce((b, c) => b + c.hiddenAsCoincidence.length, 0), 0);

  return (
    <div>
      {/* selección de partidos */}
      <div role="group" aria-labelledby="sel-label" className="border-y border-rule py-5">
        <p id="sel-label" className="kicker mb-3">Partidos que comparas · {selected.length} de 5 · mínimo 2</p>
        <div className="flex flex-wrap gap-2">
          {parties.map((p) => {
            const on = selected.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(p.id)}
                className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 text-sm transition-colors ${on ? "border-ink bg-ink text-paper" : "border-rule text-ink-2 hover:border-ink"}`}
              >
                <span className={`grid h-7 w-7 place-items-center rounded-full border font-mono text-[0.65rem] ${on ? "border-paper" : "border-ink-3"}`}>{p.monogram}</span>
                {p.shortName}
              </button>
            );
          })}
        </div>
        <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-accent">
          {notice}
        </p>
      </div>

      {/* temas */}
      <div className="sticky top-14 z-30 -mx-4 border-b border-rule bg-paper/95 px-4 backdrop-blur md:top-16 md:-mx-8 md:px-8">
        <div className="lane flex gap-1 overflow-x-auto py-3" role="tablist" aria-label="Tema">
          {topics.map((t) => {
            const on = t.id === topicId;
            const n = countByTopic[t.id] ?? 0;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => setTopicId(t.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors ${on ? "bg-accent text-paper" : n ? "text-ink hover:bg-paper-2" : "text-ink-3 hover:bg-paper-2"}`}
              >
                {t.short}
                <span className={`ml-1.5 font-mono text-[0.65rem] ${on ? "text-paper/80" : "text-ink-3"}`}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="display text-3xl md:text-4xl">{topic.name}</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">
            <span className="font-medium text-ink">Competencia: </span>
            {topic.competence}
          </p>
        </div>
        <div role="radiogroup" aria-label="Modo de comparación" className="flex rounded-full border border-ink p-0.5 text-sm">
          {(["todo", "diferencias"] as Mode[]).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 ${mode === m ? "bg-ink text-paper" : "text-ink-2"}`}
            >
              {m === "todo" ? "Mostrar todo" : "Solo diferencias"}
            </button>
          ))}
        </div>
      </div>
      {mode === "diferencias" && (
        <p className="mt-3 text-sm text-ink-2">
          {hiddenCount > 0
            ? `Se ocultan ${hiddenCount} propuesta(s) que coinciden entre todos los partidos seleccionados.`
            : "No hay coincidencias documentadas entre todos los partidos seleccionados en este tema."}{" "}
          Las coincidencias se marcan en revisión editorial, no de forma automática.
        </p>
      )}

      {/* cabecera de columnas */}
      <div className="sticky top-[7.6rem] z-20 mt-6 border-b-2 border-ink bg-paper md:top-[8.1rem]">
        <div ref={laneRef} onScroll={onLaneScroll} className="lane overflow-x-auto [scrollbar-width:none]">
          <div className="grid gap-3" style={gridStyle}>
            <AnimatePresence initial={false}>
              {selected.map((id, i) => {
                const p = partyById[id];
                return (
                  <motion.div
                    layout={!reduce}
                    key={id}
                    initial={reduce ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    className="flex items-center gap-2 py-3"
                  >
                    <PartyMark monogram={p.monogram} size={34} />
                    <span className="font-semibold">{p.shortName}</span>
                    <span className="ml-auto flex gap-1">
                      <button type="button" onClick={() => move(id, -1)} disabled={i === 0} className="h-7 w-7 rounded-full border border-rule text-xs disabled:opacity-30" aria-label={`Mover ${p.shortName} a la izquierda`}>←</button>
                      <button type="button" onClick={() => move(id, 1)} disabled={i === cols - 1} className="h-7 w-7 rounded-full border border-rule text-xs disabled:opacity-30" aria-label={`Mover ${p.shortName} a la derecha`}>→</button>
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* filas */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={topicId + mode}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {rows.filter((r) => !r.collapsed).length === 0 && (
            <div className="hatch mt-6 rounded border border-rule p-8 text-center">
              <p className="display text-2xl">Sin posiciones documentadas en este tema</p>
              <p className="mx-auto mt-2 max-w-lg text-sm text-ink-2">
                Todavía no se han indexado propuestas verificadas de los partidos seleccionados sobre este tema. Que no figuren aquí no significa que
                no tengan posición.
              </p>
            </div>
          )}
          {rows.filter((r) => !r.collapsed).map((row) => (
            <section key={row.dimensionId} className="border-b border-rule py-5" aria-labelledby={`row-${row.dimensionId}`}>
              <h3 id={`row-${row.dimensionId}`} className="kicker mb-3 text-ink">
                {row.label}
              </h3>
              <div ref={laneRef} onScroll={onLaneScroll} className="lane overflow-x-auto pb-1">
                <div className="grid gap-3" style={gridStyle}>
                  {row.cells.map((cell) => (
                    <motion.div layout={!reduce} key={cell.partyId} className="min-w-0">
                      <span className="sr-only">{partyById[cell.partyId].shortName}: </span>
                      {cell.proposals.length === 0 ? (
                        <div className="hatch flex h-full min-h-20 flex-col justify-center rounded border border-dashed border-rule p-3">
                          <p className="text-sm text-ink-3">{cell.hiddenAsCoincidence.length ? "Coincidencia documentada (oculta)" : "Sin posición documentada"}</p>
                          <span className="mt-1 font-mono text-[0.62rem] text-ink-3 md:hidden">{partyById[cell.partyId].shortName}</span>
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {cell.proposals.map((p) => {
                            const src = sourceById[p.citations[0].sourceId];
                            const shared = p.positionKey && row.sharedKeys.includes(p.positionKey);
                            return (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => setOpenId(p.id)}
                                  className="group block w-full rounded border border-rule bg-paper p-3 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-ink"
                                >
                                  <span className="mb-1 block font-mono text-[0.62rem] text-ink-3 md:hidden">{partyById[cell.partyId].shortName}</span>
                                  <span className="block text-[0.95rem] leading-snug">{p.summary}</span>
                                  <span className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span className="cite-chip">{CYCLE_LABELS[p.cycle]}</span>
                                    <span className="cite-chip">p. {p.citations[0].pdfPage}</span>
                                    {src?.hostedByThirdParty && <span className="cite-chip">copia de tercero</span>}
                                    {shared && <span className="cite-chip border-accent text-accent">coincidencia</span>}
                                    <span className="ml-auto text-xs text-ink-3 opacity-0 transition-opacity group-hover:opacity-100">Ver fuente →</span>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </motion.div>
      </AnimatePresence>

      <Sheet open={!!open} onClose={() => setOpenId(null)} title="Ficha de la propuesta">
        {open && (
          <ProposalDetail
            proposal={open}
            source={sourceById[open.citations[0].sourceId]}
            party={partyById[open.partyId]}
            topic={topics.find((t) => t.id === open.topicId)!}
            related={proposals.filter((p) => p.partyId === open.partyId && p.topicId === open.topicId && p.id !== open.id).slice(0, 5)}
          />
        )}
      </Sheet>
    </div>
  );
}
