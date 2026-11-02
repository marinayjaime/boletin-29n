"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, HelpCircle, RotateCcw, SkipForward, Trash2 } from "lucide-react";
import type { Party, PolicyTopic, Proposal, QuizStatement, SourceDocument } from "@/lib/schema";
import { ANSWERS, MIN_COMPARABLE, RELATION_LABELS, clearAnswers, loadAnswers, relation, saveAnswers, topicCoincidence, type AnswerId, type Answers, type Relation } from "@/lib/quiz";
import { STANCE_LABELS } from "@/lib/labels";
import { partyVars } from "@/lib/party-theme";
import { Disclosure, PartyAvatar, TopicIcon } from "./ui";
import { Sheet } from "./sheet";
import { ProposalDetail } from "./proposal-detail";

type Stage = "intro" | "preguntas" | "revision" | "resultados";

const REL: Record<Relation, { glyph: string; color: string }> = {
  coincide: { glyph: "✓", color: "var(--yes)" },
  difiere: { glyph: "✕", color: "var(--no)" },
  matizada: { glyph: "≈", color: "var(--partial)" },
  sin_datos: { glyph: "·", color: "var(--abs)" },
  no_comparable: { glyph: "–", color: "var(--abs)" },
  sin_respuesta: { glyph: " ", color: "var(--surface-3)" },
};
const SCALE = ANSWERS.slice(0, 5);
const SCALE_STYLE = ["var(--yes)", "color-mix(in oklab, var(--yes) 55%, var(--surface))", "var(--surface-3)", "color-mix(in oklab, var(--no) 55%, var(--surface))", "var(--no)"];

export function BlindTest({ statements, parties, topics, proposals, sources }: { statements: QuizStatement[]; parties: Party[]; topics: PolicyTopic[]; proposals: Proposal[]; sources: SourceDocument[] }) {
  const reduce = useReducedMotion();
  const quizTopics = useMemo(() => [...new Set(statements.map((s) => s.topicId))], [statements]);
  const [stage, setStage] = useState<Stage>("intro");
  const [chosen, setChosen] = useState<string[]>(quizTopics);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [dir, setDir] = useState(1);
  const [detail, setDetail] = useState<{ st: QuizStatement; partyId: string } | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const a = loadAnswers();
    if (Object.keys(a).length) setAnswers(a);
  }, []);
  useEffect(() => saveAnswers(answers), [answers]);

  const list = useMemo(() => statements.filter((s) => chosen.includes(s.topicId)), [statements, chosen]);
  const st = list[Math.min(i, list.length - 1)];
  const answered = list.filter((s) => answers[s.id] && answers[s.id] !== "saltada").length;

  const go = (n: number) => {
    setDir(n > i ? 1 : -1);
    if (n >= list.length) setStage("revision");
    else setI(Math.max(0, n));
  };
  const answer = (id: AnswerId | "saltada") => {
    if (busy.current || !st) return;
    busy.current = true;
    setAnswers((a) => ({ ...a, [st.id]: id }));
    window.setTimeout(() => {
      go(i + 1);
      busy.current = false;
    }, reduce ? 0 : 180);
  };
  useEffect(() => {
    if (stage !== "preguntas") return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 6) answer(ANSWERS[n - 1].id);
      else if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key.toLowerCase() === "s") answer("saltada");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const reset = () => {
    clearAnswers();
    setAnswers({});
    setI(0);
    setStage("intro");
  };

  const pmap = Object.fromEntries(parties.map((p) => [p.id, p]));
  const smap = Object.fromEntries(sources.map((s) => [s.id, s]));
  const prmap = Object.fromEntries(proposals.map((p) => [p.id, p]));
  const tmap = Object.fromEntries(topics.map((t) => [t.id, t]));

  if (stage === "intro")
    return (
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-6 md:p-8">
          <p className="eyebrow">1 · Elige los temas</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {quizTopics.map((t) => {
              const on = chosen.includes(t);
              const n = statements.filter((s) => s.topicId === t).length;
              return (
                <button key={t} type="button" aria-pressed={on} className="chip" onClick={() => setChosen((c) => (on ? (c.length > 1 ? c.filter((x) => x !== t) : c) : [...c, t]))}>
                  <TopicIcon id={t} size={16} /> {tmap[t]?.short} <span className="opacity-60">{n}</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="mt-3 text-sm font-bold underline decoration-brand decoration-2 underline-offset-4" onClick={() => setChosen(quizTopics)}>
            Seleccionar todos
          </button>
          <p className="eyebrow mt-8">2 · Responde a ciegas</p>
          <p className="display mt-2 text-5xl">
            {list.length} <span className="text-ink-3">preguntas</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => setStage("preguntas")} className="btn btn-brand text-lg">
              {answered ? `Continuar (${answered} respondidas)` : "Empezar el test"} <ArrowRight size={18} aria-hidden />
            </button>
            {answered > 0 && (
              <>
                <button onClick={() => setStage("resultados")} className="btn btn-ghost">
                  Ver resultados
                </button>
                <button onClick={reset} className="btn btn-ghost">
                  <Trash2 size={16} aria-hidden /> Borrar mis respuestas
                </button>
              </>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-[24px] bg-ink p-6 text-bg">
            <p className="display text-3xl">Sin etiquetas.</p>
            <p className="mt-2 font-semibold opacity-80">No verás qué partido defiende cada idea hasta el final. Después comparas, tema a tema, con lo que dejaron escrito.</p>
          </div>
          <Disclosure summary="Privacidad">Las respuestas se guardan solo en esta pestaña del navegador (sessionStorage) y se borran al cerrarla. No se envían a ningún servidor.</Disclosure>
          <Disclosure summary="¿Cómo se construyen las posturas?">Cada postura enlaza a una propuesta citada literalmente. «Sin posición documentada» no significa oposición. Los programas 2026 no están publicados: se usan documentos anteriores.</Disclosure>
          <Disclosure summary="¿Me dirá a quién votar?">No. Solo describe coincidencias pregunta a pregunta y tema a tema. No hay ranking ni puntuación global.</Disclosure>
        </div>
      </div>
    );

  if (stage === "preguntas" && st)
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="num text-2xl">
            {i + 1}
            <span className="text-ink-3"> / {list.length}</span>
          </span>
          <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={list.length} aria-valuenow={i + 1} aria-label="Progreso">
            {list.map((s, k) => (
              <span key={s.id} className="h-2 flex-1 rounded-full transition-colors" style={{ background: k === i ? "var(--ink)" : answers[s.id] && answers[s.id] !== "saltada" ? "var(--brand)" : "var(--surface-3)" }} />
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={st.id}
            initial={reduce ? false : { opacity: 0, x: 60 * dir, rotate: 1.5 * dir }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -60 * dir, rotate: -1.5 * dir }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="card mt-6 p-6 md:p-10"
          >
            <span className="tag">
              <TopicIcon id={st.topicId} size={14} /> {tmap[st.topicId]?.short}
            </span>
            <h2 id="afirmacion" className="display mt-5 text-[2.1rem] md:text-[3.2rem]">
              {st.statement}
            </h2>
            <details className="mt-4 font-semibold text-ink-2">
              <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold">
                <HelpCircle size={16} aria-hidden /> Contexto
              </summary>
              <p className="mt-2">{st.context}</p>
            </details>
            <div role="radiogroup" aria-labelledby="afirmacion" className="mt-8 grid gap-2 md:grid-cols-5">
              {SCALE.map((a, k) => {
                const on = answers[st.id] === a.id;
                return (
                  <button
                    key={a.id}
                    role="radio"
                    aria-checked={on}
                    onClick={() => answer(a.id)}
                    className="flex min-h-[56px] items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left font-extrabold transition-transform active:scale-95 md:min-h-[110px] md:flex-col md:items-start md:justify-end"
                    style={{ background: on ? "var(--ink)" : SCALE_STYLE[k], color: on ? "var(--bg)" : k === 0 || k === 4 ? "#fff" : "var(--ink)", outline: on ? "3px solid var(--brand)" : undefined }}
                  >
                    <span aria-hidden className="text-xs opacity-70 md:order-first">
                      {k + 1}
                    </span>
                    {a.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button role="radio" aria-checked={answers[st.id] === "sin_info"} onClick={() => answer("sin_info")} className="chip">
                No tengo información suficiente
              </button>
              <button onClick={() => answer("saltada")} className="chip">
                <SkipForward size={15} aria-hidden /> Saltar
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="mt-5 flex items-center justify-between">
          <button onClick={() => go(i - 1)} disabled={i === 0} className="btn btn-ghost disabled:opacity-30">
            <ArrowLeft size={16} aria-hidden /> Anterior
          </button>
          <button onClick={() => go(i + 1)} className="btn btn-ghost">
            {i === list.length - 1 ? "Revisar" : "Siguiente"} <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    );

  if (stage === "revision")
    return (
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="display text-4xl md:text-5xl">Revisa tus respuestas</h2>
          <p className="num text-3xl">
            {answered}
            <span className="text-ink-3"> / {list.length}</span>
          </p>
        </div>
        <ol className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-2">
          {list.map((s, k) => {
            const a = answers[s.id];
            const idx = SCALE.findIndex((x) => x.id === a);
            return (
              <li key={s.id}>
                <button
                  onClick={() => {
                    setI(k);
                    setStage("preguntas");
                  }}
                  className="card flex w-full items-center gap-3 p-3 text-left hover:shadow-[var(--shadow-lg)]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-extrabold" style={{ background: idx >= 0 ? SCALE_STYLE[idx] : "var(--surface-2)", color: idx === 0 || idx === 4 ? "#fff" : "var(--ink)" }} aria-hidden>
                    {k + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{s.statement}</span>
                    <span className="block text-sm font-semibold text-ink-3">{a ? (a === "saltada" ? "Saltada" : ANSWERS.find((x) => x.id === a)?.label) : "Sin responder"}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="sticky bottom-[calc(80px_+_env(safe-area-inset-bottom))] z-20 -mx-4 mt-8 flex flex-wrap gap-3 bg-bg/90 px-4 py-3 backdrop-blur-xl lg:bottom-0">
          <button onClick={() => setStage("resultados")} className="btn btn-brand text-lg">
            Ver las posturas documentadas <ArrowRight size={18} aria-hidden />
          </button>
          <button onClick={reset} className="btn btn-ghost">
            <RotateCcw size={16} aria-hidden /> Borrar y empezar de nuevo
          </button>
        </div>
      </div>
    );

  const resultTopics = [...new Set(list.map((s) => s.topicId))];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="display text-4xl md:text-6xl">Lo que dejaron escrito</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setStage("revision")} className="btn btn-ghost">
            Cambiar respuestas
          </button>
          <button onClick={reset} className="btn btn-ghost">
            <Trash2 size={16} aria-hidden /> Borrar mis respuestas
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <Disclosure summary="¿Cómo se calcula el porcentaje?">
          Por tema y partido: <strong>respuestas que coinciden ÷ respuestas comparables</strong>. Son comparables las preguntas en las que dijiste estar de acuerdo o en desacuerdo y el partido tiene una postura documentada a favor o en contra. No cuentan las posturas matizadas o sin datos, ni tus respuestas «indiferente», «sin información» o saltadas. Solo se muestra con {MIN_COMPARABLE} o más respuestas comparables.
        </Disclosure>
        <Disclosure summary="Lo que este resultado no es">No mide compatibilidad política general ni indica a quién votar. Coincidir en unas preguntas no implica coincidir en el resto de un programa. No se suman temas ni se ordenan partidos.</Disclosure>
      </div>

      {resultTopics.map((tid) => {
        const sts = list.filter((s) => s.topicId === tid);
        return (
          <section key={tid} className="card mt-6 overflow-hidden" aria-labelledby={`t-${tid}`}>
            <div className="flex items-center gap-3 border-b border-line p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-brand">
                <TopicIcon id={tid} size={22} />
              </span>
              <h3 id={`t-${tid}`} className="display text-3xl">
                {tmap[tid]?.name}
              </h3>
            </div>
            <ul className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
              {parties.map((p) => {
                const c = topicCoincidence(statements, answers, tid, p.id);
                const v = partyVars(p.id);
                return (
                  <li key={p.id} className="rounded-2xl p-3" style={{ background: v.soft }}>
                    <p className="flex items-center gap-2 font-extrabold" style={{ color: v.strong }}>
                      <PartyAvatar party={p} size={28} ring={2} label={false} /> {p.shortName}
                    </p>
                    {c.pct !== null ? (
                      <>
                        <p className="num mt-2 text-4xl" style={{ color: v.strong }}>
                          {c.pct} %
                        </p>
                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface" role="img" aria-label={`${c.coincide} de ${c.comparable} respuestas comparables coinciden`}>
                          <motion.div className="h-full rounded-full" style={{ background: v.primary }} initial={{ width: 0 }} whileInView={{ width: `${c.pct}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} />
                        </div>
                        <p className="mt-1.5 text-xs font-bold text-ink-2">
                          {c.coincide} de {c.comparable} comparables coinciden
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-ink-3">
                        {c.comparable === 0 ? "Sin respuestas comparables" : `Solo ${c.comparable} comparable: insuficiente`}
                        {c.sinDatos > 0 ? ` · ${c.sinDatos} sin datos` : ""}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="overflow-x-auto px-5 pb-5">
              <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-y-1.5 text-sm">
                <caption className="sr-only">Comparación pregunta a pregunta en {tmap[tid]?.name}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-[38%] text-left font-extrabold text-ink-3">
                      Pregunta · tu respuesta
                    </th>
                    {parties.map((p) => (
                      <th key={p.id} scope="col" className="text-center font-extrabold" style={{ color: partyVars(p.id).strong }}>
                        {p.shortName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sts.map((s) => (
                    <tr key={s.id}>
                      <th scope="row" className="rounded-l-xl bg-surface-2 p-3 text-left font-bold">
                        {s.statement}
                        <span className="mt-1 block text-xs font-extrabold text-ink-3">{answers[s.id] && answers[s.id] !== "saltada" ? ANSWERS.find((a) => a.id === answers[s.id])?.label : "Sin responder"}</span>
                      </th>
                      {parties.map((p, k) => {
                        const pos = s.positions.find((x) => x.partyId === p.id)!;
                        const rel = relation(answers[s.id], pos.stance);
                        const has = pos.proposalIds.length > 0;
                        return (
                          <td key={p.id} className={`bg-surface-2 p-1.5 text-center ${k === parties.length - 1 ? "rounded-r-xl" : ""}`}>
                            <button
                              type="button"
                              disabled={!has}
                              onClick={() => setDetail({ st: s, partyId: p.id })}
                              className={`mx-auto flex w-full flex-col items-center gap-1 rounded-lg py-1.5 ${has ? "hover:bg-surface" : ""}`}
                              aria-label={`${p.shortName}: ${STANCE_LABELS[pos.stance].label}. ${RELATION_LABELS[rel]}.${has ? " Ver fuente." : ""}`}
                            >
                              <span className="grid h-8 w-8 place-items-center rounded-full text-base font-black text-white" style={{ background: REL[rel].color }} aria-hidden>
                                {REL[rel].glyph}
                              </span>
                              <span className="text-[0.7rem] font-bold text-ink-2">{STANCE_LABELS[pos.stance].short}</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold" aria-label="Leyenda">
        {(["coincide", "difiere", "matizada", "sin_datos", "no_comparable"] as Relation[]).map((r) => (
          <li key={r} className="flex items-center gap-1.5">
            <span className="grid h-5 w-5 place-items-center rounded-full text-[0.7rem] text-white" style={{ background: REL[r].color }} aria-hidden>
              {REL[r].glyph}
            </span>
            {RELATION_LABELS[r]}
          </li>
        ))}
      </ul>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title="Fuente de la postura" accent={detail ? partyVars(detail.partyId).primary : undefined}>
        {detail &&
          (() => {
            const pos = detail.st.positions.find((x) => x.partyId === detail.partyId)!;
            return (
              <div className="space-y-8">
                <div className="rounded-2xl bg-surface-2 p-4">
                  <p className="font-extrabold">{detail.st.statement}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-bold">
                    <Check size={16} aria-hidden /> {pmap[detail.partyId].shortName}: {STANCE_LABELS[pos.stance].label}
                  </p>
                  {pos.note && <p className="mt-1 text-sm font-semibold text-ink-2">{pos.note}</p>}
                </div>
                {pos.proposalIds.map((pid) => {
                  const pr = prmap[pid];
                  return pr ? <ProposalDetail key={pid} proposal={pr} source={smap[pr.citations[0].sourceId]} party={pmap[pr.partyId]} topic={tmap[pr.topicId]} related={[]} /> : null;
                })}
              </div>
            );
          })()}
      </Sheet>
    </div>
  );
}
