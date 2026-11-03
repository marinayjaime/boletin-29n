"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { Party, PolicyTopic, Proposal, QuizStatement, SourceDocument } from "@/lib/schema";
import { ANSWERS, MIN_COMPARABLE, MIN_OVERALL, SMALL_BASE, RELATION_LABELS, overallCoincidence, relation, topicCoincidence, type Answers, type Relation } from "@/lib/quiz";
import { STANCE_LABELS } from "@/lib/labels";
import { partyVars } from "@/lib/party-theme";
import { Disclosure, PartyAvatar, TopicIcon } from "./ui";
import { Sheet } from "./sheet";
import { ProposalDetail } from "./proposal-detail";


const REL: Record<Relation, { glyph: string; color: string }> = {
  coincide: { glyph: "✓", color: "var(--yes)" },
  difiere: { glyph: "✕", color: "var(--no)" },
  matizada: { glyph: "≈", color: "var(--partial)" },
  sin_datos: { glyph: "·", color: "var(--abs)" },
  no_comparable: { glyph: "–", color: "var(--abs)" },
  sin_respuesta: { glyph: " ", color: "var(--surface-3)" },
};
const DIRECTIONAL = new Set(["muy_acuerdo", "acuerdo", "desacuerdo", "muy_desacuerdo"]);

/** Un cuadrado por cada respuesta tuya con opinión: el tamaño de la base se ve a simple vista. */
function Strip({ rels, partyId }: { rels: Relation[]; partyId: string }) {
  const v = partyVars(partyId);
  return (
    <span className="flex flex-wrap gap-[3px]" aria-hidden>
      {rels.map((r, k) => (
        <span
          key={k}
          className={`h-3 w-3 rounded-[3px] ${r === "matizada" || r === "sin_datos" || r === "no_comparable" ? "hatch" : ""}`}
          style={
            r === "coincide"
              ? { background: v.primary }
              : r === "difiere"
                ? { boxShadow: `inset 0 0 0 2px ${v.primary}`, background: "var(--surface)" }
                : { background: "var(--surface-3)" }
          }
        />
      ))}
    </span>
  );
}

export function TestResults({
  list,
  answers,
  parties,
  topics,
  proposals,
  sources,
}: {
  list: QuizStatement[];
  answers: Answers;
  parties: Party[];
  topics: PolicyTopic[];
  proposals: Proposal[];
  sources: SourceDocument[];
}) {
  const [open, setOpen] = useState<{ partyId: string; topicId?: string } | null>(null);
  const tmap = Object.fromEntries(topics.map((t) => [t.id, t]));
  const prmap = Object.fromEntries(proposals.map((p) => [p.id, p]));
  const smap = Object.fromEntries(sources.map((s) => [s.id, s]));
  const pmap = Object.fromEntries(parties.map((p) => [p.id, p]));
  const resultTopics = useMemo(() => [...new Set(list.map((s) => s.topicId))], [list]);
  const directional = list.filter((s) => DIRECTIONAL.has(answers[s.id] ?? ""));
  const overall = parties.map((p) => ({
    party: p,
    c: overallCoincidence(list, answers, p.id),
    rels: directional.map((s) => relation(answers[s.id], s.positions.find((x) => x.partyId === p.id)?.stance ?? "sin_posicion_documentada")),
  }));
  const bases = overall.map((o) => o.c.comparable);
  const uneven = Math.max(...bases) - Math.min(...bases) >= 3;

  return (
    <div>
      <p className="mt-2 max-w-2xl font-semibold text-ink-2">
        Cuántas de tus respuestas coinciden con las posturas documentadas de cada partido. Los cinco aparecen siempre, en orden alfabético.
      </p>

      {directional.length === 0 ? (
        <p className="card mt-6 p-6 font-bold">No has respondido ninguna pregunta con «de acuerdo» o «en desacuerdo»: no hay coincidencias que mostrar.</p>
      ) : (
        <section className="mt-6" aria-labelledby="global">
          <h3 id="global" className="eyebrow mb-3">
            Coincidencia global · base: tus {directional.length} respuestas con opinión
          </h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {overall.map(({ party: p, c, rels }, k) => {
              const v = partyVars(p.id);
              const small = c.comparable < SMALL_BASE;
              return (
                <motion.li key={p.id} data-party={p.shortName} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.06 }} className="card flex flex-col overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3" style={{ background: v.primary, color: v.on }}>
                    <span className="rounded-full bg-white/90 p-0.5">
                      <PartyAvatar party={p} size={40} ring={0} label={false} />
                    </span>
                    <span className="min-w-0 font-extrabold leading-tight">{p.shortName}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    {c.pct !== null ? (
                      <p className="num text-5xl" style={{ color: v.strong }}>
                        {c.pct}
                        <span className="text-2xl"> %</span>
                      </p>
                    ) : (
                      <p className="num text-5xl text-ink-3" aria-label="Sin porcentaje">
                        —
                      </p>
                    )}
                    <p className="mt-1 text-sm font-bold">
                      {c.coincide} de {c.comparable} comparables
                    </p>
                    {c.pct === null ? (
                      <p className="mt-1 text-xs font-bold text-ink-3">Menos de {MIN_OVERALL} comparables: sin porcentaje</p>
                    ) : small ? (
                      <p className="mt-1 flex items-center gap-1 text-xs font-bold text-partial-ink">
                        <AlertTriangle size={13} aria-hidden /> Base pequeña
                      </p>
                    ) : null}
                    <div className="mt-3" role="img" aria-label={`${p.shortName}: ${c.coincide} coinciden, ${c.difiere} difieren, ${c.matizada + c.sinDatos} sin postura comparable, de ${rels.length} respuestas con opinión`}>
                      <Strip rels={rels} partyId={p.id} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-ink-3">{c.matizada + c.sinDatos} sin información suficiente</p>
                    <button type="button" onClick={() => setOpen({ partyId: p.id })} className="mt-auto flex items-center gap-1 pt-3 text-sm font-extrabold" style={{ color: v.strong }}>
                      Ver respuestas y fuentes <ChevronRight size={15} aria-hidden />
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </ul>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-ink-2" aria-label="Leyenda">
            <li className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] bg-ink" aria-hidden /> Coincide
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] shadow-[inset_0_0_0_2px_var(--ink)]" aria-hidden /> Difiere
            </li>
            <li className="flex items-center gap-1.5">
              <span className="hatch h-3 w-3 rounded-[3px] bg-surface-3" aria-hidden /> Sin información suficiente (no cuenta)
            </li>
          </ul>
          {uneven && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-brand-soft p-3 text-sm font-bold">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
              Las bases son distintas (de {Math.min(...bases)} a {Math.max(...bases)} respuestas comparables): un porcentaje sobre pocas respuestas es menos sólido que uno sobre muchas.
            </p>
          )}
        </section>
      )}

      <section className="card mt-6 p-4 md:p-6" aria-labelledby="por-tema">
        <h3 id="por-tema" className="display text-2xl md:text-3xl">
          Por tema
        </h3>
        <p className="mt-1 text-sm font-semibold text-ink-3">Coinciden / comparables. Pulsa una casilla para ver las preguntas y las fuentes.</p>
        <div className="mt-4 grid grid-cols-5 gap-1.5 md:grid-cols-[minmax(150px,1.3fr)_repeat(5,1fr)]" role="table" aria-label="Coincidencias por tema y partido">
          <div role="row" className="contents">
            <span role="columnheader" className="hidden md:block" />
            {parties.map((p) => (
              <span role="columnheader" key={p.id} className="flex flex-col items-center gap-1 pb-1 text-center text-[0.7rem] font-extrabold md:text-xs" style={{ color: partyVars(p.id).strong }}>
                <PartyAvatar party={p} size={30} ring={2} label={false} />
                {p.shortName}
              </span>
            ))}
          </div>
          {resultTopics.map((tid) => (
            <div role="row" key={tid} className="contents">
              <span role="rowheader" className="col-span-5 mt-2 flex items-center gap-2 text-sm font-extrabold md:col-span-1 md:mt-0">
                <TopicIcon id={tid} size={16} /> {tmap[tid]?.short}
              </span>
              {parties.map((p) => {
                const c = topicCoincidence(list, answers, tid, p.id);
                const v = partyVars(p.id);
                const share = c.comparable ? c.coincide / c.comparable : 0;
                return (
                  <button
                    role="cell"
                    key={p.id}
                    type="button"
                    onClick={() => setOpen({ partyId: p.id, topicId: tid })}
                    className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl bg-surface-2 p-1.5 text-center transition hover:ring-2"
                    style={{ ["--tw-ring-color" as string]: v.primary }}
                    aria-label={`${tmap[tid]?.short}, ${p.shortName}: ${c.coincide} de ${c.comparable} comparables coinciden${c.pct !== null ? ` (${c.pct} %)` : ""}; ${c.matizada + c.sinDatos} sin información suficiente. Ver preguntas.`}
                  >
                    {c.comparable ? (
                      <>
                        <span className="num text-lg leading-none text-ink md:text-xl">
                          {c.coincide}/{c.comparable}
                        </span>
                        <span className="flex h-2 w-full max-w-[72px] overflow-hidden rounded-full bg-surface" aria-hidden>
                          <span className="h-full" style={{ width: `${share * 100}%`, background: v.primary }} />
                        </span>
                        {c.pct !== null ? <span className="text-[0.7rem] font-extrabold text-ink-2">{c.pct} %</span> : <span className="hidden text-[0.7rem] font-extrabold text-ink-3 md:inline">base mínima</span>}
                      </>
                    ) : (
                      <span className="num text-lg text-ink-3" aria-hidden>
                        —
                      </span>
                    )}
                    {c.matizada + c.sinDatos > 0 && <span className="text-[0.65rem] font-bold text-ink-3">+{c.matizada + c.sinDatos} s/i</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold text-ink-3">
          «—»: ninguna respuesta comparable. «s/i»: preguntas sin información suficiente (postura matizada o no documentada). El porcentaje por tema solo aparece con {MIN_COMPARABLE} o más comparables.
        </p>
      </section>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <Disclosure summary="¿Cómo se calcula?">
          Para cada partido: <strong>respuestas que coinciden ÷ respuestas comparables</strong>. Una respuesta es comparable si dijiste estar de acuerdo o en desacuerdo y el partido tiene una postura documentada a favor o en contra. Las posturas matizadas o sin documentar no cuentan, ni tus respuestas «indiferente», «sin información» o saltadas. El global exige al menos {MIN_OVERALL} comparables; por tema, {MIN_COMPARABLE}.
        </Disclosure>
        <Disclosure summary="Límites de este resultado">
          No es una recomendación de voto ni una clasificación de partidos. Describe coincidencias con posturas documentadas en {list.length} preguntas, no con programas completos. Cada partido tiene una base distinta: un 100 % sobre 4 respuestas dice mucho menos que un 70 % sobre 20. Las posturas se prepararon a partir de programas anteriores a 2026.
        </Disclosure>
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? `${pmap[open.partyId]?.shortName}${open.topicId ? ` · ${tmap[open.topicId]?.short}` : ""}` : ""} accent={open ? partyVars(open.partyId).primary : undefined}>
        {open && (
          <ol className="space-y-3">
            {list
              .filter((s) => !open.topicId || s.topicId === open.topicId)
              .map((s) => {
                const pos = s.positions.find((x) => x.partyId === open.partyId);
                if (!pos) return null;
                const rel = relation(answers[s.id], pos.stance);
                const mine = answers[s.id] && answers[s.id] !== "saltada" ? ANSWERS.find((a) => a.id === answers[s.id])?.label : "Sin responder";
                return (
                  <li key={s.id} className="rounded-2xl bg-surface-2 p-4">
                    <p className="flex items-start gap-3 font-extrabold">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-black text-white" style={{ background: REL[rel].color }} aria-hidden>
                        {REL[rel].glyph}
                      </span>
                      {s.statement}
                    </p>
                    <dl className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs font-extrabold text-ink-3">Tú</dt>
                        <dd className="font-bold">{mine}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-extrabold text-ink-3">{pmap[open.partyId]?.shortName}</dt>
                        <dd className="font-bold">{STANCE_LABELS[pos.stance].short}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-extrabold text-ink-3">Resultado</dt>
                        <dd className="font-bold">{RELATION_LABELS[rel]}</dd>
                      </div>
                    </dl>
                    {pos.note && <p className="mt-2 text-sm font-semibold text-ink-2">{pos.note}</p>}
                    {pos.proposalIds.length > 0 && (
                      <Disclosure summary={`Fuente${pos.proposalIds.length > 1 ? "s" : ""} (${pos.proposalIds.length})`} className="mt-3 bg-surface">
                        <div className="space-y-6">
                          {pos.proposalIds.map((pid) => {
                            const pr = prmap[pid];
                            return pr ? <ProposalDetail key={pid} proposal={pr} source={smap[pr.citations[0].sourceId]} party={pmap[pr.partyId]} topic={tmap[pr.topicId]} related={[]} /> : null;
                          })}
                        </div>
                      </Disclosure>
                    )}
                  </li>
                );
              })}
          </ol>
        )}
      </Sheet>
    </div>
  );
}
