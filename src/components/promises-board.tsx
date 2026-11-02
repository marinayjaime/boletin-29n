"use client";

import { useMemo, useState } from "react";
import type { HistoricalPromise, Party, PolicyTopic, SourceDocument } from "@/lib/schema";
import { formatDate, formatShortDate } from "@/lib/format";
import { SourceLinks } from "./proposal-detail";
import { PROMISE_STATUS as STATUS } from "@/lib/labels";


const ATTR: Record<HistoricalPromise["attribution"], string> = {
  partido: "Compromiso de partido",
  gobierno_coalicion: "Compromiso en un Gobierno de coalición",
  partido_en_oposicion: "Compromiso de un partido en la oposición",
};

export function PromisesBoard({ promises, parties, topics, sources }: { promises: HistoricalPromise[]; parties: Party[]; topics: PolicyTopic[]; sources: SourceDocument[] }) {
  const [party, setParty] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState("");
  const [leg, setLeg] = useState("");
  const [open, setOpen] = useState<string | null>(promises[0]?.id ?? null);
  const pmap = Object.fromEntries(parties.map((p) => [p.id, p]));
  const tmap = Object.fromEntries(topics.map((t) => [t.id, t]));
  const smap = Object.fromEntries(sources.map((s) => [s.id, s]));
  const list = useMemo(
    () =>
      promises.filter(
        (p) => (!party || p.partyIds.includes(party)) && (!topic || p.topicId === topic) && (!status || p.assessment.status === status) && (!leg || p.legislature === leg),
      ),
    [promises, party, topic, status, leg],
  );
  const legs = [...new Set(promises.map((p) => p.legislature))];

  return (
    <div>
      <div className="grid gap-3 rounded border border-rule p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
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
          <span className="kicker mb-1 block">Legislatura</span>
          <select value={leg} onChange={(e) => setLeg(e.target.value)} className="w-full rounded border border-rule bg-paper px-2 py-1.5">
            <option value="">Todas</option>
            {legs.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="kicker mb-1 block">Tema</span>
          <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full rounded border border-rule bg-paper px-2 py-1.5">
            <option value="">Todos</option>
            {[...new Set(promises.map((p) => p.topicId))].map((t) => (
              <option key={t} value={t}>
                {tmap[t]?.short}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="kicker mb-1 block">Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded border border-rule bg-paper px-2 py-1.5">
            <option value="">Todos</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="kicker mt-4" role="status">
        {list.length} fichas
      </p>
      {list.length === 0 && <p className="hatch mt-3 rounded border border-rule p-6 text-sm">Ninguna ficha cumple estos filtros.</p>}

      <ol className="mt-4 space-y-4">
        {list.map((p) => {
          const isOpen = open === p.id;
          const src = smap[p.citation.sourceId];
          const st = STATUS[p.assessment.status];
          const timeline = [{ date: p.promisedAt, text: "Compromiso publicado en el programa electoral", url: "", kind: "promesa" as const }, ...p.assessment.officialActions.map((a) => ({ ...a, kind: "accion" as const }))].sort((a, b) =>
            a.date.localeCompare(b.date),
          );
          return (
            <li key={p.id} className="rounded border border-rule">
              <button onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen} className="grid w-full gap-3 p-5 text-left hover:bg-paper-2 md:grid-cols-[1fr_260px]">
                <div>
                  <p className="kicker">
                    {p.partyIds.map((id) => pmap[id]?.shortName).join(", ")} · {tmap[p.topicId]?.short} · Legislatura {p.legislature}
                  </p>
                  <p className="display mt-1 text-2xl leading-snug">{p.promise}</p>
                  <p className="mt-1 text-sm text-ink-3">{ATTR[p.attribution]}{p.government ? ` · ${p.government}` : ""}</p>
                </div>
                <div className="flex items-start gap-3 md:justify-end">
                  <span className="display text-3xl leading-none" aria-hidden>
                    {st.glyph}
                  </span>
                  <span className="text-sm font-semibold">{st.label}</span>
                </div>
              </button>
              {isOpen && (
                <div className="grid gap-8 border-t border-rule p-5 lg:grid-cols-2">
                  <div className="space-y-5 text-sm">
                    <section>
                      <h3 className="kicker mb-1">1. Qué se prometió</h3>
                      <blockquote className="border-l-2 border-accent pl-3 font-display text-base italic">«{p.citation.quote}»</blockquote>
                      <p className="mt-1 font-mono text-xs text-ink-3">
                        {src?.title} · p. {p.citation.pdfPage} del PDF
                      </p>
                    </section>
                    <section>
                      <h3 className="kicker mb-1">2. Cuándo</h3>
                      <p>{formatDate(p.promisedAt)}</p>
                    </section>
                    <section>
                      <h3 className="kicker mb-1">Criterio de evaluación</h3>
                      <p>{p.assessment.criterion}</p>
                    </section>
                    <section>
                      <h3 className="kicker mb-1">4. Qué resultado se puede acreditar</h3>
                      <p>{p.assessment.outcome}</p>
                    </section>
                    <section>
                      <h3 className="kicker mb-1">5. Límites de la evaluación</h3>
                      <p className="text-ink-2">{p.assessment.limits}</p>
                    </section>
                    <section>
                      <h3 className="kicker mb-1">6. Fuentes</h3>
                      {src && <SourceLinks source={src} page={p.citation.pdfPage} />}
                      <p className="mt-2 text-xs text-ink-3">
                        Evaluado el {formatDate(p.assessment.assessedAt)} por {p.assessment.reviewer}. Revisión humana, sin asignación automática.
                      </p>
                    </section>
                  </div>
                  <section aria-label="Línea temporal">
                    <h3 className="kicker mb-3">3. Qué acciones constan oficialmente</h3>
                    {p.assessment.officialActions.length === 0 && <p className="text-sm text-ink-3">No se han localizado acciones oficiales con las fuentes revisadas.</p>}
                    <ol className="relative ml-2 border-l border-ink">
                      {timeline.map((a, k) => (
                        <li key={k} className="relative pb-5 pl-5">
                          <span className={`absolute -left-[6px] top-1 h-[11px] w-[11px] rounded-full border border-ink ${a.kind === "promesa" ? "bg-accent" : "bg-paper"}`} aria-hidden />
                          <p className="font-mono text-xs text-ink-3">{formatShortDate(a.date)}</p>
                          <p className="text-sm">{a.text}</p>
                          {a.url && (
                            <a href={a.url} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2">
                              Fuente oficial ↗
                            </a>
                          )}
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
