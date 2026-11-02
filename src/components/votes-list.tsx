"use client";

import { asset } from "@/lib/asset";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VOTE_TYPE_LABELS } from "@/lib/votes-classify";
import type { VoteType } from "@/lib/schema";
import { GROUP_LABELS } from "@/lib/groups";
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
      <aside className="space-y-5 text-sm lg:sticky lg:top-24 lg:self-start" aria-label="Filtros">
        <div>
          <label htmlFor="vq" className="kicker mb-1 block">
            Buscar en el título o expediente
          </label>
          <input id="vq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="vivienda, 130/000055…" className="w-full rounded border border-rule bg-paper px-3 py-2" />
        </div>
        <fieldset>
          <legend className="kicker mb-2">Tipo de iniciativa</legend>
          <button onClick={() => setTypes(types.length === LAW_TYPES.length && LAW_TYPES.every((t) => types.includes(t)) ? [] : LAW_TYPES)} className="mb-2 text-xs underline underline-offset-2">
            Solo leyes, decretos-leyes e investiduras
          </button>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(VOTE_TYPE_LABELS) as VoteType[]).map((t) => (
              <button key={t} aria-pressed={types.includes(t)} onClick={() => toggleType(t)} title={VOTE_TYPE_LABELS[t].help} className={`rounded-full border px-2.5 py-1 text-xs ${types.includes(t) ? "border-ink bg-ink text-paper" : "border-rule"}`}>
                {VOTE_TYPE_LABELS[t].label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="kicker mb-1 block">Desde</span>
            <input type="date" value={from} min="2023-08-17" max="2026-10-06" onChange={(e) => setFrom(e.target.value)} className="w-full rounded border border-rule bg-paper px-2 py-1.5" />
          </label>
          <label className="block">
            <span className="kicker mb-1 block">Hasta</span>
            <input type="date" value={to} min="2023-08-17" max="2026-10-06" onChange={(e) => setTo(e.target.value)} className="w-full rounded border border-rule bg-paper px-2 py-1.5" />
          </label>
        </div>
        <label className="block">
          <span className="kicker mb-1 block">Resultado</span>
          <select value={result} onChange={(e) => setResult(e.target.value)} className="w-full rounded border border-rule bg-paper px-2 py-1.5">
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
          <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full rounded border border-rule bg-paper px-2 py-1.5">
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
          <select aria-label="Grupo" value={group} onChange={(e) => setGroup(e.target.value)} className="col-span-2 rounded border border-rule bg-paper px-2 py-1.5">
            <option value="">Cualquiera</option>
            {Object.entries(GROUP_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <select aria-label="Sentido mayoritario del grupo" value={groupVote} disabled={!group} onChange={(e) => setGroupVote(e.target.value)} className="col-span-2 rounded border border-rule bg-paper px-2 py-1.5 disabled:opacity-40">
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
            <ol className="divide-y divide-rule border-y border-rule">
              {slice.map((v) => {
                const total = v[7] + v[8] + v[9] || 1;
                const divided = v[11].filter(isDivided).map((g) => g[0]);
                return (
                  <li key={v[0]}>
                    <Link href={`/votaciones/${v[0]}`} className="grid gap-3 py-4 transition-colors hover:bg-paper-2 md:grid-cols-[110px_1fr_180px] md:px-2">
                      <div className="font-mono text-xs text-ink-3">
                        {formatShortDate(v[1])}
                        <span className="mt-1 block">{v[13]}</span>
                      </div>
                      <div>
                        <span className="cite-chip">{VOTE_TYPE_LABELS[v[2]].label}</span>
                        {v[12] === 1 && <span className="cite-chip ml-1">Por llamamiento</span>}
                        <p className="mt-1.5 leading-snug">{v[4]}</p>
                        {v[5] && <p className="mt-0.5 text-sm text-ink-3">{v[5]}</p>}
                        {divided.length > 0 && <p className="mt-1 text-xs text-ink-2">Voto dividido en: {divided.map((g) => GROUP_LABELS[g] ?? g).join(", ")}</p>}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${v[3] === "aprobada" ? "" : "text-ink-2"}`}>{RESULT_LABEL[v[3]]}</p>
                        <div className="mt-1 flex h-2 overflow-hidden rounded-sm bg-paper-3" aria-hidden>
                          <span style={{ width: `${(v[7] / total) * 100}%`, background: "var(--yes)" }} />
                          <span style={{ width: `${(v[8] / total) * 100}%`, background: "var(--no)" }} />
                          <span style={{ width: `${(v[9] / total) * 100}%`, background: "var(--abs)" }} />
                        </div>
                        <p className="mt-1 font-mono text-xs">
                          Sí {v[7]} · No {v[8]} · Abst. {v[9]}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <nav aria-label="Paginación" className="mt-4 flex items-center justify-between text-sm">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-full border border-rule px-4 py-2 disabled:opacity-30">
                ← Anteriores
              </button>
              <span className="font-mono">
                {page} / {pages}
              </span>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="rounded-full border border-rule px-4 py-2 disabled:opacity-30">
                Siguientes →
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  );
}
