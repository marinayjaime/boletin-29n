/** Reglas puras de revisión y estado de datos (probadas en tests/consolidacion.test.ts). */
import type { HistoricalPromise } from "./schema";

const AUTOMATED = /\b(IA|Claude|asistente|autom[áa]tic\w*|GitHub|bot)\b/i;

/** Problemas de una revisión: una ficha solo cuenta como revisada si lo hizo una persona identificada. */
export function reviewProblems(r: HistoricalPromise["assessment"]["review"]): string[] {
  if (r.status === "pendiente") return [];
  const out: string[] = [];
  if (!r.reviewedBy || !r.reviewedAt) out.push(`revisión «${r.status}» sin revisor o fecha`);
  else if (AUTOMATED.test(r.reviewedBy) || r.reviewedBy === r.preparedBy) out.push("la revisión humana debe hacerla una persona distinta de quien preparó la evaluación");
  if (r.reviewedAt && r.reviewedAt < r.preparedAt) out.push("la revisión no puede ser anterior a la preparación");
  return out;
}

/** El último intento falló después de la última actualización correcta. */
export function isFailing(d: { lastSuccess?: string; lastError?: { at: string } }) {
  return !!d.lastError && (!d.lastSuccess || d.lastError.at > d.lastSuccess);
}
