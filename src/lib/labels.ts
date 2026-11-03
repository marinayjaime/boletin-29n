import type { SourceKindT, Stance, HistoricalPromise } from "./schema";

export const CATEGORY_LABELS: Record<SourceKindT, string> = {
  programa_2026: "Programa electoral 2026",
  propuesta_2026: "Propuesta anunciada en 2026",
  programa_anterior: "Programa electoral anterior",
  declaracion: "Declaración pública",
  iniciativa_parlamentaria: "Iniciativa parlamentaria",
  votacion: "Votación registrada",
  ley: "Ley aprobada",
  boe: "Boletín Oficial del Estado",
  estadistica: "Estadística oficial",
  periodistica: "Fuente periodística (contexto)",
};

export const CYCLE_LABELS: Record<string, string> = {
  "generales-2026": "Generales 29-N 2026",
  "generales-2023": "Generales 23-J 2023",
  "generales-2019-11": "Generales 10-N 2019",
  "europeas-2024": "Europeas 2024",
  "investidura-2023": "Investidura nov. 2023",
  "acuerdo-gobierno-2023": "Acuerdo de Gobierno oct. 2023",
};

export const STANCE_LABELS: Record<Stance, { label: string; short: string }> = {
  a_favor: { label: "Postura documentada a favor", short: "A favor" },
  en_contra: { label: "Postura documentada en contra", short: "En contra" },
  matizada: { label: "Postura matizada o indirecta", short: "Matizada" },
  sin_posicion_documentada: { label: "Sin posición documentada", short: "Sin documentar" },
  no_comparable: { label: "No comparable", short: "No comparable" },
};

export const VERIFICATION_LABELS = {
  verificado: "Documento verificado",
  copia_tercero: "Copia alojada por un tercero",
  pendiente: "Pendiente de verificar",
} as const;

export function pdfLink(url: string, page: number) {
  return `${url}#page=${page}`;
}

export const PROMISE_STATUS: Record<HistoricalPromise["assessment"]["status"], { label: string; glyph: string }> = {
  cumplido: { label: "Cumplido según el criterio documentado", glyph: "●" },
  cumplido_parcial: { label: "Cumplido parcialmente", glyph: "◐" },
  en_tramitacion: { label: "En tramitación", glyph: "◌" },
  no_cumplido: { label: "No cumplido al cierre del periodo", glyph: "○" },
  no_verificable: { label: "No verificable con las fuentes disponibles", glyph: "?" },
};
