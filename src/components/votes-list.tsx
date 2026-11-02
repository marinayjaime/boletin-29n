"use client";

import { asset } from "@/lib/asset";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VOTE_TYPE_LABELS } from "@/lib/votes-classify";
import type { VoteType } from "@/lib/schema";
import { GROUP_LABELS } from "@/lib/groups";
import { GROUP_COLORS } from "@/lib/party-theme";

const GROUP_SHORT: Record<string, string> = { GP: "PP", GS: "PSOE", GVOX: "Vox", GSUMAR: "Sumar" };
import { formatShortDate } from "@/lib/format";
import { normalize } from "@/lib/search";

type Lite = [string, string, VoteType, string, string, string, string, number, number, number, number, [string, number, number, number, number][], number, string];
type Topic = { id: string; short: string };

const RESULT_LABEL: Record<string, string> = { aprobada: "Aprobada", rechazada: "Rechazada", empate: "Empate", asentimiento: "Por asentimiento", indeterminado: "—" };
const PAGE = 30;

export function isDivided(g: [string, number, number, number, number]) {
  const counts = [g[1], g[2], g[3]].filter((x) => x > 0);
  return counts.length > 1;
}

export function VotesList({ topics }: { topics: Topic[] }) {
  const sp = useSearchParams();
  const [data, setData] = useState<{ importedAt: string; votes: Lite[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [types, setTypes] = useState<string[]>(sp.get("tipo")?.split(",").filter(Boolean) ?? []);
  const [result, setResult] = useState(sp.get("resultado") ?? "");
  const [topic, setTopic] = useState(sp.get("tema") ?? "");
  const [group, setGroup] = useState(sp.get("grupo") ?? "");
  const [groupVote, setGroupVote] = useState(sp.get("voto") ?? "");
  const [from, setFrom] = useState(sp.get("desde") ?? "");
  const [to, setTo] = useState(sp.get("hasta") ?? "");
  const [page, setPage] = useState(Number(sp.get("pag")) || 1);

  useEffect(() => {
    fetch(asset("/data/votes-index.json"))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(`No se pudo cargar el índice de votaciones (${e.message}).`));
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (types.length) p.set("tipo", types.join(","));
    if (result) p.set("resultado", result);
    if (topic) p.set("tema", topic);
    if (group) p.set("grupo", group);
    if (groupVote) p.set("voto", groupVote);
    if (from) p.set("desde", from);
    if (to) p.set("hasta", to);
    if (page > 1) p.set("pag", String(page));
    window.history.replaceState(null, "", `?${p.toString()}`);
  }, [q, types, result, topic, group, groupVote, from, to, page]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const nq = normalize(q.trim());
    return data.votes.filter((v) => {
      if (types.length && !types.includes(v[2])) return false;
      if (result && v[3] !== result) return false;
      if (topic && !v[6].split(",").includes(topic)) return false;
      if (from && v[1] < from) return false;
      if (to && v[1] > to) return false;
      if (nq && !normalize(`${v[4]} ${v[5]} ${v[13]}`).includes(nq)) return false;
      if (group) {
        const g = v[11].find((x) => x[0] === group);
        if (!g) return false;
        if (groupVote === "si" && !(g[1] > g[2] && g[1] > g[3])) return false;
        if (groupVote === "no" && !(g[2] > g[1] && g[2] > g[3])) return false;
        if (groupVote === "abst" && !(g[3] > g[1] && g[3] > g[2])) return false;
        if (groupVote === "dividido" && !isDivided(g)) return false;
      }
      return true;
    });
  }, [data, q, types, result, topic, group, groupVote, from, to]);

  useEffect(() => setPage(1), [q, types, result, topic, group, groupVote, from, to]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const slice = filtered.slice((page - 1) * PAGE, page * PAGE);
  const toggleType = (t: string) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const LAW_TYPES = ["ley_conjunto", "ley_dictamen", "real_decreto_ley", "enmienda_totalidad", "toma_consideracion", "investidura"];

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="card space-y-5 self-start p-5 text-sm lg:sticky lg:top-24" aria-label="Filtros">
        <div>
          <label htmlFor="vq" className="kicker mb-1 block">
            Buscar en el título o expediente
          </label>
          <input id="vq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="vivienda, 130/000055…" className="field w-full" />
        </div>
        <fieldset>
          <legend className="kicker mb-2">Tipo de iniciativa</legend>
          <button onClick={() => setTypes(types.length === LAW_TYPES.length && LAW_TYPES.every((t) => types.includes(t)) ? [] : LAW_TYPES)} className="mb-2 text-xs underline underline-offset-2">
            Solo leyes, decretos-leyes e investiduras
          </button>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(VOTE_TYPE_LABELS) as VoteType[]).map((t) => (
              <button key={t} aria-pressed={types.includes(t)} onClick={() => toggleType(t)} title={VOTE_TYPE_LABELS[t].help} className="chip !min-h-[34px] !text-xs">
                {VOTE_TYPE_LABELS[t].label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="kicker mb-1 block">Desde</span>
            <input type="date" value={from} min="2023-08-17" max="2026-10-06" onChange={(e) => setFrom(e.target.value)} className="field w-full" />
          </label>
          <label className="block">
            <span className="kicker mb-1 block">Hasta</span>
            <input type="date" value={to} min="2023-08-17" max="2026-10-06" onChange={(e) => setTo(e.target.value)} className="field w-full" />
          </label>
        </div>
        <label className="block">
          <span className="kicker mb-1 block">Resultado</span>
          <select value={result} onChange={(e) => setResult(e.target.value)} className="field w-full">
            <option value="">Todos</option>
            {Object.entries(RESULT_LABEL)
              .filter(([k]) => k !== "indeterminado")
              .map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          <span className="kicker mb-1 block">Tema (orientativo)</span>
          <select value={topic} onChange={(e) => setTopic(e.target.value)} className="field w-full">
            <option value="">Todos</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.short}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="kicker mb-1">Grupo parlamentario</legend>
          <select aria-label="Grupo" value={group} onChange={(e) => setGroup(e.target.value)} className="field col-span-2">
            <option value="">Cualquiera</option>
            {Object.entries(GROUP_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <select aria-label="Sentido mayoritario del grupo" value={groupVote} disabled={!group} onChange={(e) => setGroupVote(e.target.value)} className="field col-span-2 disabled:opacity-40">
            <option value="">Cualquier voto</option>
            <option value="si">Mayoría del grupo: sí</option>
            <option value="no">Mayoría del grupo: no</option>
            <option value="abst">Mayoría del grupo: abstención</option>
            <option value="dividido">Grupo dividido</option>
          </select>
        </fieldset>
        <button
          onClick={() => {
            setQ("");
            setTypes([]);
            setResult("");
            setTopic("");
            setGroup("");
            setGroupVote("");
            setFrom("");
            setTo("");
          }}
          className="text-xs underline underline-offset-2"
        >
          Quitar filtros
        </button>
      </aside>

      <div>
        {error && <p className="rounded border border-no p-3 text-sm">{error}</p>}
        {!data && !error && (
          <p role="status" className="py-10 text-sm text-ink-3">
            Cargando 2.000+ votaciones…
          </p>
        )}
        {data && (
          <>
            <p className="kicker mb-3" role="status" aria-live="polite">
              {filtered.length.toLocaleString("es-ES")} votaciones · página {page} de {pages}
            </p>
            {filtered.length === 0 && <p className="hatch rounded border border-rule p-6 text-sm">Ninguna votación cumple estos filtros.</p>}
            <ol className="grid gap-3">
              {slice.map((v) => {
                const total = v[7] + v[8] + v[9] || 1;
                const big = ["GP", "GS", "GVOX", "GSUMAR"].map((g) => v[11].find((x) => x[0] === g)).filter(Boolean) as [string, number, number, number, number][];
                const divided = v[11].filter(isDivided).map((g) => g[0]);
                return (
                  <li key={v[0]}>
                    <Link href={`/votaciones/${v[0]}`} className="card lift grid gap-4 p-4 md:grid-cols-[1fr_220px] md:p-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="tag !bg-ink !text-bg">{VOTE_TYPE_LABELS[v[2]].label}</span>
                          <span className="tag">{formatShortDate(v[1])}</span>
                          {v[12] === 1 && <span className="tag">Por llamamiento</span>}
                          {divided.length > 0 && <span className="tag !bg-brand-soft !text-ink">Voto dividido</span>}
                        </div>
                        <p className="mt-2 line-clamp-2 text-[1.02rem] font-bold leading-snug">{v[4]}</p>
                        {v[5] && <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-ink-3">{v[5]}</p>}
                        {big.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {big.map((g) => {
                              const m = g[1] >= g[2] && g[1] >= g[3] ? "S" : g[2] >= g[3] ? "N" : "A";
                              return (
                                <span key={g[0]} className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-xs font-extrabold" style={{ background: "var(--surface-2)" }}>
                                  <span className="h-5 w-5 rounded-full" style={{ background: GROUP_COLORS[g[0]] }} aria-hidden />
                                  {GROUP_SHORT[g[0]]} <span style={{ color: m === "S" ? "var(--yes)" : m === "N" ? "var(--no)" : "var(--ink-3)" }}>{m === "S" ? "Sí" : m === "N" ? "No" : "Abst."}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-sm font-extrabold" style={{ color: v[3] === "aprobada" || v[3] === "asentimiento" ? "var(--yes)" : v[3] === "rechazada" ? "var(--no)" : "var(--ink-2)" }}>
                          {RESULT_LABEL[v[3]]}
                        </p>
                        <div className="mt-1.5 flex h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                          <span style={{ width: `${(v[7] / total) * 100}%`, background: "var(--yes)" }} />
                          <span style={{ width: `${(v[8] / total) * 100}%`, background: "var(--no)" }} />
                          <span style={{ width: `${(v[9] / total) * 100}%`, background: "var(--abs)" }} />
                        </div>
                        <p className="mt-1.5 flex gap-3 text-sm font-bold">
                          <span><span className="num text-xl">{v[7]}</span> sí</span>
                          <span><span className="num text-xl">{v[8]}</span> no</span>
                          <span><span className="num text-xl">{v[9]}</span> abst.</span>
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <nav aria-label="Paginación" className="mt-4 flex items-center justify-between text-sm">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-ghost disabled:opacity-30">
                ← Anteriores
              </button>
              <span className="font-mono">
                {page} / {pages}
              </span>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn btn-ghost disabled:opacity-30">
                Siguientes →
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  );
}
