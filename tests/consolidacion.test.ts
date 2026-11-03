import { describe, expect, it } from "vitest";
import { getBoeLaws, getDataStatus, getParties, getPromises, getQuiz, getSources, getVotes } from "@/lib/data";
import { isFailing, reviewProblems } from "@/lib/review";
import { validateAll } from "@/lib/validate";
import { MIN_OVERALL, overallCoincidence, topicCoincidence } from "@/lib/quiz";
import * as quiz from "@/lib/quiz";

const promises = getPromises();
const psoe2023 = (p: (typeof promises)[number]) => [p.citation, ...(p.alsoIn ?? [])].some((c) => ["psoe-programa-2023", "acuerdo-psoe-sumar-2023", "congreso-ds-15-pl-7"].includes(c.sourceId));

describe("resultado del test: cinco partidos, sin ganador", () => {
  it("ya no existe ninguna función que elija un partido ganador", () => {
    expect("topMatch" in quiz).toBe(false);
  });
  it("cada partido conserva su base: coincidencias, comparables y sin información", () => {
    const q = getQuiz();
    const answers = Object.fromEntries(q.map((s, k) => [s.id, (k % 2 ? "acuerdo" : "desacuerdo") as "acuerdo" | "desacuerdo"]));
    for (const p of getParties()) {
      const g = overallCoincidence(q, answers, p.id);
      expect(g.coincide + g.difiere).toBe(g.comparable);
      expect(g.comparable + g.matizada + g.sinDatos).toBeLessThanOrEqual(q.length);
      expect(g.pct === null).toBe(g.comparable < MIN_OVERALL);
      const topics = [...new Set(q.map((s) => s.topicId))].map((t) => topicCoincidence(q, answers, t, p.id));
      expect(topics.reduce((a, t) => a + t.comparable, 0)).toBe(g.comparable);
    }
  });
});

describe("acuerdo de Gobierno PSOE–Sumar (octubre de 2023)", () => {
  const src = getSources().find((s) => s.id === "acuerdo-psoe-sumar-2023");
  it("está en la biblioteca con huella y copia archivada", () => {
    expect(src?.sha256).toBe("9728b674a8135c1ea001f8b5876498df9d6b6b31049c0949fade1811f2eae285");
    expect(src?.pages).toBe(48);
    expect(src?.archiveUrl).toMatch(/^https:\/\/web\.archive\.org\//);
  });
  it("sus compromisos se atribuyen a PSOE y Sumar (Frente Amplio) como Gobierno de coalición", () => {
    const own = promises.filter((p) => p.origin === "acuerdo_gobierno");
    expect(own.length).toBeGreaterThanOrEqual(15);
    for (const p of own) {
      expect(p.citation.sourceId).toBe("acuerdo-psoe-sumar-2023");
      expect(p.partyIds).toEqual(expect.arrayContaining(["psoe", "frente-amplio"]));
      expect(p.attribution).toBe("gobierno_coalicion");
    }
  });
  it("una promesa repetida en varios documentos es una sola ficha con varias citas", () => {
    expect(promises.find((p) => p.id === "sanchez-2023-smi-ley")).toBeUndefined();
    const smi = promises.find((p) => p.id === "psoe-2023-smi-estatuto")!;
    expect(new Set([smi.citation, ...(smi.alsoIn ?? [])].map((c) => c.sourceId))).toEqual(new Set(["psoe-programa-2023", "congreso-ds-15-pl-7", "acuerdo-psoe-sumar-2023"]));
    const quotes = promises.flatMap((p) => [p.citation, ...(p.alsoIn ?? [])].map((c) => `${c.sourceId}|${c.quote}`));
    expect(new Set(quotes).size).toBe(quotes.length);
  });
  it("cubre los tres documentos del PSOE de 2023", () => {
    const docs = new Set(promises.filter(psoe2023).flatMap((p) => [p.citation, ...(p.alsoIn ?? [])].map((c) => c.sourceId)));
    for (const d of ["psoe-programa-2023", "acuerdo-psoe-sumar-2023", "congreso-ds-15-pl-7"]) expect(docs.has(d)).toBe(true);
  });
});

describe("evaluaciones de cumplimiento", () => {
  const laws = getBoeLaws().items;
  const votes = getVotes().votes;
  it("toda evaluación documenta qué se ha comprobado", () => {
    for (const p of promises) expect(p.assessment.checks.length, p.id).toBeGreaterThan(0);
  });
  it("un «no cumplido» sin acciones oficiales exige una búsqueda en el texto íntegro de las normas", () => {
    for (const p of promises.filter((x) => x.assessment.status === "no_cumplido" && x.assessment.officialActions.length === 0)) {
      expect(p.nature, p.id).toBe("legislativa");
      expect(p.assessment.checks.some((c) => c.includes("texto íntegro")), p.id).toBe(true);
    }
  });
  it("un real decreto-ley solo prueba cumplimiento si el Congreso lo convalidó", () => {
    for (const p of promises.filter((x) => x.assessment.status === "cumplido")) {
      for (const a of p.assessment.officialActions) {
        const law = laws.find((l) => a.url.includes(l.id));
        if (law?.kind !== "real_decreto_ley") continue;
        const n = law.title.match(/^Real Decreto-ley (\d+\/\d{4})/)![1];
        expect(votes.some((v) => v.type === "real_decreto_ley" && v.title.startsWith(`Real Decreto-ley ${n},`) && v.result === "aprobada"), `${p.id} RDL ${n}`).toBe(true);
      }
    }
  });
  it("la ley de grupos de interés no cuenta como cumplida: su real decreto-ley no se convalidó", () => {
    const lb = promises.find((p) => p.id === "psoe-2023-ley-lobbies")!;
    expect(lb.assessment.status).toBe("no_cumplido");
    expect(lb.assessment.officialActions.some((a) => /no convalida/i.test(a.text))).toBe(true);
  });
  it("las zonas de aceleración renovable (RDL 7/2026) corrigen una ficha antes «no cumplida»", () => {
    expect(promises.find((p) => p.id === "psoe-2023-ley-zonas-renovables")!.assessment.status).toBe("cumplido_parcial");
  });
  it("el registro distingue normas estatales y autonómicas", () => {
    const nonRd = laws.filter((l) => l.kind !== "real_decreto");
    for (const l of nonRd) expect(l.scope, l.id).toMatch(/^(estatal|autonomica)$/);
    expect(nonRd.filter((l) => l.scope === "autonomica").length).toBeGreaterThan(100);
    expect(laws.find((l) => l.id === "BOE-A-2024-3099")?.kind).toBe("reforma_constitucional");
  });
});

describe("estado de revisión verificable", () => {
  const base = { preparedBy: "Asistente de IA (Claude) con fuentes oficiales", preparedAt: "2026-11-03" };
  it("ninguna ficha dice estar revisada por una persona sin estarlo", () => {
    for (const p of promises) expect(reviewProblems(p.assessment.review), p.id).toEqual([]);
    expect(promises.every((p) => p.assessment.review.status === "pendiente")).toBe(true);
  });
  it("rechaza revisiones sin revisor, automáticas o hechas por quien preparó la ficha", () => {
    expect(reviewProblems({ ...base, status: "revisada" })).not.toEqual([]);
    expect(reviewProblems({ ...base, status: "revisada", reviewedBy: "Claude", reviewedAt: "2026-11-04" })).not.toEqual([]);
    expect(reviewProblems({ ...base, status: "revisada", reviewedBy: "GitHub Actions", reviewedAt: "2026-11-04" })).not.toEqual([]);
    expect(reviewProblems({ ...base, status: "corregida", reviewedBy: base.preparedBy, reviewedAt: "2026-11-04" })).not.toEqual([]);
    expect(reviewProblems({ ...base, status: "revisada", reviewedBy: "Ana Pérez (periodista)", reviewedAt: "2026-11-01" })).not.toEqual([]);
    expect(reviewProblems({ ...base, status: "revisada", reviewedBy: "Ana Pérez (periodista)", reviewedAt: "2026-11-04" })).toEqual([]);
  });
  it("el conjunto de datos completo pasa la validación", () => {
    expect(validateAll().errors).toEqual([]);
  });
});

describe("estado de los datos", () => {
  it("distingue fallo reciente de actualización correcta", () => {
    expect(isFailing({ lastSuccess: "2026-11-03T07:00:00Z", lastError: { at: "2026-11-02T11:00:00Z" } })).toBe(false);
    expect(isFailing({ lastSuccess: "2026-11-02T07:00:00Z", lastError: { at: "2026-11-03T11:00:00Z" } })).toBe(true);
    expect(isFailing({ lastError: { at: "2026-11-03T11:00:00Z" } })).toBe(true);
    expect(isFailing({ lastSuccess: "2026-11-03T07:00:00Z" })).toBe(false);
  });
  it("cada revisión editorial declara si fue humana; ninguna lo es todavía", () => {
    const st = getDataStatus();
    for (const [id, e] of Object.entries(st.editorial)) {
      expect(typeof e.human, id).toBe("boolean");
      if (!e.human) expect(e.by, id).toMatch(/IA|Claude/);
    }
    for (const id of ["eurostat", "boe", "congreso"]) expect(st.datasets[id]?.lastSuccess, id).toBeTruthy();
  });
});
