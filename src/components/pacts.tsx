"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Minus, Plus, Save, Trash2, X } from "lucide-react";
import type { Poll } from "@/lib/data";
import { POLL_PARTY, type PollKey } from "@/lib/party-theme";
import { ABSOLUTE_MAJORITY, TOTAL_SEATS, investiture, pointSeats, setSeats, sumSeats, type SeatMap, type Vote } from "@/lib/seats";
import { formatDate } from "@/lib/format";
import { SeatChart, type SeatBlock } from "./seat-chart";
import { Disclosure } from "./ui";

const ORDER: PollKey[] = ["PP", "PSOE", "VOX", "FA", "PODEMOS", "ERC", "JUNTS", "BILDU", "PNV", "BNG", "CCA", "FV", "ADELANTE", "SALF", "OTROS"];
const STORE = "boletin29n.escenarios.v1";

type Saved = { id: string; name: string; seats: SeatMap; votes: Record<string, Vote>; createdAt: string };

function blocksFrom(m: SeatMap, highlight?: string[]): SeatBlock[] {
  return ORDER.filter((k) => (m[k] ?? 0) > 0)
    .sort((a, b) => (m[b] ?? 0) - (m[a] ?? 0))
    .map((k) => ({ key: k, name: POLL_PARTY[k].name, color: POLL_PARTY[k].color, seats: m[k], dim: highlight && highlight.length > 0 ? !highlight.includes(k) : false }));
}

function MajorityBar({ value, label }: { value: number; label: string }) {
  const ok = value >= ABSOLUTE_MAJORITY;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-extrabold">{label}</p>
        <p className="num text-4xl">
          {value}
          <span className="text-lg text-ink-3"> / {ABSOLUTE_MAJORITY}</span>
        </p>
      </div>
      <div className="relative mt-2 h-4 overflow-hidden rounded-full bg-surface-2">
        <motion.div className="h-full rounded-full" style={{ background: ok ? "var(--yes)" : "var(--ink)" }} animate={{ width: `${(value / TOTAL_SEATS) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        <span className="absolute inset-y-0 w-0.5 bg-brand" style={{ left: `${(ABSOLUTE_MAJORITY / TOTAL_SEATS) * 100}%` }} aria-hidden />
      </div>
      <p className="mt-1.5 text-sm font-bold" style={{ color: ok ? "var(--yes)" : "var(--ink-2)" }}>
        {ok ? (value === ABSOLUTE_MAJORITY ? "Alcanza justo la mayoría absoluta" : `Supera la mayoría absoluta en ${value - ABSOLUTE_MAJORITY}`) : `Faltan ${ABSOLUTE_MAJORITY - value} para la mayoría absoluta`}
      </p>
    </div>
  );
}

export function Pacts({ polls, aggregator }: { polls: Poll[]; aggregator: { name: string; url: string; revisionTimestamp: string } }) {
  const [tab, setTab] = useState<"encuestas" | "escenario">("encuestas");
  const sorted = useMemo(() => [...polls].sort((a, b) => b.published.localeCompare(a.published)), [polls]);
  const [pollId, setPollId] = useState(sorted.find((p) => p.type === "puntual")?.id ?? sorted[0].id);
  const poll = sorted.find((p) => p.id === pollId)!;
  const point = pointSeats(poll.seats);
  const [bloc, setBloc] = useState<string[]>([]);

  // escenario propio
  const [seats, setS] = useState<SeatMap>(() => Object.fromEntries(ORDER.map((k) => [k, 0])));
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [saved, setSaved] = useState<Saved[]>([]);
  const [name, setName] = useState("");
  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem(STORE) ?? "[]"));
    } catch {}
  }, []);
  const persist = (s: Saved[]) => {
    setSaved(s);
    try {
      localStorage.setItem(STORE, JSON.stringify(s));
    } catch {}
  };
  const assigned = sumSeats(seats);
  const free = TOTAL_SEATS - assigned;
  const inv = investiture(seats, votes);
  const blocSeats = point ? sumSeats(point, bloc) : 0;

  const loadFromPoll = (p: Poll) => {
    const m = pointSeats(p.seats);
    if (!m) return;
    setS(Object.fromEntries(ORDER.map((k) => [k, m[k] ?? 0])));
    setTab("escenario");
  };

  return (
    <div>
      <div role="tablist" aria-label="Modo" className="inline-flex rounded-full bg-surface p-1.5 shadow-[inset_0_0_0_1.5px_var(--line)]">
        {(
          [
            ["encuestas", "Según las encuestas"],
            ["escenario", "Mi propio escenario"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-5 py-3 font-extrabold transition-colors ${tab === k ? "bg-ink text-bg" : "text-ink-2"}`}>
            {l}
          </button>
        ))}
      </div>
      <p className="mt-4 inline-flex rounded-full bg-brand-soft px-4 py-2 text-sm font-bold">
        No consta en esta plataforma ningún pacto de investidura anunciado oficialmente para 2026: todas las combinaciones son hipotéticas.
      </p>

      <AnimatePresence mode="wait">
        {tab === "encuestas" ? (
          <motion.div key="enc" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mt-6">
            <div className="lane -mx-4 flex gap-3 overflow-x-auto px-4 pb-2" role="listbox" aria-label="Encuesta">
              {sorted.map((p) => (
                <button
                  key={p.id}
                  role="option"
                  aria-selected={p.id === pollId}
                  onClick={() => {
                    setPollId(p.id);
                    setBloc([]);
                  }}
                  className={`w-[210px] shrink-0 rounded-[20px] p-4 text-left transition-all ${p.id === pollId ? "bg-ink text-bg shadow-[var(--shadow-lg)]" : "bg-surface shadow-[inset_0_0_0_1.5px_var(--line)]"}`}
                >
                  <p className="font-extrabold">{p.firm}</p>
                  <p className="text-sm font-semibold opacity-75">{p.media}</p>
                  <p className="mt-3 text-xs font-bold opacity-75">{formatDate(p.published)}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-extrabold ${p.type === "puntual" ? "bg-brand text-brand-ink" : "bg-surface-3 text-ink"}`}>{p.type === "puntual" ? "Escaños exactos" : "Horquilla"}</span>
                </button>
              ))}
            </div>

            {point ? (
              <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
                <div className="card p-4 md:p-6">
                  <SeatChart blocks={blocksFrom(point, bloc)} height={330} interactive center={<p className="num text-6xl">{bloc.length ? blocSeats : TOTAL_SEATS}</p>} caption="Escaños ordenados por tamaño, de izquierda a derecha." />
                </div>
                <div className="card p-5 md:p-6">
                  <p className="eyebrow">Construye una alianza hipotética</p>
                  <ul className="mt-4 space-y-2">
                    {ORDER.filter((k) => (point[k] ?? 0) > 0)
                      .sort((a, b) => point[b] - point[a])
                      .map((k) => {
                        const on = bloc.includes(k);
                        return (
                          <li key={k}>
                            <button type="button" aria-pressed={on} onClick={() => setBloc((b) => (on ? b.filter((x) => x !== k) : [...b, k]))} className="flex w-full items-center gap-3 rounded-2xl p-2 pr-3 text-left transition-colors hover:bg-surface-2" style={on ? { background: "var(--surface-2)" } : undefined}>
                              <span className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: POLL_PARTY[k].color }} aria-hidden>
                                {on ? <Check size={16} /> : <Plus size={16} />}
                              </span>
                              <span className="flex-1 font-bold">{POLL_PARTY[k].name}</span>
                              <span className="h-2 w-24 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                                <span className="block h-full rounded-full" style={{ width: `${(point[k] / 180) * 100}%`, background: POLL_PARTY[k].color }} />
                              </span>
                              <span className="num w-10 text-right text-2xl">{point[k]}</span>
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                  <div className="mt-5 border-t border-line pt-5">
                    <MajorityBar value={blocSeats} label={bloc.length ? bloc.map((k) => POLL_PARTY[k as PollKey].name).join(" + ") : "Selecciona formaciones"} />
                  </div>
                  <button type="button" onClick={() => loadFromPoll(poll)} className="btn btn-ghost mt-5 w-full">
                    Usar esta encuesta en mi escenario
                  </button>
                </div>
              </div>
            ) : (
              <div className="card mt-6 p-5 md:p-6">
                <p className="font-extrabold">Esta encuesta publica horquillas (mínimo–máximo). No se convierten en cifras exactas.</p>
                <ul className="mt-4 space-y-3">
                  {ORDER.filter((k) => poll.seats[k] !== undefined).map((k) => {
                    const v = poll.seats[k];
                    const [mn, mx] = typeof v === "number" ? [v, v] : [v.min, v.max];
                    return (
                      <li key={k} className="grid grid-cols-[130px_1fr_80px] items-center gap-3">
                        <span className="font-bold">{POLL_PARTY[k].name}</span>
                        <span className="relative h-3 rounded-full bg-surface-2" aria-hidden>
                          <span className="absolute inset-y-0 rounded-full" style={{ left: `${(mn / 180) * 100}%`, width: `${Math.max(1.2, ((mx - mn) / 180) * 100)}%`, background: POLL_PARTY[k].color }} />
                        </span>
                        <span className="num text-right text-xl">{mn === mx ? mn : `${mn}–${mx}`}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-2">
              <span>
                {poll.firm} para {poll.media} · trabajo de campo {poll.fieldwork} · publicado {formatDate(poll.published)}
              </span>
              <a href={poll.url} target="_blank" rel="noreferrer" className="link font-bold">
                Fuente original
              </a>
              <span>·</span>
              <a href={aggregator.url} target="_blank" rel="noreferrer" className="link font-bold">
                Recopilación (Wikipedia)
              </a>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <Disclosure summary="¿De dónde salen los escaños?">Son las proyecciones de escaños que publica cada encuestadora, tal cual. Esta web no convierte porcentajes en escaños ni calcula medias. Las encuestas con horquilla se muestran como rangos.</Disclosure>
              <Disclosure summary="¿Por qué aparecen otros partidos?">Las proyecciones incluyen formaciones territoriales necesarias para sumar mayorías. El comparador de propuestas sigue limitado a cinco candidaturas.</Disclosure>
            </div>
          </motion.div>
        ) : (
          <motion.div key="esc" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-6">
              <div className="card p-4 md:p-6">
                <SeatChart blocks={blocksFrom(seats)} height={300} interactive center={<p className="num text-6xl">{assigned}</p>} />
                <p className="mt-2 text-center font-bold" style={{ color: free < 0 ? "var(--no)" : "var(--ink-2)" }}>
                  {free > 0 ? `${free} escaños sin asignar` : "350 escaños asignados"}
                </p>
              </div>
              <div className="card p-5 md:p-6">
                <p className="eyebrow">Investidura</p>
                <p className="mt-1 text-sm font-semibold text-ink-2">Marca qué votaría cada formación. Hipotético.</p>
                <ul className="mt-4 space-y-2">
                  {ORDER.filter((k) => seats[k] > 0).map((k) => (
                    <li key={k} className="flex items-center gap-3">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: POLL_PARTY[k].color }} aria-hidden />
                      <span className="flex-1 font-bold">
                        {POLL_PARTY[k].name} <span className="text-ink-3">{seats[k]}</span>
                      </span>
                      <span role="radiogroup" aria-label={`Voto de ${POLL_PARTY[k].name}`} className="flex rounded-full bg-surface-2 p-0.5">
                        {(["si", "abst", "no"] as Vote[]).map((v) => {
                          const on = (votes[k] ?? "no") === v;
                          return (
                            <button key={v} role="radio" aria-checked={on} onClick={() => setVotes((x) => ({ ...x, [k]: v }))} className="rounded-full px-3 py-1.5 text-xs font-extrabold" style={on ? { background: v === "si" ? "var(--yes)" : v === "no" ? "var(--no)" : "var(--abs)", color: "#fff" } : undefined}>
                              {v === "si" ? "Sí" : v === "no" ? "No" : "Abst."}
                            </button>
                          );
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
                {assigned > 0 ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl p-4" style={{ background: inv.first ? "color-mix(in oklab, var(--yes) 15%, transparent)" : "var(--surface-2)" }}>
                      <p className="text-sm font-extrabold">1.ª votación · mayoría absoluta</p>
                      <p className="num mt-1 text-3xl">{inv.first ? "Investido" : "No"}</p>
                      <p className="text-sm font-semibold">
                        {inv.si} sí · necesita {ABSOLUTE_MAJORITY}
                      </p>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: inv.second ? "color-mix(in oklab, var(--yes) 15%, transparent)" : "var(--surface-2)" }}>
                      <p className="text-sm font-extrabold">2.ª votación · mayoría simple</p>
                      <p className="num mt-1 text-3xl">{inv.second ? "Investido" : "No"}</p>
                      <p className="text-sm font-semibold">
                        {inv.si} sí · {inv.no} no · {inv.abst} abst.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-bold text-ink-3">Asigna escaños para calcular la investidura.</p>
                )}
                <p className="mt-3 text-xs font-semibold text-ink-3">Reglas: art. 99 de la Constitución. Las formaciones sin voto marcado cuentan como «No». Los escaños sin asignar no votan.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="card p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">Reparte los 350 escaños</p>
                  <button type="button" className="text-sm font-bold underline" onClick={() => setS(Object.fromEntries(ORDER.map((k) => [k, 0])))}>
                    Vaciar
                  </button>
                </div>
                <ul className="mt-4 space-y-3">
                  {ORDER.map((k) => (
                    <li key={k}>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: POLL_PARTY[k].color }} aria-hidden />
                        <label htmlFor={`s-${k}`} className="flex-1 text-sm font-bold">
                          {POLL_PARTY[k].name}
                        </label>
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-surface-2" aria-label={`Restar un escaño a ${POLL_PARTY[k].name}`} onClick={() => setS((m) => setSeats(m, k, (m[k] ?? 0) - 1))}>
                          <Minus size={14} aria-hidden />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={350}
                          value={seats[k] ?? 0}
                          onChange={(e) => setS((m) => setSeats(m, k, Number(e.target.value) || 0))}
                          className="field w-[72px] text-center text-lg"
                          aria-label={`Escaños de ${POLL_PARTY[k].name}`}
                        />
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-surface-2" aria-label={`Sumar un escaño a ${POLL_PARTY[k].name}`} onClick={() => setS((m) => setSeats(m, k, (m[k] ?? 0) + 1))}>
                          <Plus size={14} aria-hidden />
                        </button>
                      </div>
                      <input id={`s-${k}`} type="range" min={0} max={200} value={seats[k] ?? 0} onChange={(e) => setS((m) => setSeats(m, k, Number(e.target.value)))} className="mt-1 w-full" style={{ accentColor: POLL_PARTY[k].color }} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-5 md:p-6">
                <p className="eyebrow">Guardar y comparar</p>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!assigned) return;
                    persist([{ id: crypto.randomUUID(), name: name.trim() || `Escenario ${saved.length + 1}`, seats, votes, createdAt: new Date().toISOString() }, ...saved].slice(0, 12));
                    setName("");
                  }}
                >
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del escenario" className="field min-w-0 flex-1" aria-label="Nombre del escenario" />
                  <button type="submit" className="btn btn-primary" disabled={!assigned}>
                    <Save size={16} aria-hidden /> Guardar
                  </button>
                </form>
                <p className="mt-2 text-xs font-semibold text-ink-3">Se guarda solo en este navegador.</p>
                {saved.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead>
                        <tr className="text-left text-xs font-extrabold text-ink-3">
                          <th className="py-1">Escenario</th>
                          {(["PP", "PSOE", "VOX", "FA", "PODEMOS"] as PollKey[]).map((k) => (
                            <th key={k} className="py-1 text-right" style={{ color: POLL_PARTY[k].color }}>
                              {POLL_PARTY[k].name.split(" ")[0]}
                            </th>
                          ))}
                          <th className="py-1 text-right">Inv.</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {saved.map((s) => {
                          const r = investiture(s.seats, s.votes);
                          return (
                            <tr key={s.id} className="border-t border-line">
                              <td className="py-2">
                                <button
                                  type="button"
                                  className="font-bold underline decoration-brand decoration-2 underline-offset-2"
                                  onClick={() => {
                                    setS(s.seats);
                                    setVotes(s.votes);
                                  }}
                                >
                                  {s.name}
                                </button>
                              </td>
                              {(["PP", "PSOE", "VOX", "FA", "PODEMOS"] as PollKey[]).map((k) => (
                                <td key={k} className="num text-right text-lg">
                                  {s.seats[k] ?? 0}
                                </td>
                              ))}
                              <td className="text-right font-extrabold">{r.first ? "1.ª" : r.second ? "2.ª" : "—"}</td>
                              <td className="text-right">
                                <button type="button" aria-label={`Borrar ${s.name}`} onClick={() => persist(saved.filter((x) => x.id !== s.id))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2">
                                  <Trash2 size={14} aria-hidden />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {saved.length > 0 && (
                  <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-ink-3" onClick={() => persist([])}>
                    <X size={14} aria-hidden /> Borrar todos
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
