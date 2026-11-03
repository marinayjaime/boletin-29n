"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, FileCheck2, Gavel } from "lucide-react";
import type { HistoricalPromise, Party, PolicyTopic, SourceDocument } from "@/lib/schema";
import { formatDate, formatShortDate } from "@/lib/format";
import { partyVars } from "@/lib/party-theme";
import { SourceLinks } from "./proposal-detail";
import { Disclosure, STATUS_STYLE, StatusBadge, TopicIcon } from "./ui";
import { Sheet } from "./sheet";
import { PROMISE_STATUS } from "@/lib/labels";

type Status = HistoricalPromise["assessment"]["status"];
const ATTR: Record<HistoricalPromise["attribution"], string> = {
  partido: "Compromiso de partido",
  gobierno_coalicion: "Partido en un Gobierno de coalición",
  partido_en_oposicion: "Partido en la oposición",
};
const ORDER: Status[] = ["cumplido", "cumplido_parcial", "en_tramitacion", "no_cumplido", "no_verificable"];
type Origin = HistoricalPromise["origin"];
const ORIGIN: Record<Origin, { label: string; short: string; first: string }> = {
  programa: { label: "Programa electoral del PSOE", short: "Programa", first: "Compromiso publicado en el programa" },
  declaracion: { label: "Pedro Sánchez · discurso de investidura", short: "Sánchez", first: "Anuncio de Pedro Sánchez en el Congreso" },
  acuerdo_gobierno: { label: "Acuerdo del Gobierno de coalición", short: "Coalición", first: "Compromiso del acuerdo de Gobierno" },
};
/** Los tres documentos del PSOE de 2023 que se distinguen. Una ficha puede aparecer en varios. */
const DOCS = [
  { id: "psoe-programa-2023", key: "P", label: "Programa del PSOE", date: "jul. 2023" },
  { id: "acuerdo-psoe-sumar-2023", key: "A", label: "Acuerdo PSOE–Sumar", date: "oct. 2023" },
  { id: "congreso-ds-15-pl-7", key: "S", label: "Sánchez en la investidura", date: "nov. 2023" },
] as const;
type DocId = (typeof DOCS)[number]["id"];
const docsOf = (p: HistoricalPromise) => new Set([p.citation.sourceId, ...(p.alsoIn ?? []).map((c) => c.sourceId)]);
const inPsoe2023 = (p: HistoricalPromise) => DOCS.some((d) => docsOf(p).has(d.id));

function DocDots({ p }: { p: HistoricalPromise }) {
  const has = docsOf(p);
  return (
    <span className="flex gap-1" aria-label={`Aparece en: ${DOCS.filter((d) => has.has(d.id)).map((d) => d.label).join(", ")}`}>
      {DOCS.map((d) => (
        <span key={d.id} title={d.label} aria-hidden className={`grid h-6 w-6 place-items-center rounded-full text-[0.65rem] font-black ${has.has(d.id) ? "bg-ink text-bg" : "bg-surface-2 text-ink-3 line-through"}`}>
          {d.key}
        </span>
      ))}
    </span>
  );
}

const REVIEW: Record<HistoricalPromise["assessment"]["review"]["status"], { label: string; tone: string }> = {
  pendiente: { label: "Pendiente de revisión humana", tone: "var(--partial-ink)" },
  revisada: { label: "Revisada por una persona", tone: "var(--yes-ink)" },
  corregida: { label: "Corregida en revisión humana", tone: "var(--yes-ink)" },
};

const NATURE: Record<HistoricalPromise["nature"], string> = {
  legislativa: "Exige aprobar una ley",
  ejecutiva: "Medida del Gobierno (decreto, plan o presupuesto)",
  resultado: "Resultado medible",
  internacional: "Acción internacional",
};

function Donut({ counts, total, label }: { counts: Record<Status, number>; total: number; label: string }) {
  let acc = 0;
  const R = 46;
  const C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 120 120" className="h-40 w-40 shrink-0" role="img" aria-label={ORDER.filter((s) => counts[s]).map((s) => `${counts[s]} ${PROMISE_STATUS[s].label}`).join(", ")}>
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="16" />
      {ORDER.filter((s) => counts[s]).map((s) => {
        const len = (counts[s] / total) * C;
        const el = (
          <motion.circle
            key={s}
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={STATUS_STYLE[s].color}
            strokeWidth="16"
            strokeDashoffset={-acc}
            transform="rotate(-90 60 60)"
            initial={{ strokeDasharray: `0 ${C}` }}
            whileInView={{ strokeDasharray: `${len} ${C - len}` }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
          />
        );
        acc += len;
        return el;
      })}
      <text x="60" y="60" textAnchor="middle" fontSize="28" fontWeight="800" fill="var(--ink)">
        {total}
      </text>
      <text x="60" y="76" textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--ink-3)">
        {label}
      </text>
    </svg>
  );
}

function Evidence({ p, sources, parties, topics }: { p: HistoricalPromise; sources: Record<string, SourceDocument>; parties: Record<string, Party>; topics: Record<string, PolicyTopic> }) {
  const cites = [p.citation, ...(p.alsoIn ?? [])];
  const rv = p.assessment.review;
  const v = partyVars(p.partyIds[0]);
  const docDates: Record<string, string> = { "psoe-programa-2023": "2023-07-07", "acuerdo-psoe-sumar-2023": "2023-10-24", "congreso-ds-15-pl-7": "2023-11-15" };
  const firsts = cites.map((c) => ({ date: docDates[c.sourceId] ?? p.promisedAt, text: `Compromiso en: ${DOCS.find((d) => d.id === c.sourceId)?.label ?? sources[c.sourceId]?.title ?? ORIGIN[p.origin].first}`, url: "", kind: "promesa" as const }));
  const timeline = [...firsts, ...p.assessment.officialActions.map((a) => ({ ...a, kind: "accion" as const }))].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <article className="space-y-6">
      <header className="rounded-[24px] p-5" style={{ background: v.primary, color: v.on }}>
        <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
          <TopicIcon id={p.topicId} size={16} /> {topics[p.topicId]?.short} · {p.partyIds.map((x) => parties[x]?.shortName).join(", ")} · Leg. {p.legislature}
        </p>
        <h2 className="display mt-3 text-3xl">{p.promise}</h2>
        <p className="mt-2 text-sm font-bold">
          {inPsoe2023(p) ? NATURE[p.nature] : ATTR[p.attribution]}
          {p.government ? ` · ${p.government}` : ""}
        </p>
      </header>
      <StatusBadge status={p.assessment.status} long={PROMISE_STATUS[p.assessment.status].label} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-surface p-4">
          <p className="eyebrow">Lo prometido {cites.length > 1 ? `· en ${cites.length} documentos` : ""}</p>
          <ul className="mt-2 space-y-3">
            {cites.map((c, k) => (
              <li key={k}>
                <p className="text-xs font-extrabold" style={{ color: v.strong }}>
                  {DOCS.find((d) => d.id === c.sourceId)?.label ?? sources[c.sourceId]?.title} · pág. {c.pdfPage}
                </p>
                <p className="font-semibold">«{c.quote}»</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl p-4" style={{ background: `color-mix(in oklab, ${STATUS_STYLE[p.assessment.status].color} 12%, var(--surface))` }}>
          <p className="eyebrow">Lo que consta</p>
          <p className="mt-2 font-semibold">{p.assessment.outcome}</p>
        </div>
      </div>

      <section aria-label="Línea temporal">
        <p className="eyebrow mb-3">Acciones oficiales</p>
        {p.assessment.officialActions.length === 0 && (
          <p className="mb-3 rounded-2xl bg-surface-2 p-3 text-sm font-semibold">
            {p.nature === "legislativa" && p.assessment.status === "no_cumplido" ? "Evidencia negativa: ninguna norma con este objeto en el registro completo del BOE de la legislatura." : "No se han localizado acciones oficiales con las fuentes revisadas."}
          </p>
        )}
        <ol className="relative ml-3 border-l-2 border-line">
          {timeline.map((a, k) => (
            <li key={k} className="relative pb-5 pl-6">
              <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-bg" style={{ background: a.kind === "promesa" ? v.primary : "var(--ink)" }} aria-hidden />
              <p className="text-xs font-extrabold text-ink-3">{formatShortDate(a.date)}</p>
              <p className="font-semibold">{a.text}</p>
              {a.url && (
                <a href={a.url} target="_blank" rel="noreferrer" className="text-sm font-bold underline decoration-brand decoration-2 underline-offset-2">
                  {a.url.includes("boe.es") ? "BOE" : "Congreso"} ↗
                </a>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className="space-y-2">
        <Disclosure summary="Criterio de evaluación">{p.assessment.criterion}</Disclosure>
        <Disclosure summary="Límites de la evaluación">{p.assessment.limits}</Disclosure>
        <Disclosure summary={`Qué se ha comprobado (${p.assessment.checks.length})`}>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {p.assessment.checks.map((c, k) => (
              <li key={k}>{c}</li>
            ))}
          </ul>
        </Disclosure>
        <Disclosure summary={`Documento${cites.length > 1 ? "s" : ""} del compromiso`}>
          <div className="space-y-4">
            {cites.map((c, k) => (sources[c.sourceId] ? <SourceLinks key={k} source={sources[c.sourceId]} page={c.pdfPage} /> : null))}
          </div>
        </Disclosure>
      </div>
      <div className="rounded-2xl bg-surface-2 p-4 text-sm">
        <p className="font-extrabold" style={{ color: REVIEW[rv.status].tone }}>
          {REVIEW[rv.status].label}
        </p>
        <p className="mt-1 font-semibold text-ink-2">
          Preparada por {rv.preparedBy} el {formatDate(rv.preparedAt)}.
          {rv.reviewedBy && rv.reviewedAt ? ` Revisada por ${rv.reviewedBy} el ${formatDate(rv.reviewedAt)}.` : " Nadie la ha revisado todavía."}
          {rv.notes ? ` ${rv.notes}` : ""}
        </p>
      </div>
    </article>
  );
}

export function PromisesBoard({
  promises,
  parties,
  topics,
  sources,
  coverage,
  boeCount,
  rdCount,
}: {
  promises: HistoricalPromise[];
  parties: Party[];
  topics: PolicyTopic[];
  sources: SourceDocument[];
  coverage: { futureCommitments: number; legislativeCommitments: number; method: string; legislativeMethod: string; periodEnd: string };
  boeCount: number;
  rdCount: number;
}) {
  const [tab, setTab] = useState<"psoe" | "otras">("psoe");
  const [status, setStatus] = useState<Status | "">("");
  const [topic, setTopic] = useState("");
  const [party, setParty] = useState("");
  const [origin, setOrigin] = useState<DocId | "">("");
  const [open, setOpen] = useState<string | null>(null);
  const pmap = Object.fromEntries(parties.map((p) => [p.id, p]));
  const tmap = Object.fromEntries(topics.map((t) => [t.id, t]));
  const smap = Object.fromEntries(sources.map((s) => [s.id, s]));

  const psoe = promises.filter(inPsoe2023);
  const others = promises.filter((p) => !inPsoe2023(p));
  const reviewed = psoe.filter((p) => p.assessment.review.status !== "pendiente").length;
  const base = tab === "psoe" ? psoe : others;
  const list = useMemo(() => base.filter((p) => (!status || p.assessment.status === status) && (!topic || p.topicId === topic) && (!party || p.partyIds.includes(party)) && (!origin || docsOf(p).has(origin))), [base, status, topic, party, origin]);
  const scope = origin ? psoe.filter((p) => docsOf(p).has(origin)) : psoe;
  const counts = Object.fromEntries(ORDER.map((s) => [s, scope.filter((p) => p.assessment.status === s).length])) as Record<Status, number>;
  const laws = scope.flatMap((p) => p.assessment.officialActions.filter((a) => a.url.includes("boe.es")).map((a) => ({ ...a, p }))).sort((a, b) => a.date.localeCompare(b.date));
  const current = promises.find((p) => p.id === open);

  return (
    <div>
      <div role="tablist" className="inline-flex flex-wrap rounded-[28px] bg-surface p-1.5 shadow-[inset_0_0_0_1.5px_var(--line)]">
        {(
          [
            ["psoe", "Las promesas de 2023: ¿qué se cumplió?"],
            ["otras", "Otras fichas"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => {
              setTab(k);
              setStatus("");
              setTopic("");
              setParty("");
              setOrigin("");
            }}
            className={`rounded-full px-5 py-3 text-sm font-extrabold md:text-base ${tab === k ? "bg-ink text-bg" : "text-ink-2"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          {tab === "psoe" && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4" role="group" aria-label="Documento de origen">
                {[{ id: "" as const, key: "∑", label: "Todas", date: "sin duplicados" }, ...DOCS].map((d) => {
                  const n = d.id ? psoe.filter((p) => docsOf(p).has(d.id)).length : psoe.length;
                  const on = origin === d.id;
                  return (
                    <button key={d.key} type="button" aria-pressed={on} onClick={() => setOrigin(d.id)} className={`flex items-center gap-3 rounded-[20px] p-3 text-left transition ${on ? "bg-ink text-bg" : "bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] hover:bg-surface-2"}`}>
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black ${on ? "bg-brand text-brand-ink" : "bg-surface-2"}`} aria-hidden>
                        {d.key}
                      </span>
                      <span className="min-w-0">
                        <span className="num block text-2xl leading-none">{n}</span>
                        <span className="block text-sm font-extrabold leading-tight">{d.label}</span>
                        <span className={`block text-xs font-bold ${on ? "" : "text-ink-3"}`}>{d.date}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-bold" role="note">
                <span className="num text-xl">
                  {reviewed}/{psoe.length}
                </span>
                <span className="h-2 w-24 overflow-hidden rounded-full bg-surface" aria-hidden>
                  <span className="block h-full bg-yes" style={{ width: `${(reviewed / Math.max(1, psoe.length)) * 100}%` }} />
                </span>
                <span>evaluaciones revisadas por una persona. Las demás las preparó un asistente de IA con fuentes oficiales y están pendientes de revisión.</span>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <div className="card p-6">
                  <p className="eyebrow">Cobertura documental · programa del PSOE 2023</p>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div>
                      <p className="num text-4xl md:text-5xl">{coverage.futureCommitments.toLocaleString("es-ES")}</p>
                      <p className="text-sm font-bold text-ink-2">frases de compromiso identificadas</p>
                    </div>
                    <div>
                      <p className="num text-4xl md:text-5xl">{coverage.legislativeCommitments}</p>
                      <p className="text-sm font-bold text-ink-2">compromisos de aprobar una ley</p>
                    </div>
                    <div>
                      <p className="num text-4xl text-yes-ink md:text-5xl">{psoe.length}</p>
                      <p className="text-sm font-bold text-ink-2">evaluados aquí</p>
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="flex h-5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${psoe.length} evaluados de ${coverage.futureCommitments} identificados`}>
                      <motion.span className="h-full bg-ink" initial={{ width: 0 }} whileInView={{ width: `${(psoe.length / coverage.futureCommitments) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1 }} style={{ minWidth: 6 }} />
                    </div>
                    <p className="mt-2 text-sm font-bold">
                      {((psoe.length / coverage.futureCommitments) * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 })} % del total identificado. No se extrapola al resto del programa.
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Disclosure summary="¿Cómo se identificaron?">
                      <p>{coverage.method}</p>
                      <p className="mt-2">{coverage.legislativeMethod}</p>
                    </Disclosure>
                    <Disclosure summary="Tres documentos, sin duplicar">Programa electoral del PSOE (julio de 2023), acuerdo de Gobierno PSOE–Sumar «España avanza» (octubre de 2023) y discurso de investidura de Pedro Sánchez (Diario de Sesiones, 15 de noviembre de 2023). Si un compromiso aparece en varios, es una sola ficha con todas sus citas.</Disclosure>
                  </div>
                </div>
                <div className="card flex flex-col items-center gap-4 p-6 sm:flex-row lg:flex-col xl:flex-row">
                  <Donut counts={counts} total={scope.length} label="PROMESAS" />
                  <div className="w-full">
                    <p className="eyebrow mb-3">{origin ? DOCS.find((d) => d.id === origin)?.label : "Todas las promesas evaluadas"}</p>
                    <ul className="space-y-1">
                      {ORDER.filter((s) => counts[s]).map((s) => (
                        <li key={s}>
                          <button type="button" onClick={() => setStatus((x) => (x === s ? "" : s))} aria-pressed={status === s} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-surface-2" style={status === s ? { background: "var(--surface-2)" } : undefined}>
                            <span className="num w-10 text-3xl" style={{ color: STATUS_STYLE[s].ink }}>
                              {counts[s]}
                            </span>
                            <span className="font-bold">{PROMISE_STATUS[s].label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs font-semibold text-ink-3">
                      Contrastado con el texto íntegro de {boeCount.toLocaleString("es-ES")} normas estatales con rango de ley y los títulos de {rdCount.toLocaleString("es-ES")} reales decretos publicados en el BOE hasta el {formatDate(coverage.periodEnd)}. Una medida ejecutiva sin evidencia se marca «no verificable», nunca «no cumplida».
                    </p>
                  </div>
                </div>
              </div>

              <div className="card mt-4 p-6">
                <p className="eyebrow mb-4">Línea temporal · del programa a la disolución</p>
                <div className="lane -mx-2 flex gap-3 overflow-x-auto px-2 pb-2">
                  <div className="flex w-[170px] shrink-0 flex-col justify-end rounded-2xl p-4" style={{ background: partyVars("psoe").primary, color: partyVars("psoe").on }}>
                    <p className="text-xs font-extrabold">7 jul 2023</p>
                    <p className="font-extrabold">Programa electoral</p>
                  </div>
                  {laws.map((l, k) => (
                    <button key={k} type="button" onClick={() => setOpen(l.p.id)} className="flex w-[220px] shrink-0 flex-col rounded-2xl bg-surface-2 p-4 text-left hover:bg-surface-3">
                      <span className="flex items-center gap-2 text-xs font-extrabold text-ink-3">
                        <Gavel size={14} aria-hidden /> {formatShortDate(l.date)}
                      </span>
                      <span className="mt-2 line-clamp-3 text-sm font-bold">{l.text}</span>
                      <span className="mt-auto pt-3">
                        <StatusBadge status={l.p.assessment.status} />
                      </span>
                    </button>
                  ))}
                  <div className="flex w-[170px] shrink-0 flex-col justify-end rounded-2xl bg-ink p-4 text-bg">
                    <p className="text-xs font-extrabold">6 oct 2026</p>
                    <p className="font-extrabold">Disolución de las Cortes</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="field" aria-label="Tema">
              <option value="">Todos los temas</option>
              {[...new Set(base.map((p) => p.topicId))].map((t) => (
                <option key={t} value={t}>
                  {tmap[t]?.short}
                </option>
              ))}
            </select>
            {tab === "otras" && (
              <select value={party} onChange={(e) => setParty(e.target.value)} className="field" aria-label="Partido">
                <option value="">Todos los partidos</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.shortName}
                  </option>
                ))}
              </select>
            )}
            {ORDER.filter((s) => base.some((p) => p.assessment.status === s)).map((s) => (
              <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus((x) => (x === s ? "" : s))} className="chip">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_STYLE[s].color }} aria-hidden /> {STATUS_STYLE[s].label}
              </button>
            ))}
            <span className="ml-auto text-sm font-extrabold text-ink-3" role="status">
              {list.length} fichas
            </span>
          </div>

          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <motion.li layout key={p.id}>
                <button type="button" onClick={() => setOpen(p.id)} className="card lift flex h-full w-full flex-col p-5 text-left" style={{ boxShadow: `inset 0 5px 0 ${STATUS_STYLE[p.assessment.status].color}, var(--shadow)` }}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="tag">
                      <TopicIcon id={p.topicId} size={13} /> {tmap[p.topicId]?.short}
                    </span>
                    <StatusBadge status={p.assessment.status} />
                  </span>
                  {tab === "psoe" && (
                    <span className="mt-3 flex items-center justify-between gap-2">
                      <DocDots p={p} />
                      <span className="text-right text-[0.7rem] font-extrabold uppercase tracking-wide text-ink-3">{NATURE[p.nature]}</span>
                    </span>
                  )}
                  <span className="mt-2 text-lg font-extrabold leading-snug">{p.promise}</span>
                  <span className="mt-auto flex items-center justify-between pt-4 text-sm font-bold text-ink-3">
                    <span>
                      {p.partyIds.map((x) => pmap[x]?.shortName).join(", ")} · {p.assessment.officialActions.length} evidencias
                    </span>
                    <span className="inline-flex items-center gap-1 text-ink">
                      <FileCheck2 size={15} aria-hidden /> Ver <ArrowRight size={14} aria-hidden />
                    </span>
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>

      <Sheet open={!!current} onClose={() => setOpen(null)} title="Promesa y evidencias" accent={current ? partyVars(current.partyIds[0]).primary : undefined}>
        {current && <Evidence p={current} sources={smap} parties={pmap} topics={tmap} />}
      </Sheet>
    </div>
  );
}
