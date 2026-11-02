import { describe, it, expect } from "vitest";
import { classifyVote, computeResult, requiresAbsoluteMajority } from "@/lib/votes-classify";
import { hemicycleSeats } from "@/lib/hemicycle";
import { getVotes } from "@/lib/data";

describe("votaciones", () => {
  it("distingue tipos de procedimiento", () => {
    expect(classifyVote("Proposiciones no de Ley.", "x", "", "")).toBe("proposicion_no_ley");
    expect(classifyVote("Mociones consecuencia de interpelaciones urgentes.", "x", "", "")).toBe("mocion");
    expect(classifyVote("Convalidación o derogación de Reales Decretos-leyes.", "x", "", "")).toBe("real_decreto_ley");
    expect(classifyVote("Debates de totalidad de iniciativas legislativas.", "x", "", "")).toBe("enmienda_totalidad");
    expect(classifyVote("Toma en consideración de Proposiciones de Ley.", "x", "", "")).toBe("toma_consideracion");
    expect(classifyVote("Dictámenes de Comisiones sobre iniciativas legislativas.", "x", "Votación de conjunto.", "")).toBe("ley_conjunto");
    expect(classifyVote("Dictámenes de Comisiones sobre iniciativas legislativas.", "x", "Enmiendas presentadas por el Grupo Parlamentario Mixto", "Enmienda 2.")).toBe("enmiendas");
    expect(classifyVote("Enmiendas del Senado.", "x", "", "")).toBe("enmiendas");
    expect(classifyVote("Debate sobre la investidura del candidato a la Presidencia del Gobierno.", "x", "", "")).toBe("investidura");
  });
  it("aplica la mayoría absoluta en votaciones de carácter orgánico", () => {
    expect(requiresAbsoluteMajority("Dictámenes", "Votación de conjunto. Carácter orgánico")).toBe(true);
    expect(computeResult({ si: 175, no: 100, abst: 0 }, false, true)).toBe("rechazada");
    expect(computeResult({ si: 176, no: 170, abst: 0 }, false, true)).toBe("aprobada");
    expect(computeResult({ si: 10, no: 10, abst: 0 }, false)).toBe("empate");
  });
  it("los datos importados cuadran con los totales oficiales", () => {
    const { votes } = getVotes();
    expect(votes.length).toBeGreaterThan(2000);
    for (const v of votes.filter((x) => x.hasDeputyDetail)) {
      expect(v.groups.reduce((a, g) => a + g.si, 0), v.id).toBe(v.totals.si);
      expect(v.groups.reduce((a, g) => a + g.no, 0), v.id).toBe(v.totals.no);
      expect(v.groups.reduce((a, g) => a + g.abst, 0), v.id).toBe(v.totals.abst);
    }
  });
  it("la investidura de noviembre de 2023 figura con sus totales oficiales", () => {
    const inv = getVotes().votes.find((v) => v.type === "investidura" && v.date === "2023-11-16");
    expect(inv?.totals.si).toBe(179);
    expect(inv?.totals.no).toBe(171);
  });
  it("el hemiciclo coloca exactamente N escaños", () => {
    for (const n of [1, 50, 349, 350]) expect(hemicycleSeats(n)).toHaveLength(n);
  });
});
