import { describe, it, expect } from "vitest";
import { ABSOLUTE_MAJORITY, investiture, isMainScenario, pointSeats, setSeats, sumSeats, validateScenario } from "@/lib/seats";
import { topicCoincidence, MIN_COMPARABLE, MIN_OVERALL, overallCoincidence, topMatch } from "@/lib/quiz";
import { PARTY_THEME, contrastRatio } from "@/lib/party-theme";
import { commonForSelection, pairMatrix } from "@/lib/common";
import { formatValue } from "@/lib/format";
import { getCommonalities, getParties, getPolls, getPromises, getProposals, getQuiz, getPhotos, getGovernment, getBoeLaws } from "@/lib/data";
import fs from "node:fs";
import path from "node:path";

describe("escaños y mayorías", () => {
  it("la mayoría absoluta es 176", () => expect(ABSOLUTE_MAJORITY).toBe(176));
  it("investidura: 1.ª votación exige 176 síes; 2.ª, más síes que noes", () => {
    expect(investiture({ A: 176, B: 174 }, { A: "si", B: "no" })).toMatchObject({ first: true, second: true });
    expect(investiture({ A: 175, B: 175 }, { A: "si", B: "no" })).toMatchObject({ first: false, second: false });
    expect(investiture({ A: 170, B: 10, C: 170 }, { A: "si", B: "abst", C: "no" })).toMatchObject({ first: false, second: false });
    expect(investiture({ A: 171, B: 10, C: 169 }, { A: "si", B: "abst", C: "no" })).toMatchObject({ first: false, second: true, missingForAbsolute: 5 });
    expect(investiture({ A: 100 }, {}).no).toBe(100); // sin marcar = no
  });
  it("el reparto nunca supera 350 ni admite negativos", () => {
    let m: Record<string, number> = { A: 300, B: 0 };
    m = setSeats(m, "B", 80);
    expect(m.B).toBe(50);
    expect(sumSeats(m)).toBe(350);
    expect(setSeats(m, "A", -5).A).toBe(0);
    expect(validateScenario({ A: 351 })).toHaveLength(1);
  });
  it("las horquillas no se convierten en escaños puntuales", () => {
    expect(pointSeats({ PP: { min: 130, max: 135 }, PSOE: 100 })).toBeNull();
  });
  it("las encuestas puntuales suman 350 (contando los escaños no publicados) y tienen fuente", () => {
    const { polls } = getPolls();
    expect(polls.length).toBeGreaterThan(5);
    for (const p of polls.filter((x) => x.type === "puntual")) expect(sumSeats(pointSeats(p.seats)!) + (p.unpublishedSeats ?? 0), p.id).toBe(350);
    for (const p of polls) expect(p.url).toMatch(/^https?:\/\//);
  });
  it("solo las encuestas verificadas y completas sirven de escenario principal", () => {
    const { polls } = getPolls();
    const main = polls.filter(isMainScenario);
    expect(main.length).toBeGreaterThan(0);
    for (const p of main) expect(sumSeats(pointSeats(p.seats)!), p.id).toBe(350);
    for (const p of polls.filter((x) => x.verification.status === "no_verificable" || x.unpublishedSeats)) expect(isMainScenario(p), p.id).toBe(false);
  });
});

describe("test de coincidencias", () => {
  const q = getQuiz();
  it("calcula el porcentaje solo con evidencia suficiente", () => {
    const st = q.filter((s) => s.topicId === "vivienda");
    const answers = Object.fromEntries(st.map((s) => [s.id, "muy_acuerdo" as const]));
    const r = topicCoincidence(q, answers, "vivienda", "vox");
    expect(r.comparable).toBe(r.coincide + r.difiere);
    if (r.comparable >= MIN_COMPARABLE) expect(r.pct).toBe(Math.round((r.coincide / r.comparable) * 100));
    else expect(r.pct).toBeNull();
  });
  it("sin respuestas no hay porcentaje", () => {
    for (const p of getParties()) expect(topicCoincidence(q, {}, "vivienda", p.id).pct).toBeNull();
  });
  it("el porcentaje global suma todas las preguntas y exige un mínimo", () => {
    const answers = Object.fromEntries(q.map((s, k) => [s.id, (k % 3 === 0 ? "desacuerdo" : "acuerdo") as "acuerdo" | "desacuerdo"]));
    for (const p of getParties()) {
      const g = overallCoincidence(q, answers, p.id);
      const topics = [...new Set(q.map((s) => s.topicId))].map((t) => topicCoincidence(q, answers, t, p.id));
      expect(g.coincide).toBe(topics.reduce((a, t) => a + t.coincide, 0));
      expect(g.comparable).toBe(topics.reduce((a, t) => a + t.comparable, 0));
      expect(g.pct).toBe(g.comparable >= MIN_OVERALL ? Math.round((g.coincide / g.comparable) * 100) : null);
    }
  });
  it("solo devuelve el partido con más coincidencia (o todos los empatados)", () => {
    const answers = Object.fromEntries(q.map((s) => [s.id, "acuerdo" as const]));
    const ids = getParties().map((p) => p.id);
    const { top, all } = topMatch(q, answers, ids);
    const ratios = all.filter((c) => c.pct !== null).map((c) => c.coincide / c.comparable);
    expect(top.length).toBeGreaterThan(0);
    for (const t of top) expect(t.coincide / t.comparable).toBeCloseTo(Math.max(...ratios), 10);
    expect(topMatch(q, {}, ids).top).toEqual([]);
  });
  it("detecta empates exactos sin depender del redondeo", () => {
    const st = [
      { id: "a", topicId: "x", positions: [{ partyId: "p1", stance: "a_favor" as const }, { partyId: "p2", stance: "a_favor" as const }] },
      { id: "b", topicId: "x", positions: [{ partyId: "p1", stance: "a_favor" as const }, { partyId: "p2", stance: "a_favor" as const }] },
      { id: "c", topicId: "y", positions: [{ partyId: "p1", stance: "en_contra" as const }, { partyId: "p2", stance: "en_contra" as const }] },
      { id: "d", topicId: "y", positions: [{ partyId: "p1", stance: "a_favor" as const }, { partyId: "p2", stance: "en_contra" as const }] },
    ];
    const ans = { a: "acuerdo", b: "acuerdo", c: "acuerdo", d: "acuerdo" } as const;
    const r = topMatch(st, ans, ["p1", "p2"]);
    expect(r.top.map((t) => t.partyId)).toEqual(["p1"]);
    expect(r.top[0].pct).toBe(75);
    const tie = topMatch(st, { a: "acuerdo", b: "acuerdo", c: "acuerdo", d: "indiferente" }, ["p1", "p2"]);
    expect(tie.top).toEqual([]); // 3 comparables < mínimo
    const tie2 = topMatch([...st, { ...st[0], id: "e" }], { a: "acuerdo", b: "acuerdo", c: "acuerdo", d: "indiferente", e: "acuerdo" }, ["p1", "p2"]);
    expect(tie2.top.map((t) => t.partyId)).toEqual(["p1", "p2"]);
  });
  it("respuestas indiferentes no cuentan como comparables", () => {
    const answers = Object.fromEntries(q.map((s) => [s.id, "indiferente" as const]));
    for (const p of getParties()) expect(topicCoincidence(q, answers, "vivienda", p.id).comparable).toBe(0);
  });
});

describe("identidad de los partidos", () => {
  it("cada partido tiene un color distinto y tokens completos", () => {
    const ids = getParties().map((p) => p.id);
    expect(Object.keys(PARTY_THEME).sort()).toEqual([...ids].sort());
    const prim = ids.map((id) => PARTY_THEME[id].primary.toLowerCase());
    expect(new Set(prim).size).toBe(prim.length);
  });
  it("el texto sobre el color principal es legible (contraste ≥ 3:1, texto grande)", () => {
    for (const t of Object.values(PARTY_THEME)) expect(contrastRatio(t.primary, t.on), t.id).toBeGreaterThanOrEqual(3);
  });
  it("los tokens de globals.css coinciden con party-theme.ts", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    for (const t of Object.values(PARTY_THEME)) expect(css.toLowerCase()).toContain(`--${t.cssVar}: ${t.primary}`);
  });
  it("cada representante tiene foto con licencia libre y autor", () => {
    const photos = getPhotos();
    for (const p of getParties()) {
      const ph = photos[p.representative.photo];
      expect(ph, p.id).toBeTruthy();
      expect(ph.license).toMatch(/CC|Public domain|dominio/i);
      expect(fs.existsSync(path.join(process.cwd(), "public", ph.file))).toBe(true);
    }
  });
  it("el Gobierno procede de La Moncloa y tiene presidente", () => {
    const g = getGovernment();
    expect(g.source).toContain("lamoncloa.gob.es");
    expect(g.members.some((m) => m.role.startsWith("Presidente del Gobierno"))).toBe(true);
  });
});

describe("puntos en común", () => {
  const groups = getCommonalities();
  const props = getProposals();
  it("cada grupo reúne propuestas reales de al menos dos partidos", () => {
    const res = commonForSelection(groups, props, getParties().map((p) => p.id));
    expect(res).toHaveLength(groups.length);
  });
  it("con dos partidos solo quedan grupos compartidos por ambos", () => {
    const pm = new Map(props.map((p) => [p.id, p]));
    for (const g of commonForSelection(groups, props, ["pp", "vox"])) {
      const owners = new Set(g.members.map((m) => pm.get(m.proposalId)!.partyId));
      expect([...owners].sort()).toEqual(["pp", "vox"]);
    }
  });
  it("la matriz es simétrica", () => {
    const ids = getParties().map((p) => p.id);
    const m = pairMatrix(groups, props, ids);
    for (const a of ids) for (const b of ids) expect(m[a][b]).toBe(m[b][a]);
  });
});

describe("promesas del PSOE 2023", () => {
  const ps = getPromises().filter((p) => p.series === "psoe-2023-legislativas");
  const laws = getBoeLaws().items;
  it("evalúa los 21 compromisos legislativos identificados", () => expect(ps).toHaveLength(21));
  it("cada «cumplido» enlaza una ley publicada en el BOE presente en el registro", () => {
    for (const p of ps.filter((x) => x.assessment.status === "cumplido")) {
      const ids = p.assessment.officialActions.map((a) => a.url.match(/BOE-A-\d{4}-\d+/)?.[0]).filter(Boolean);
      expect(ids.some((id) => laws.some((l) => l.id === id)), p.id).toBe(true);
    }
  });  const all = getPromises().filter((p) => p.series?.startsWith("psoe-2023"));
  it("distingue programa del PSOE y anuncios de Sánchez", () => {
    expect(all.filter((p) => p.origin === "programa").length).toBeGreaterThan(21);
    expect(all.filter((p) => p.origin === "declaracion").length).toBeGreaterThanOrEqual(10);
    for (const p of all.filter((x) => x.origin === "declaracion")) expect(p.citation.sourceId, p.id).toBe("congreso-ds-15-pl-7");
  });
  it("una medida no legislativa nunca es «no cumplida» por falta de ley", () => {
    for (const p of all.filter((x) => x.nature !== "legislativa")) expect(p.assessment.status, p.id).not.toBe("no_cumplido");
  });
  it("toda referencia al BOE de una ficha existe en el registro", () => {
    for (const p of all)
      for (const a of p.assessment.officialActions) {
        const id = a.url.match(/BOE-A-\d{4}-\d+/)?.[0];
        if (id) expect(laws.some((l) => l.id === id), `${p.id} ${id}`).toBe(true);
      }
  });
});

describe("formato de cifras", () => {
  it("no duplica unidades", () => {
    expect(formatValue(5, "%")).toBe("5,0 %");
    expect(formatValue(100.5, "% PIB")).toBe("100,5 % del PIB");
    expect(formatValue(5, "%")).not.toMatch(/%%/);
  });
});
