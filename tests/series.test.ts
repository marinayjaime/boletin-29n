import { describe, it, expect } from "vitest";
import { rebase, deflate, periodKey, toCSV, yearValue, filterYears } from "@/lib/series";

describe("series", () => {
  it("ordena periodos anuales, trimestrales, semestrales y mensuales", () => {
    const ps = ["2024-Q2", "2024", "2024-01", "2024-S2", "2023-12"];
    expect([...ps].sort((a, b) => periodKey(a) - periodKey(b))).toEqual(["2023-12", "2024-01", "2024-Q2", "2024", "2024-S2"]);
  });
  it("rebasa a 100 y rechaza bases no positivas", () => {
    expect(rebase([{ geo: "ES", period: "2020", value: 50 }, { geo: "ES", period: "2021", value: 75 }])!.map((o) => o.value)).toEqual([100, 150]);
    expect(rebase([{ geo: "ES", period: "2020", value: -1 }])).toBeNull();
  });
  it("deflacta a euros del último año común", () => {
    const nom = [{ geo: "ES", period: "2020", value: 100 }, { geo: "ES", period: "2021", value: 110 }];
    const idx = [{ geo: "ES", period: "2020", value: 100 }, { geo: "ES", period: "2021", value: 110 }];
    expect(deflate(nom, idx).map((o) => o.value)).toEqual([110, 110]);
  });
  it("descarta años sin deflactor en lugar de inventarlos", () => {
    expect(deflate([{ geo: "ES", period: "2019", value: 1 }], [{ geo: "ES", period: "2020", value: 100 }])).toEqual([]);
  });
  it("genera CSV con metadatos de fuente", () => {
    const csv = toCSV([{ geo: "ES", period: "2025", value: 1.5 }], { indicator: "X", unit: "%", source: "https://e", fetchedAt: "2026-11-02" });
    expect(csv).toContain("# Fuente: https://e");
    expect(csv.trim().endsWith("ES,2025,1.5,")).toBe(true);
  });
  it("compara años con la media de subperiodos y filtra rangos", () => {
    const s = [{ geo: "ES", period: "2025-01", value: 2 }, { geo: "ES", period: "2025-02", value: 4 }, { geo: "ES", period: "2026-01", value: 9 }];
    expect(yearValue(s, 2025)).toEqual({ value: 3, n: 2 });
    expect(yearValue(s, 2024)).toBeNull();
    expect(filterYears(s, 2026, 2026)).toHaveLength(1);
  });
});
