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
