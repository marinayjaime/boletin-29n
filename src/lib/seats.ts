/**
 * Cálculos de escaños y mayorías (puros, probados en tests/seats.test.ts).
 *
 * Reglas (Constitución, art. 99; Reglamento del Congreso):
 *  - Mayoría absoluta del Congreso: 176 de 350.
 *  - Investidura, primera votación: síes ≥ mayoría absoluta.
 *  - Investidura, segunda votación (48 h después): más síes que noes (mayoría simple).
 */
export const TOTAL_SEATS = 350;
export const ABSOLUTE_MAJORITY = Math.floor(TOTAL_SEATS / 2) + 1;

export type SeatMap = Record<string, number>;
export type Vote = "si" | "no" | "abst";

export function sumSeats(m: SeatMap, keys?: string[]) {
  return Object.entries(m)
    .filter(([k]) => !keys || keys.includes(k))
    .reduce((a, [, v]) => a + (Number.isFinite(v) ? v : 0), 0);
}

export function validateScenario(m: SeatMap, total = TOTAL_SEATS): string[] {
  const errors: string[] = [];
  for (const [k, v] of Object.entries(m)) if (!Number.isInteger(v) || v < 0) errors.push(`${k}: valor no válido`);
  const s = sumSeats(m);
  if (s > total) errors.push(`Hay ${s - total} escaños de más (máximo ${total}).`);
  return errors;
}

export function investiture(m: SeatMap, votes: Record<string, Vote>) {
  let si = 0;
  let no = 0;
  let abst = 0;
  for (const [k, seats] of Object.entries(m)) {
    const v = votes[k] ?? "no";
    if (v === "si") si += seats;
    else if (v === "abst") abst += seats;
    else no += seats;
  }
  const first = si >= ABSOLUTE_MAJORITY;
  const second = si > no;
  return { si, no, abst, first, second, missingForAbsolute: Math.max(0, ABSOLUTE_MAJORITY - si) };
}

/** Ajusta un valor manteniendo el total ≤ máximo (el exceso se recorta al editar). */
export function setSeats(m: SeatMap, key: string, value: number, total = TOTAL_SEATS): SeatMap {
  const others = sumSeats(m) - (m[key] ?? 0);
  const v = Math.max(0, Math.min(Math.round(value), total - others));
  return { ...m, [key]: v };
}

/** Las horquillas no se convierten en cifras puntuales: solo se aceptan encuestas puntuales. */
export function pointSeats(seats: Record<string, number | { min: number; max: number }>): SeatMap | null {
  const out: SeatMap = {};
  for (const [k, v] of Object.entries(seats)) {
    if (typeof v !== "number") return null;
    out[k] = v;
  }
  return out;
}
