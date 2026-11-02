"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Party, PolicyTopic, Proposal, QuizStatement, SourceDocument } from "@/lib/schema";
import { ANSWERS, RELATION_LABELS, clearAnswers, loadAnswers, relation, saveAnswers, type AnswerId, type Answers, type Relation } from "@/lib/quiz";
import { STANCE_LABELS } from "@/lib/labels";
import { PartyMark } from "./party-mark";
import { Sheet } from "./sheet";
import { ProposalDetail } from "./proposal-detail";

type Stage = "intro" | "preguntas" | "revision" | "resultados";

const REL_STYLE: Record<Relation, { glyph: string; cls: string }> = {
  coincide: { glyph: "●", cls: "text-yes" },
  difiere: { glyph: "✕", cls: "text-no" },
  matizada: { glyph: "◐", cls: "text-ink-2" },
  sin_datos: { glyph: "○", cls: "text-ink-3" },
  no_comparable: { glyph: "—", cls: "text-ink-3" },
  sin_respuesta: { glyph: "·", cls: "text-ink-3" },
};

export function BlindTest({
  statements,
  parties,
  topics,
  proposals,
  sources,
}: {
  statements: QuizStatement[];
  parties: Party[];
  topics: PolicyTopic[];
  proposals: Proposal[];
  sources: SourceDocument[];
}) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>("intro");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [dir, setDir] = useState(1);
  const [detail, setDetail] = useState<{ st: QuizStatement; partyId: string } | null>(null);

  useEffect(() => {
    const a = loadAnswers();
    if (Object.keys(a).length) setAnswers(a);
  }, []);
  useEffect(() => saveAnswers(answers), [answers]);

  const answered = statements.filter((s) => answers[s.id] && answers[s.id] !== "saltada").length;
  const st = statements[i];

  const go = (n: number) => {
    setDir(n > i ? 1 : -1);
    if (n >= statements.length) setStage("revision");
    else setI(Math.max(0, n));
  };
  // evita que una pulsación durante la transición se aplique a la pregunta anterior
  const busy = useRef(false);
  const answer = (id: AnswerId | "saltada") => {
    if (busy.current) return;
    busy.current = true;
    setAnswers((a) => ({ ...a, [st.id]: id }));
    window.setTimeout(() => {
      go(i + 1);
      busy.current = false;
    }, reduce ? 0 : 160);
  };

  // atajos de teclado: 1-6 responden, ← → navegan, S salta
  useEffect(() => {
    if (stage !== "preguntas") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
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
  const byTopic = useMemo(() => {
    const m = new Map<string, QuizStatement[]>();
    for (const s of statements) m.set(s.topicId, [...(m.get(s.topicId) ?? []), s]);
    return [...m.entries()];
  }, [statements]);

  if (stage === "intro")
    return (
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-7">
          <ol className="space-y-5">
            {[
              ["Responde sin saber quién defiende qué", `${statements.length} afirmaciones redactadas de forma neutral sobre ${byTopic.length} temas. Puedes saltar cualquiera.`],
              ["Revisa tus respuestas", "Antes de ver nada, puedes volver atrás y cambiarlas."],
              ["Descubre las posturas documentadas", "Para cada afirmación verás qué ha dejado escrito cada partido, con su fuente. No hay ranking, ni puntuación global, ni recomendación de voto."],
            ].map(([t, d], k) => (
              <li key={t} className="flex gap-4">
                <span className="display text-4xl text-accent">{k + 1}</span>
                <div>
                  <p className="text-lg font-semibold">{t}</p>
                  <p className="text-ink-2">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <button onClick={() => setStage("preguntas")} className="rounded-full bg-ink px-6 py-3 text-paper hover:bg-accent">
              {answered ? `Continuar (${answered} respondidas)` : "Empezar el test"}
            </button>
            {answered > 0 && (
              <button onClick={reset} className="rounded-full border border-ink px-6 py-3">
                Borrar mis respuestas
              </button>
            )}
          </div>
        </div>
        <aside className="rounded border border-rule bg-paper-2 p-5 text-sm md:col-span-5">
          <p className="kicker">Privacidad</p>
          <p className="mt-2 leading-relaxed">
            Tus respuestas se guardan solo en la memoria de esta pestaña del navegador (<code className="font-mono text-xs">sessionStorage</code>) y se borran al
            cerrarla. No se envían a ningún servidor, no hay analítica y no se crean perfiles. Puedes borrarlas en cualquier momento.
          </p>
          <p className="kicker mt-5">Cómo se construyen las posturas</p>
          <p className="mt-2 leading-relaxed">
            Cada postura enlaza a una propuesta citada literalmente. «Sin posición documentada» significa que no hemos encontrado texto sobre esa
            cuestión, no que el partido se oponga. Los programas de 2026 aún no se han publicado: se usan documentos anteriores, identificados.
          </p>
        </aside>
      </div>
    );

  if (stage === "preguntas")
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between text-sm">
          <span className="font-mono">
            {i + 1} / {statements.length}
          </span>
          <span className="kicker">{tmap[st.topicId]?.name}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded bg-paper-3" role="progressbar" aria-valuemin={0} aria-valuemax={statements.length} aria-valuenow={i + 1} aria-label="Progreso del test">
          <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${((i + 1) / statements.length) * 100}%` }} />
        </div>
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={st.id}
            custom={dir}
            initial={reduce ? false : { opacity: 0, x: 40 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -40 * dir }}
            transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
            className="pt-10"
          >
            <h2 className="display text-[2rem] leading-tight md:text-5xl" id="afirmacion">
              {st.statement}
            </h2>
            <details className="mt-4 text-ink-2">
              <summary className="cursor-pointer text-sm underline decoration-rule underline-offset-4">Contexto para entender la afirmación</summary>
              <p className="mt-2 text-sm leading-relaxed">{st.context}</p>
            </details>
            <div role="radiogroup" aria-labelledby="afirmacion" className="mt-8 grid gap-2">
              {ANSWERS.map((a, k) => {
                const on = answers[st.id] === a.id;
                return (
                  <button
                    key={a.id}
                    role="radio"
                    aria-checked={on}
                    onClick={() => answer(a.id)}
                    className={`flex items-center justify-between rounded border px-4 py-3.5 text-left transition-colors ${on ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink"} ${k === 2 || k === 5 ? "mt-0" : ""}`}
                  >
                    <span>{a.label}</span>
                    <span aria-hidden className={`font-mono text-xs ${on ? "text-paper/70" : "text-ink-3"}`}>{k + 1}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="mt-6 flex items-center justify-between gap-2 text-sm">
          <button onClick={() => go(i - 1)} disabled={i === 0} className="rounded-full border border-rule px-4 py-2 disabled:opacity-30">
            ← Anterior
          </button>
          <button onClick={() => answer("saltada")} className="underline decoration-rule underline-offset-4">
            Saltar
          </button>
          <button onClick={() => go(i + 1)} className="rounded-full border border-rule px-4 py-2">
            {i === statements.length - 1 ? "Revisar →" : "Siguiente →"}
          </button>
        </div>
        <p className="mt-6 text-center text-xs text-ink-3">Atajos: teclas 1–6 para responder, ← → para moverte, S para saltar.</p>
      </div>
    );

  if (stage === "revision")
    return (
      <div className="mx-auto max-w-4xl">
        <h2 className="display text-4xl">Revisa tus respuestas</h2>
        <p className="mt-2 text-ink-2">
          Has respondido {answered} de {statements.length}. Pulsa una afirmación para cambiarla.
        </p>
        <ol className="mt-6 divide-y divide-rule border-y border-rule">
          {statements.map((s, k) => {
            const a = answers[s.id];
            return (
              <li key={s.id}>
                <button
                  onClick={() => {
                    setI(k);
                    setStage("preguntas");
                  }}
                  className="grid w-full gap-1 py-3 text-left hover:bg-paper-2 md:grid-cols-[2rem_1fr_14rem]"
                >
                  <span className="font-mono text-xs text-ink-3">{k + 1}</span>
                  <span>{s.statement}</span>
                  <span className={`text-sm ${a && a !== "saltada" ? "" : "text-ink-3"}`}>{a ? (a === "saltada" ? "Saltada" : ANSWERS.find((x) => x.id === a)?.label) : "Sin responder"}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={() => setStage("resultados")} className="rounded-full bg-ink px-6 py-3 text-paper hover:bg-accent">
            Ver las posturas documentadas
          </button>
          <button onClick={reset} className="rounded-full border border-ink px-6 py-3">
            Borrar y empezar de nuevo
          </button>
        </div>
      </div>
    );

  // resultados
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="display text-4xl md:text-5xl">Lo que dejaron escrito</h2>
          <p className="mt-2 max-w-2xl text-ink-2">
            Compara tus respuestas con las posturas documentadas, afirmación a afirmación. No sumamos coincidencias ni ordenamos partidos: un solo tema
            puede pesar para ti más que todos los demás.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStage("revision")} className="rounded-full border border-rule px-4 py-2 text-sm">
            Cambiar respuestas
          </button>
          <button onClick={reset} className="rounded-full border border-ink px-4 py-2 text-sm">
            Borrar mis respuestas
          </button>
        </div>
      </div>

      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Leyenda">
        {(["coincide", "difiere", "matizada", "sin_datos", "no_comparable"] as Relation[]).map((r) => (
          <li key={r} className="flex items-center gap-1.5">
            <span className={`${REL_STYLE[r].cls} text-base`} aria-hidden>
              {REL_STYLE[r].glyph}
            </span>
            {RELATION_LABELS[r]}
          </li>
        ))}
      </ul>

      {byTopic.map(([tid, sts], ti) => (
        <motion.section
          key={tid}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, delay: reduce ? 0 : Math.min(ti * 0.03, 0.2) }}
          className="mt-10"
          aria-labelledby={`t-${tid}`}
        >
          <h3 id={`t-${tid}`} className="display border-b-2 border-ink pb-2 text-2xl">
            {tmap[tid]?.name}
          </h3>
          <div className="lane overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th scope="col" className="w-[38%] py-2 pr-4 font-normal text-ink-3">
                    Afirmación · tu respuesta
                  </th>
                  {parties.map((p) => (
                    <th key={p.id} scope="col" className="py-2 font-normal">
                      <span className="flex items-center gap-1.5">
                        <PartyMark monogram={p.monogram} size={22} />
                        {p.shortName}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sts.map((s) => (
                  <tr key={s.id} className="border-t border-rule align-top">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <span className="block">{s.statement}</span>
                      <span className="mt-1 block font-mono text-xs text-accent">
                        {answers[s.id] && answers[s.id] !== "saltada" ? ANSWERS.find((a) => a.id === answers[s.id])?.label : "No respondida"}
                      </span>
                    </th>
                    {parties.map((p) => {
                      const pos = s.positions.find((x) => x.partyId === p.id)!;
                      const rel = relation(answers[s.id], pos.stance);
                      const has = pos.proposalIds.length > 0;
                      return (
                        <td key={p.id} className="py-3 pr-2">
                          <button
                            type="button"
                            disabled={!has}
                            onClick={() => setDetail({ st: s, partyId: p.id })}
                            className={`w-full rounded p-2 text-left ${has ? "hover:bg-paper-2" : "cursor-default"} ${pos.stance === "sin_posicion_documentada" ? "hatch" : ""}`}
                            aria-label={`${p.shortName}: ${STANCE_LABELS[pos.stance].label}. ${RELATION_LABELS[rel]}.${has ? " Ver fuente." : ""}`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className={`${REL_STYLE[rel].cls} text-base`} aria-hidden>
                                {REL_STYLE[rel].glyph}
                              </span>
                              <span className="text-xs">{STANCE_LABELS[pos.stance].short}</span>
                            </span>
                            {pos.note && <span className="mt-1 block text-[0.7rem] leading-snug text-ink-3">{pos.note}</span>}
                            {has && <span className="mt-1 block text-[0.7rem] text-ink-3 underline underline-offset-2">Fuente</span>}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>
      ))}

      <Sheet open={!!detail} onClose={() => setDetail(null)} title="Fuente de la postura">
        {detail &&
          (() => {
            const pos = detail.st.positions.find((x) => x.partyId === detail.partyId)!;
            return (
              <div className="space-y-10">
                <div>
                  <p className="kicker">Afirmación</p>
                  <p className="display mt-1 text-xl">{detail.st.statement}</p>
                  <p className="mt-2 text-sm">
                    <strong>{pmap[detail.partyId].shortName}:</strong> {STANCE_LABELS[pos.stance].label}
                    {pos.note ? ` — ${pos.note}` : ""}
                  </p>
                </div>
                {pos.proposalIds.map((pid) => {
                  const pr = prmap[pid];
                  if (!pr) return null;
                  return <ProposalDetail key={pid} proposal={pr} source={smap[pr.citations[0].sourceId]} party={pmap[pr.partyId]} topic={tmap[pr.topicId]} related={[]} />;
                })}
              </div>
            );
          })()}
      </Sheet>
    </div>
  );
}
