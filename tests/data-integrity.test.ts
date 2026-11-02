import { describe, it, expect } from "vitest";
import { validateAll, quoteInPage } from "@/lib/validate";
import { getProposals, getSources, getCorpus, getParties, getQuiz } from "@/lib/data";

describe("integridad de los datos", () => {
  const res = validateAll();
  it("no hay errores de validación (citas literales, atribución, referencias)", () => {
    expect(res.errors).toEqual([]);
  });
  it("cada cita aparece literalmente en la página del PDF indicada", () => {
    const corpus = new Map(getCorpus().map((c) => [c.sourceId, c.pages]));
    for (const p of getProposals()) for (const c of p.citations) expect(quoteInPage(c.quote, corpus.get(c.sourceId)?.[String(c.pdfPage)]), `${p.id}`).toBe(true);
  });
  it("ninguna propuesta se atribuye a un partido distinto del autor del documento", () => {
    const src = new Map(getSources().map((s) => [s.id, s]));
    for (const p of getProposals()) for (const c of p.citations) expect(src.get(c.sourceId)?.partyId, p.id).toBe(p.partyId);
  });
  it("el programa de Sumar 2023 solo se usa en la columna de Frente Amplio, nunca en la de Podemos", () => {
    const podemos = getProposals().filter((p) => p.partyId === "podemos");
    expect(podemos.every((p) => p.citations.every((c) => c.sourceId.startsWith("podemos-")))).toBe(true);
  });
  it("no se presenta ningún documento anterior como programa 2026", () => {
    expect(getProposals().filter((p) => p.category === "programa_2026" && !p.cycle.includes("2026"))).toEqual([]);
  });
  it("hay exactamente cinco partidos y el test tiene entre 20 y 30 afirmaciones", () => {
    expect(getParties()).toHaveLength(5);
    expect(getQuiz().length).toBeGreaterThanOrEqual(20);
    expect(getQuiz().length).toBeLessThanOrEqual(30);
  });
  it("las afirmaciones del test no nombran partidos (test a ciegas)", () => {
    const names = /\b(PP|PSOE|Vox|Podemos|Sumar|Frente Amplio|Partido Popular|socialista)\b/i;
    for (const q of getQuiz()) expect(names.test(q.statement), q.id).toBe(false);
  });
});
