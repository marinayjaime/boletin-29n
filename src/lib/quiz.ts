/**
 * Lógica pura del test a ciegas. Probada en tests/quiz.test.ts.
 * No calcula ninguna puntuación global ni ordena partidos: solo compara afirmación a afirmación.
 */
import type { Stance } from "./schema";

export const ANSWERS = [
  { id: "muy_acuerdo", label: "Muy de acuerdo", direction: 1 },
  { id: "acuerdo", label: "De acuerdo", direction: 1 },
  { id: "indiferente", label: "Indiferente o sin posición", direction: 0 },
  { id: "desacuerdo", label: "En desacuerdo", direction: -1 },
  { id: "muy_desacuerdo", label: "Muy en desacuerdo", direction: -1 },
  { id: "sin_info", label: "No tengo información suficiente", direction: 0 },
] as const;
export type AnswerId = (typeof ANSWERS)[number]["id"];
export type Answers = Record<string, AnswerId | "saltada">;

export type Relation = "coincide" | "difiere" | "matizada" | "sin_datos" | "no_comparable" | "sin_respuesta";

export function relation(answer: AnswerId | "saltada" | undefined, stance: Stance): Relation {
  if (!answer || answer === "saltada") return "sin_respuesta";
  const dir = ANSWERS.find((a) => a.id === answer)?.direction ?? 0;
  if (stance === "sin_posicion_documentada") return "sin_datos";
  if (stance === "no_comparable") return "no_comparable";
  if (dir === 0) return "no_comparable";
  if (stance === "matizada") return "matizada";
  const partyDir = stance === "a_favor" ? 1 : -1;
  return dir === partyDir ? "coincide" : "difiere";
}

export const RELATION_LABELS: Record<Relation, string> = {
  coincide: "Coincide con tu respuesta",
  difiere: "Difiere de tu respuesta",
  matizada: "Postura matizada: lee la fuente",
  sin_datos: "Sin posición documentada",
  no_comparable: "No comparable",
  sin_respuesta: "No respondiste",
};

export const STORAGE_KEY = "boletin29n.test.v1";

/** Lectura/escritura en sessionStorage: se borra al cerrar la pestaña y nunca se envía a ningún servidor. */
export function loadAnswers(): Answers {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Answers) : {};
  } catch {
    return {};
  }
}
export function saveAnswers(a: Answers) {
  try {
    if (Object.keys(a).length === 0) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  } catch {
    /* almacenamiento no disponible: el test funciona igual, sin persistencia */
  }
}
export function clearAnswers() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/** Mínimo de respuestas comparables para mostrar un porcentaje temático. */
export const MIN_COMPARABLE = 2;

export type TopicCoincidence = {
  topicId: string;
  partyId: string;
  /** Respuestas con dirección (acuerdo/desacuerdo) frente a una postura a favor/en contra documentada. */
  comparable: number;
  coincide: number;
  difiere: number;
  matizada: number;
  sinDatos: number;
  /** Porcentaje descriptivo; null si no hay evidencia suficiente. */
  pct: number | null;
};

/** Mínimo de respuestas comparables para dar un porcentaje global de un partido. */
export const MIN_OVERALL = 4;

/** Por debajo de esta base, el porcentaje se muestra con aviso de base pequeña. */
export const SMALL_BASE = 8;

type St = { id: string; topicId: string; positions: { partyId: string; stance: Stance }[] };

function count(statements: St[], answers: Answers, partyId: string, topicId: string, min: number): TopicCoincidence {
  const r: TopicCoincidence = { topicId, partyId, comparable: 0, coincide: 0, difiere: 0, matizada: 0, sinDatos: 0, pct: null };
  for (const s of statements) {
    if (topicId !== "*" && s.topicId !== topicId) continue;
    const pos = s.positions.find((p) => p.partyId === partyId);
    if (!pos) continue;
    const rel = relation(answers[s.id], pos.stance);
    if (rel === "coincide") r.coincide++;
    else if (rel === "difiere") r.difiere++;
    else if (rel === "matizada") r.matizada++;
    else if (rel === "sin_datos") r.sinDatos++;
  }
  r.comparable = r.coincide + r.difiere;
  r.pct = r.comparable >= min ? Math.round((r.coincide / r.comparable) * 100) : null;
  return r;
}

/** Coincidencia en un tema concreto (se usa en tests y en el detalle). */
export function topicCoincidence(statements: St[], answers: Answers, topicId: string, partyId: string): TopicCoincidence {
  return count(statements, answers, partyId, topicId, MIN_COMPARABLE);
}

/** Coincidencia global con un partido sobre todas las preguntas respondidas. */
export function overallCoincidence(statements: St[], answers: Answers, partyId: string): TopicCoincidence {
  return count(statements, answers, partyId, "*", MIN_OVERALL);
}

