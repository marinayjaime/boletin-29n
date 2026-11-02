import { describe, it, expect } from "vitest";
import { buildMatrix, clampSelection, alphabetical, encodeCompareState } from "@/lib/compare";
import { getParties, getProposals, getTopics } from "@/lib/data";

const proposals = getProposals();
const topics = getTopics();
const ids = getParties().map((p) => p.id);

function combos(arr: string[]) {
  const out: string[][] = [];
  for (let m = 1; m < 1 << arr.length; m++) {
    const c = arr.filter((_, i) => m & (1 << i));
    if (c.length >= 2) out.push(c);
  }
  return out;
}

describe("comparador", () => {
  it("funciona con las 26 combinaciones de 2 a 5 partidos y nunca atribuye una propuesta a otra columna", () => {
    const all = combos(ids);
    expect(all).toHaveLength(26);
    for (const sel of all)
      for (const t of topics)
        for (const mode of ["todo", "diferencias"] as const)
          for (const row of buildMatrix(proposals, t, sel, mode)) {
            expect(row.cells.map((c) => c.partyId)).toEqual(sel);
            for (const cell of row.cells)
              for (const p of [...cell.proposals, ...cell.hiddenAsCoincidence]) {
                expect(p.partyId).toBe(cell.partyId);
                expect(p.topicId).toBe(t.id);
                expect(p.dimensionId).toBe(row.dimensionId);
              }
          }
  });
  it("en «Mostrar todo» no se pierde ninguna propuesta", () => {
    for (const t of topics) {
      const rows = buildMatrix(proposals, t, ids, "todo");
      const shown = rows.flatMap((r) => r.cells.flatMap((c) => c.proposals.map((p) => p.id))).sort();
      expect(shown).toEqual(proposals.filter((p) => p.topicId === t.id).map((p) => p.id).sort());
    }
  });
  it("«Solo diferencias» oculta solo coincidencias compartidas por todos los seleccionados", () => {
    const viv = topics.find((t) => t.id === "vivienda")!;
    const rows = buildMatrix(proposals, viv, ["pp", "vox"], "diferencias");
    const hidden = rows.flatMap((r) => r.cells.flatMap((c) => c.hiddenAsCoincidence.map((p) => p.id)));
    expect(hidden.sort()).toEqual(["pp-vivienda-02", "vox-vivienda-05"]);
    const rows3 = buildMatrix(proposals, viv, ["pp", "vox", "psoe"], "diferencias");
    expect(rows3.flatMap((r) => r.cells.flatMap((c) => c.hiddenAsCoincidence))).toHaveLength(0);
  });
  it("la selección se limita a 2–5 partidos válidos", () => {
    expect(clampSelection(["pp"], ids).length).toBeGreaterThanOrEqual(2);
    expect(clampSelection(["pp", "psoe", "xx"], ids)).toEqual(["pp", "psoe"]);
    expect(clampSelection([...ids, ...ids], ids)).toHaveLength(5);
  });
  it("el orden inicial es alfabético", () => {
    expect(alphabetical(getParties()).map((p) => p.shortName)).toEqual(["Frente Amplio", "Podemos", "PP", "PSOE", "Vox"]);
  });
  it("el estado se codifica en la URL", () => {
    expect(encodeCompareState({ parties: ["pp", "vox"], topic: "vivienda", mode: "diferencias" })).toBe("p=pp%2Cvox&t=vivienda&m=diferencias");
  });
});
