import { describe, it, expect } from "vitest";
import { relation } from "@/lib/quiz";

describe("test a ciegas", () => {
  it("compara respuesta y postura sin inventar coincidencias", () => {
    expect(relation("muy_acuerdo", "a_favor")).toBe("coincide");
    expect(relation("acuerdo", "en_contra")).toBe("difiere");
    expect(relation("desacuerdo", "en_contra")).toBe("coincide");
    expect(relation("muy_desacuerdo", "a_favor")).toBe("difiere");
    expect(relation("acuerdo", "matizada")).toBe("matizada");
    expect(relation("acuerdo", "sin_posicion_documentada")).toBe("sin_datos");
    expect(relation("indiferente", "a_favor")).toBe("no_comparable");
    expect(relation("sin_info", "en_contra")).toBe("no_comparable");
    expect(relation("saltada", "a_favor")).toBe("sin_respuesta");
    expect(relation(undefined, "a_favor")).toBe("sin_respuesta");
  });
  it("la lógica del test no expone ninguna puntuación global", async () => {
    const mod = await import("@/lib/quiz");
    expect(Object.keys(mod).some((k) => /score|ranking|afinidad|recomend/i.test(k))).toBe(false);
  });
});
