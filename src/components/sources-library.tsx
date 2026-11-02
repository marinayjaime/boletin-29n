"use client";

import { useMemo, useState } from "react";
import { BarChart3, FileText, Gavel, Landmark, Mic, Newspaper, Search, type LucideIcon } from "lucide-react";
import type { SourceDocument } from "@/lib/schema";
import { CATEGORY_LABELS, CYCLE_LABELS, VERIFICATION_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { normalize } from "@/lib/search";
import { partyVars } from "@/lib/party-theme";
import { SourceLinks } from "./proposal-detail";
import { Disclosure } from "./ui";

type Extra = { id: string; title: string; author: string; kind: string; year: string; url: string; topic: string };

/** Agrupación visual: pocas familias reconocibles en lugar de diez categorías técnicas. */
const GROUPS: { id: string; label: string; icon: LucideIcon; kinds: string[] }[] = [
  { id: "programas", label: "Programas", icon: FileText, kinds: ["programa_2026", "propuesta_2026", "programa_anterior"] },
  { id: "declaraciones", label: "Discursos y declaraciones", icon: Mic, kinds: ["declaracion", "periodistica"] },
  { id: "congreso", label: "Congreso", icon: Landmark, kinds: ["iniciativa_parlamentaria", "votacion"] },
  { id: "boe", label: "Leyes y BOE", icon: Gavel, kinds: ["ley", "boe"] },
  { id: "estadistica", label: "Estadística oficial", icon: BarChart3, kinds: ["estadistica"] },
];
const groupOf = (kind: string) => GROUPS.find((g) => g.kinds.includes(kind)) ?? GROUPS[1];
const PAGE = 18;

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
  const [group, setGroup] = useState("");
  const [shown, setShown] = useState(PAGE);
  const pmap = Object.fromEntries(parties.map((p) => [p.id, p.shortName]));
  const nq = normalize(q);
  const docs = useMemo(
    () => sources.filter((s) => (!party || s.partyId === party) && (!group || groupOf(s.kind).id === group) && (!nq || normalize(`${s.title} ${s.author} ${s.notes ?? ""}`).includes(nq))),
    [sources, party, group, nq],
  );
  const ex = useMemo(() => extras.filter((e) => !party && (!group || groupOf(e.kind).id === group) && (!nq || normalize(`${e.title} ${e.author} ${e.topic}`).includes(nq))), [extras, party, group, nq]);
  const total = (gid: string) => sources.filter((s) => groupOf(s.kind).id === gid).length + extras.filter((e) => groupOf(e.kind).id === gid).length;
  const reset = () => setShown(PAGE);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Tipo de fuente">
        {GROUPS.map((g) => {
          const on = group === g.id;
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setGroup((x) => (x === g.id ? "" : g.id));
                reset();
              }}
              className={`flex items-center gap-3 rounded-[20px] p-4 text-left transition ${on ? "bg-ink text-bg" : "bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] hover:bg-surface-2"}`}
            >
              <g.icon size={22} aria-hidden className={on ? "text-brand" : ""} />
              <span>
                <span className="num block text-2xl">{total(g.id)}</span>
                <span className="text-sm font-bold">{g.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Buscar en las fuentes</span>
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              reset();
            }}
            className="field w-full !pl-11"
            placeholder="Título u organismo…"
          />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Partido">
          {parties.map((p) => {
            const v = partyVars(p.id);
            const on = party === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setParty((x) => (x === p.id ? "" : p.id));
                  reset();
                }}
                className="chip"
                style={on ? { background: v.primary, color: v.on, borderColor: v.primary } : undefined}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: v.primary }} aria-hidden /> {p.shortName}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-4 text-sm font-extrabold text-ink-3" role="status">
        {docs.length + ex.length} documentos
      </p>

      {docs.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {docs.map((s) => {
            const v = s.partyId ? partyVars(s.partyId) : null;
            const G = groupOf(s.kind);
            return (
              <li key={s.id} className="card flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 text-sm font-extrabold" style={v ? { background: v.primary, color: v.on } : { background: "var(--surface-2)" }}>
                  <G.icon size={16} aria-hidden />
                  {s.partyId ? pmap[s.partyId] : CATEGORY_LABELS[s.kind]}
                  {s.cycle && CYCLE_LABELS[s.cycle] ? <span className="ml-auto">{CYCLE_LABELS[s.cycle]}</span> : null}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="font-extrabold leading-snug">{s.title}</p>
                  <p className="mt-1 text-sm font-semibold text-ink-2">
                    {s.author} · {formatDate(s.published)}
                    {s.pages ? ` · ${s.pages} págs.` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-extrabold">
                    <span className="tag" style={{ color: s.verification === "verificado" ? "var(--yes-ink)" : "var(--partial-ink)" }}>
                      {s.verification === "verificado" ? "✓ " : ""}
                      {VERIFICATION_LABELS[s.verification]}
                    </span>
                    {counts[s.id] ? <span className="tag">{counts[s.id]} citas</span> : null}
                  </div>
                  <div className="mt-4">
                    <SourceLinks source={s} />
                  </div>
                  <Disclosure summary="Detalles" className="mt-3">
                    {s.notes && <p>{s.notes}</p>}
                    <p className="mt-2 text-xs">Comprobado el {formatDate(s.lastChecked)}</p>
                    <p className="mt-1 break-all font-mono text-[0.7rem]">{s.officialUrl}</p>
                    {s.sha256 && <p className="mt-1 break-all font-mono text-[0.7rem]">SHA-256 {s.sha256}</p>}
                  </Disclosure>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {ex.length > 0 && (
        <>
          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[24px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)]">
            {ex.slice(0, shown).map((e) => {
              const G = groupOf(e.kind);
              return (
                <li key={e.id}>
                  <a href={e.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2" aria-hidden>
                      <G.icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 font-bold leading-snug">{e.title}</span>
                      <span className="block text-sm font-semibold text-ink-3">
                        {e.author} · {e.year}
                      </span>
                    </span>
                    <span className="text-sm font-extrabold" aria-hidden>
                      ↗
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          {ex.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE * 2)} className="btn btn-ghost mx-auto mt-4 flex">
              Mostrar más ({ex.length - shown} restantes)
            </button>
          )}
        </>
      )}
    </div>
  );
}
