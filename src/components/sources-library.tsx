"use client";

import { useMemo, useState } from "react";
import type { SourceDocument } from "@/lib/schema";
import { CATEGORY_LABELS, CYCLE_LABELS, VERIFICATION_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { normalize } from "@/lib/search";
import { SourceLinks } from "./proposal-detail";

type Extra = { id: string; title: string; author: string; kind: string; year: string; url: string; topic: string };

export function SourcesLibrary({
  sources,
  extras,
  parties,
  counts,
}: {
  sources: SourceDocument[];
  extras: Extra[];
  parties: { id: string; shortName: string }[];
  counts: Record<string, number>;
}) {
  const [q, setQ] = useState("");
  const [party, setParty] = useState("");
  const [kind, setKind] = useState("");
  const [year, setYear] = useState("");
  const pmap = Object.fromEntries(parties.map((p) => [p.id, p.shortName]));
  const years = [...new Set([...sources.map((s) => s.published.slice(0, 4)), ...extras.map((e) => e.year)])].sort().reverse();
  const kinds = [...new Set([...sources.map((s) => s.kind as string), ...extras.map((e) => e.kind)])];
  const nq = normalize(q);
  const docs = useMemo(
    () =>
      sources.filter(
        (s) =>
          (!party || s.partyId === party) &&
          (!kind || s.kind === kind) &&
          (!year || s.published.startsWith(year)) &&
          (!nq || normalize(`${s.title} ${s.author} ${s.notes ?? ""}`).includes(nq)),
      ),
    [sources, party, kind, year, nq],
  );
  const ex = useMemo(
    () => extras.filter((e) => !party && (!kind || e.kind === kind) && (!year || e.year === year) && (!nq || normalize(`${e.title} ${e.author} ${e.topic}`).includes(nq))),
    [extras, party, kind, year, nq],
  );

  return (
    <div>
      <div className="grid gap-3 rounded border border-rule p-4 text-sm md:grid-cols-4">
        <label className="md:col-span-1">
          <span className="kicker mb-1 block">Buscar</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded border border-rule bg-paper px-3 py-1.5" placeholder="título, organismo…" />
        </label>
        <label>
          <span className="kicker mb-1 block">Partido</span>
          <select value={party} onChange={(e) => setParty(e.target.value)} className="w-full rounded border border-rule bg-paper px-2 py-1.5">
            <option value="">Todos</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shortName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="kicker mb-1 block">Tipo de documento</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full rounded border border-rule bg-paper px-2 py-1.5">
            <option value="">Todos</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {CATEGORY_LABELS[k as keyof typeof CATEGORY_LABELS] ?? k}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="kicker mb-1 block">Año</span>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full rounded border border-rule bg-paper px-2 py-1.5">
            <option value="">Todos</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="kicker mt-4" role="status">
        {docs.length + ex.length} documentos
      </p>
      <ul className="mt-3 divide-y divide-rule border-y border-rule">
        {docs.map((s) => (
          <li key={s.id} className="grid gap-3 py-5 md:grid-cols-[1fr_280px]">
            <div>
              <p className="kicker">
                {CATEGORY_LABELS[s.kind]}
                {s.partyId ? ` · ${pmap[s.partyId]}` : ""}
                {s.cycle && CYCLE_LABELS[s.cycle] ? ` · ${CYCLE_LABELS[s.cycle]}` : ""}
              </p>
              <p className="mt-1 text-lg font-medium leading-snug">{s.title}</p>
              <p className="text-sm text-ink-2">
                {s.author} · {formatDate(s.published)}
                {s.pages ? ` · ${s.pages} págs.` : ""}
              </p>
              {s.notes && <p className="mt-2 text-sm text-ink-2">{s.notes}</p>}
              <p className="mt-2 break-all font-mono text-[0.68rem] text-ink-3">{s.officialUrl}</p>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className={`cite-chip ${s.verification === "verificado" ? "" : "border-accent text-accent"}`}>{VERIFICATION_LABELS[s.verification]}</span>
              </p>
              <p className="text-xs text-ink-3">Comprobado el {formatDate(s.lastChecked)}</p>
              {counts[s.id] ? <p className="text-xs">{counts[s.id]} citas usadas en la plataforma</p> : null}
              <SourceLinks source={s} />
            </div>
          </li>
        ))}
        {ex.map((e) => (
          <li key={e.id} className="grid gap-3 py-5 md:grid-cols-[1fr_280px]">
            <div>
              <p className="kicker">{CATEGORY_LABELS[e.kind as keyof typeof CATEGORY_LABELS] ?? e.kind} · {e.topic}</p>
              <p className="mt-1 text-lg font-medium leading-snug">{e.title}</p>
              <p className="text-sm text-ink-2">
                {e.author} · {e.year}
              </p>
              <p className="mt-2 break-all font-mono text-[0.68rem] text-ink-3">{e.url}</p>
            </div>
            <div>
              <a href={e.url} target="_blank" rel="noreferrer" className="kicker rounded-full border border-ink px-3 py-1.5">
                Abrir ↗
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
