"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, HelpCircle, RotateCcw, SkipForward, Trash2 } from "lucide-react";
import type { Party, PolicyTopic, Proposal, QuizStatement, SourceDocument } from "@/lib/schema";
import { ANSWERS, clearAnswers, loadAnswers, saveAnswers, type AnswerId, type Answers } from "@/lib/quiz";
import { TestResults } from "./test-results";
import { Disclosure, TopicIcon } from "./ui";

type Stage = "intro" | "preguntas" | "revision" | "resultados";

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
  const busy = useRef(false);

  useEffect(() => {
    const a = loadAnswers();
    if (Object.keys(a).length) setAnswers(a);
  }, []);
  useEffect(() => saveAnswers(answers), [answers]);
  useEffect(() => {
    if (stage === "resultados" || stage === "revision") window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [stage, reduce]);

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
            <p className="mt-2 font-semibold opacity-80">No verás qué partido defiende cada idea hasta el final. Al final verás tus coincidencias con los cinco, tema a tema.</p>
          </div>
          <Disclosure summary="Privacidad">Las respuestas se guardan solo en esta pestaña del navegador (sessionStorage) y se borran al cerrarla. No se envían a ningún servidor.</Disclosure>
          <Disclosure summary="¿Cómo se construyen las posturas?">Cada postura enlaza a una propuesta citada literalmente. «Sin posición documentada» no significa oposición. Los programas 2026 no están publicados: se usan documentos anteriores.</Disclosure>
          <Disclosure summary="¿Me dirá a quién votar?">No. Muestra, para los cinco partidos por igual, cuántas de tus respuestas coinciden con sus posturas documentadas. No destaca a ninguno ni recomienda un voto.</Disclosure>
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
            Ver mi resultado <ArrowRight size={18} aria-hidden />
          </button>
          <button onClick={reset} className="btn btn-ghost">
            <RotateCcw size={16} aria-hidden /> Borrar y empezar de nuevo
          </button>
        </div>
      </div>
    );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="display text-4xl md:text-6xl">Tus coincidencias</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setStage("revision")} className="btn btn-ghost">
            Cambiar respuestas
          </button>
          <button onClick={reset} className="btn btn-ghost">
            <Trash2 size={16} aria-hidden /> Borrar mis respuestas
          </button>
        </div>
      </div>
      <TestResults list={list} answers={answers} parties={parties} topics={topics} proposals={proposals} sources={sources} />
    </div>
  );
}
