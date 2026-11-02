/**
 * Comprobaciones de integridad referencial y de atribución.
 * La más importante: ninguna cita se atribuye a un partido distinto del autor del documento,
 * y toda cita aparece literalmente en la página indicada.
 */
import { getCorpus, getIndicators, getParties, getPromises, getProposals, getQuiz, getSeries, getSources, getTopics } from "./data";
import { getVotes } from "./data";

export function quoteInPage(quote: string, pageText: string | undefined) {
  if (!pageText) return false;
  return pageText.normalize("NFC").includes(quote.normalize("NFC"));
}

export function validateAll() {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parties = getParties();
  const pids = new Set(parties.map((p) => p.id));
  const sources = new Map(getSources().map((s) => [s.id, s]));
  const topics = new Map(getTopics().map((t) => [t.id, t]));
  const corpus = new Map(getCorpus().map((c) => [c.sourceId, c.pages]));
  const proposals = getProposals();
  const pmap = new Map(proposals.map((p) => [p.id, p]));

  if (pids.size !== parties.length) errors.push("Identificadores de partido duplicados");
  if (new Set(proposals.map((p) => p.id)).size !== proposals.length) errors.push("Identificadores de propuesta duplicados");

  for (const p of proposals) {
    if (!pids.has(p.partyId)) errors.push(`${p.id}: partido desconocido ${p.partyId}`);
    const t = topics.get(p.topicId);
    if (!t) errors.push(`${p.id}: tema desconocido ${p.topicId}`);
    else if (!t.dimensions.some((d) => d.id === p.dimensionId)) errors.push(`${p.id}: dimensión ${p.dimensionId} no existe en ${p.topicId}`);
    for (const c of p.citations) {
      const s = sources.get(c.sourceId);
      if (!s) {
        errors.push(`${p.id}: fuente desconocida ${c.sourceId}`);
        continue;
      }
      if (s.partyId !== p.partyId) errors.push(`${p.id}: ATRIBUCIÓN — la fuente ${s.id} pertenece a ${s.partyId}, no a ${p.partyId}`);
      if (s.cycle !== p.cycle) errors.push(`${p.id}: convocatoria ${p.cycle} no coincide con la de la fuente (${s.cycle})`);
      if (s.kind !== p.category && !(s.kind === "programa_anterior" && p.category === "programa_anterior")) errors.push(`${p.id}: categoría ${p.category} distinta de la fuente (${s.kind})`);
      if (s.pages && c.pdfPage > s.pages) errors.push(`${p.id}: página ${c.pdfPage} fuera de rango (${s.pages})`);
      const pages = corpus.get(c.sourceId);
      if (!pages) errors.push(`${p.id}: no hay corpus para ${c.sourceId}`);
      else if (!quoteInPage(c.quote, pages[String(c.pdfPage)])) errors.push(`${p.id}: la cita no aparece literalmente en ${c.sourceId} p. ${c.pdfPage}`);
    }
  }

  const keys = new Map<string, Set<string>>();
  for (const p of proposals) if (p.positionKey) keys.set(p.positionKey, new Set([...(keys.get(p.positionKey) ?? []), p.partyId]));
  for (const [k, s] of keys) if (s.size < 2) warnings.push(`positionKey «${k}» solo la usa un partido`);

  for (const q of getQuiz()) {
    if (!topics.has(q.topicId)) errors.push(`test ${q.id}: tema desconocido`);
    const seen = q.positions.map((x) => x.partyId);
    if (seen.length !== parties.length || new Set(seen).size !== parties.length || !seen.every((x) => pids.has(x))) errors.push(`test ${q.id}: debe tener exactamente una postura por partido`);
    for (const pos of q.positions) {
      if (pos.stance === "sin_posicion_documentada" && pos.proposalIds.length) errors.push(`test ${q.id}/${pos.partyId}: «sin posición» no puede citar propuestas`);
      if ((pos.stance === "a_favor" || pos.stance === "en_contra" || pos.stance === "matizada") && !pos.proposalIds.length) errors.push(`test ${q.id}/${pos.partyId}: postura sin propuesta que la respalde`);
      for (const id of pos.proposalIds) {
        const pr = pmap.get(id);
        if (!pr) errors.push(`test ${q.id}: propuesta ${id} no existe o no está publicada`);
        else if (pr.partyId !== pos.partyId) errors.push(`test ${q.id}: ATRIBUCIÓN — la propuesta ${id} es de ${pr.partyId}, no de ${pos.partyId}`);
      }
    }
  }

  for (const pr of getPromises()) {
    const s = sources.get(pr.citation.sourceId);
    if (!s) errors.push(`promesa ${pr.id}: fuente desconocida`);
    else {
      if (!s.partyId || !pr.partyIds.includes(s.partyId)) errors.push(`promesa ${pr.id}: ATRIBUCIÓN — la fuente es de ${s.partyId}`);
      if (!quoteInPage(pr.citation.quote, corpus.get(s.id)?.[String(pr.citation.pdfPage)])) errors.push(`promesa ${pr.id}: la cita no aparece en la página indicada`);
    }
    if (pr.assessment.status !== "no_verificable" && pr.assessment.officialActions.length === 0) errors.push(`promesa ${pr.id}: un estado concluyente exige acciones oficiales documentadas`);
  }

  for (const i of getIndicators()) {
    const s = getSeries(i.id);
    if (!s) errors.push(`indicador ${i.id}: falta data/stats/${i.id}.json (ejecuta el importador)`);
    else if (!s.observations.some((o) => o.geo === i.geos[0])) errors.push(`indicador ${i.id}: sin observaciones para ${i.geos[0]}`);
  }

  const votes = getVotes().votes;
  for (const v of votes) {
    if (v.hasDeputyDetail) {
      const sum = v.groups.reduce((a, g) => a + g.si, 0);
      if (sum !== v.totals.si) warnings.push(`votación ${v.id}: suma de síes por grupo (${sum}) ≠ total oficial (${v.totals.si})`);
    }
  }

  return {
    errors,
    warnings,
    stats: { partidos: parties.length, fuentes: sources.size, propuestas: proposals.length, test: getQuiz().length, promesas: getPromises().length, indicadores: getIndicators().length, votaciones: votes.length },
  };
}
