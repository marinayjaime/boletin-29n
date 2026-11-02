import { describe, it, expect } from "vitest";
import { parseJsonStat } from "@/lib/jsonstat";

const sample = {
  label: "Prueba",
  updated: "2026-10-01",
  id: ["freq", "unit", "geo", "time"],
  size: [1, 1, 2, 3],
  dimension: {
    freq: { category: { index: { A: 0 } } },
    unit: { category: { index: { PC: 0 } } },
    geo: { category: { index: { ES: 0, FR: 1 } } },
    time: { category: { index: { "2023": 0, "2024": 1, "2025": 2 } } },
  },
  value: { "0": 1, "1": 2, "3": 10, "5": 12 },
  status: { "1": "p" },
};

describe("JSON-stat", () => {
  it("convierte índices planos en observaciones sin rellenar huecos", () => {
    const r = parseJsonStat(sample);
    expect(r.observations).toEqual([
      { geo: "ES", period: "2023", value: 1 },
      { geo: "ES", period: "2024", value: 2, flag: "p" },
      { geo: "FR", period: "2023", value: 10 },
      { geo: "FR", period: "2025", value: 12 },
    ]);
  });
  it("rechaza consultas que mezclan varias series", () => {
    expect(() => parseJsonStat({ ...sample, size: [1, 2, 2, 3] })).toThrow(/uno solo/);
  });
});
