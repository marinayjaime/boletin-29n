"use client";

import { asset } from "@/lib/asset";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type MiniSearch from "minisearch";
import { createIndex, normalize, stem, tokenize, type SearchDoc } from "@/lib/search";
import { SearchBox } from "./search-box";
import { PartyMark } from "./party-mark";
import { formatShortDate } from "@/lib/format";

type PartyLite = { id: string; shortName: string; monogram: string };
type SourceLite = { id: string; title: string; officialUrl: string; archiveUrl: string | null; hostedByThirdParty: boolean; cycleLabel: string };

function Highlight({ text, terms, max = 420 }: { text: string; terms: string[]; max?: number }) {
  // recorta alrededor de la primera coincidencia y resalta términos
  const n = normalize(text);
  let first = -1;
  for (const t of terms) {
    const i = n.search(new RegExp(`\\b${t}`));
    if (i >= 0 && (first < 0 || i < first)) first = i;
  }
  const start = Math.max(0, first - 120);
  const slice = text.slice(start, start + max);
  const parts: React.ReactNode[] = [];
  const re = terms.length ? new RegExp(`\\b(${terms.join("|")})[a-zñ]*`, "gi") : null;
  if (!re) return <>{slice}</>;
  const ns = normalize(slice);
  let last = 0;
  for (const m of ns.matchAll(re)) {
    const i = m.index ?? 0;
    parts.push(slice.slice(last, i));
    parts.push(
      <mark key={i} className="bg-accent-soft text-ink">
        {slice.slice(i, i + m[0].length)}
      </mark>,
    );
    last = i + m[0].length;
  }
  parts.push(slice.slice(last));
  return (
    <>
      {start > 0 && "… "}
      {parts}
      {start + max < text.length && " …"}
    </>
  );
}

export function SearchResults({ parties, sources }: { parties: PartyLite[]; sources: SourceLite[] }) {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const kind = sp.get("tipo") ?? "todo";
  const partyFilter = sp.get("partido") ?? "";
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState<MiniSearch<SearchDoc> | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch(asset("/data/search-docs.json"))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: SearchDoc[]) => {
        if (cancel) return;
        setDocs(d);
        setIndex(createIndex(d));
      })
      .catch((e) => setError(`No se pudo cargar el índice documental (${e.message}). Comprueba tu conexión y recarga la página.`));
    return () => {
      cancel = true;
    };
  }, []);

  const byId = useMemo(() => new Map((docs ?? []).map((d) => [d.id, d])), [docs]);
  const terms = useMemo(() => tokenize(q).map(stem), [q]);
  const results = useMemo(() => {
    if (!index || !q.trim()) return [];
    return index
      .search(q)
      .map((r) => ({ doc: byId.get(r.id as string)!, score: r.score }))
      .filter((r) => r.doc && (!partyFilter || r.doc.party === partyFilter));
  }, [index, q, byId, partyFilter]);

  const pmap = Object.fromEntries(parties.map((p) => [p.id, p]));
  const smap = Object.fromEntries(sources.map((s) => [s.id, s]));
  const props = results.filter((r) => r.doc.k === "propuesta");
  const passages = results.filter((r) => r.doc.k === "pasaje");
  const votes = results.filter((r) => r.doc.k === "votacion");
  const gloss = results.filter((r) => r.doc.k === "glosario");

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(sp.toString());
    if (v) n.set(k, v);
    else n.delete(k);
    window.history.replaceState(null, "", `/buscar?${n.toString()}`);
  };

  const show = (k: string) => kind === "todo" || kind === k;

  return (
    <div>
      <SearchBox key={q} placeholder="Escribe una pregunta o palabras clave" initial={q} autoFocus={!q} />
      <div className="mt-4 flex flex-wrap gap-2 text-sm" role="group" aria-label="Filtros">
        {[
          ["todo", "Todo"],
          ["propuesta", `Propuestas (${props.length})`],
          ["pasaje", `Pasajes de programas (${passages.length})`],
          ["votacion", `Votaciones (${votes.length})`],
          ["glosario", `Glosario (${gloss.length})`],
        ].map(([k, l]) => (
          <button key={k} aria-pressed={kind === k} onClick={() => setParam("tipo", k === "todo" ? "" : k)} className={`rounded-full border px-3 py-1 ${kind === k ? "border-ink bg-ink text-paper" : "border-rule"}`}>
            {l}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2">
          <span className="kicker">Partido</span>
          <select value={partyFilter} onChange={(e) => setParam("partido", e.target.value)} className="rounded border border-rule bg-paper px-2 py-1">
            <option value="">Todos</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shortName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="mt-8 rounded border border-no p-4 text-sm">{error}</p>}
      {!docs && !error && (
        <p className="mt-8 text-sm text-ink-3" role="status">
          Cargando el índice documental (≈3 MB, una sola vez)…
        </p>
      )}
      {docs && q && results.length === 0 && (
        <div className="mt-8 rounded border border-rule p-6">
          <p className="display text-2xl">Sin resultados en los documentos indexados</p>
          <p className="mt-2 text-sm text-ink-2">Prueba con otras palabras (por ejemplo, «alquiler», «hipoteca», «jornada»). La plataforma no genera respuestas: solo muestra texto que existe en los documentos.</p>
        </div>
      )}

      {docs && q && props.length > 0 && show("propuesta") && (
        <section className="mt-10" aria-labelledby="r-prop">
          <h2 id="r-prop" className="kicker mb-4">
            Propuestas verificadas, por partido (orden alfabético)
          </h2>
          <div className="lane -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
            {parties
              .filter((p) => !partyFilter || p.id === partyFilter)
              .map((p) => {
                const mine = props.filter((r) => r.doc.party === p.id).slice(0, 4);
                return (
                  <div key={p.id} className="w-[78vw] shrink-0 md:w-auto">
                    <div className="mb-3 flex items-center gap-2 border-b-2 border-ink pb-2">
                      <PartyMark monogram={p.monogram} size={28} />
                      <span className="font-semibold">{p.shortName}</span>
                    </div>
                    {mine.length === 0 ? (
                      <p className="hatch rounded border border-dashed border-rule p-3 text-sm text-ink-3">Sin propuestas indexadas que coincidan</p>
                    ) : (
                      <ul className="space-y-3">
                        {mine.map(({ doc }) => (
                          <li key={doc.id} className="rounded border border-rule p-3">
                            <Link href={doc.url} className="block text-sm font-medium leading-snug hover:underline">
                              {doc.title}
                            </Link>
                            <p className="mt-2 text-xs italic leading-relaxed text-ink-2">
                              «<Highlight text={doc.text} terms={terms} max={220} />»
                            </p>
                            <p className="mt-2 font-mono text-[0.65rem] text-ink-3">
                              {smap[doc.src ?? ""]?.cycleLabel} · p. {doc.page}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {docs && q && passages.length > 0 && show("pasaje") && (
        <section className="mt-12" aria-labelledby="r-pas">
          <h2 id="r-pas" className="kicker mb-1">
            Pasajes del texto completo de los programas
          </h2>
          <p className="mb-4 text-xs text-ink-3">Texto extraído automáticamente de los PDF. Puede contener cortes de maquetación; consulta siempre la página original.</p>
          <ol className="divide-y divide-rule border-y border-rule">
            {passages.slice(0, kind === "pasaje" ? 60 : 12).map(({ doc }) => {
              const s = smap[doc.src ?? ""];
              const p = doc.party ? pmap[doc.party] : null;
              const href = s ? `${s.archiveUrl ?? s.officialUrl}#page=${doc.page}` : "#";
              return (
                <li key={doc.id} className="grid min-w-0 grid-cols-1 gap-2 py-4 md:grid-cols-[180px_1fr]">
                  <div className="text-sm">
                    <p className="font-semibold">{p?.shortName ?? "—"}</p>
                    <p className="text-xs text-ink-3">{s?.cycleLabel}</p>
                  </div>
                  <div>
                    <p className="break-words leading-relaxed text-ink-2">
                      <Highlight text={doc.text} terms={terms} />
                    </p>
                    <a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-block break-words rounded-xl bg-surface-2 px-2.5 py-1 text-xs font-bold text-ink-2 hover:bg-surface-3">
                      {s?.title.slice(0, 60)}… · p. {doc.page} ↗
                    </a>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {docs && q && votes.length > 0 && show("votacion") && (
        <section className="mt-12" aria-labelledby="r-vot">
          <h2 id="r-vot" className="kicker mb-4">
            Votaciones del Congreso
          </h2>
          <ul className="divide-y divide-rule border-y border-rule">
            {votes.slice(0, kind === "votacion" ? 50 : 8).map(({ doc }) => (
              <li key={doc.id} className="py-3">
                <Link href={doc.url} className="hover:underline">
                  {doc.title}
                </Link>
                <p className="font-mono text-xs text-ink-3">{doc.date ? formatShortDate(doc.date) : ""}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {docs && q && gloss.length > 0 && show("glosario") && (
        <section className="mt-12" aria-labelledby="r-glo">
          <h2 id="r-glo" className="kicker mb-4">
            Glosario
          </h2>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {gloss.slice(0, 6).map(({ doc }) => (
              <li key={doc.id} className="rounded border border-rule p-3">
                <Link href={doc.url} className="font-semibold hover:underline">
                  {doc.title}
                </Link>
                <p className="mt-1 text-sm text-ink-2">{doc.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
