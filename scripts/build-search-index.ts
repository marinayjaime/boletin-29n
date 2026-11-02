/**
 * Genera public/data/search-docs.json: documentos para el buscador del navegador.
 *  - Propuestas verificadas (con resumen y cita).
 *  - Pasajes del texto completo de cada programa indexado (fragmentos de ~3 frases con su página).
 *  - Votaciones de leyes, decretos-leyes y tomas en consideración.
 * No genera texto nuevo: solo trocea documentos existentes.
 */
import fs from "node:fs";
import path from "node:path";
import { getCorpus, getProposals, getSources, getVotes, getGlossary } from "../src/lib/data";

const OUT = path.join(process.cwd(), "public", "data", "search-docs.json");

type Doc = { id: string; k: "propuesta" | "pasaje" | "votacion" | "glosario"; party: string | null; src: string | null; page: number | null; title: string; text: string; url: string; date: string | null };

const docs: Doc[] = [];
const sources = getSources();
const srcParty = Object.fromEntries(sources.map((s) => [s.id, s.partyId]));
const srcDate = Object.fromEntries(sources.map((s) => [s.id, s.published]));

for (const p of getProposals()) {
  const c = p.citations[0];
  docs.push({
    id: `prop:${p.id}`,
    k: "propuesta",
    party: p.partyId,
    src: c.sourceId,
    page: c.pdfPage,
    title: p.summary,
    text: c.quote,
    url: `/comparador?p=${p.partyId}&t=${p.topicId}`,
    date: srcDate[c.sourceId] ?? null,
  });
}

for (const corpus of getCorpus()) {
  for (const [page, text] of Object.entries(corpus.pages)) {
    if (text.length < 80) continue;
    const sentences = text.split(/(?<=[.;:])\s+(?=[A-ZÁÉÍÓÚÑ¿¡•●])/);
    let buf = "";
    let n = 0;
    const flush = () => {
      if (buf.trim().length > 60) {
        docs.push({
          id: `pas:${corpus.sourceId}:${page}:${n++}`,
          k: "pasaje",
          party: srcParty[corpus.sourceId] ?? null,
          src: corpus.sourceId,
          page: Number(page),
          title: "",
          text: buf.trim(),
          url: "",
          date: srcDate[corpus.sourceId] ?? null,
        });
      }
      buf = "";
    };
    for (const s of sentences) {
      buf += (buf ? " " : "") + s;
      if (buf.length > 520) flush();
    }
    flush();
  }
}

for (const v of getVotes().votes) {
  if (!["ley_conjunto", "ley_dictamen", "real_decreto_ley", "toma_consideracion", "enmienda_totalidad", "investidura"].includes(v.type)) continue;
  docs.push({
    id: `vot:${v.id}`,
    k: "votacion",
    party: null,
    src: "congreso-votaciones",
    page: null,
    title: v.title || v.section,
    text: `${v.section} ${v.subgroupText ?? ""} Resultado: ${v.result}. Sí ${v.totals.si}, no ${v.totals.no}, abstenciones ${v.totals.abst}.`,
    url: `/votaciones/${v.id}`,
    date: v.date,
  });
}

for (const g of getGlossary()) {
  docs.push({ id: `glo:${g.slug}`, k: "glosario", party: null, src: null, page: null, title: g.term, text: g.definition, url: `/glosario#${g.slug}`, date: null });
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(docs));
console.log(`search-docs.json: ${docs.length} documentos, ${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB`);
