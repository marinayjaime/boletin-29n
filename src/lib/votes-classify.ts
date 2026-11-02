/**
 * Clasificación de votaciones del Congreso por tipo de procedimiento y por tema.
 *
 * El tipo se deduce del epígrafe oficial del orden del día («titulo» en el JSON del Congreso)
 * y del subgrupo de la votación. Es una clasificación documental, no una valoración.
 * Los temas se asignan por palabras clave del título del expediente: son orientativos
 * y se muestran como tales.
 */
import type { VoteType } from "./schema";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function classifyVote(section: string, title: string, subgroup: string, subgroupText: string): VoteType {
  const s = norm(section);
  const t = norm(title);
  const sub = norm(`${subgroup} ${subgroupText}`);
  if (/investidura/.test(s) || /investidura/.test(t)) return "investidura";
  if (/avocacion/.test(s) || /avocacion/.test(sub)) return "otros";
  if (/presupuestos generales del estado/.test(t) && /totalidad/.test(s)) return "presupuestos";
  if (/convalidacion|reales decretos-leyes|real decreto-ley/.test(s)) return "real_decreto_ley";
  if (/totalidad/.test(s)) return "enmienda_totalidad";
  if (/toma en consideracion/.test(s)) return "toma_consideracion";
  if (/proposiciones? no de ley/.test(s) && !/mociones/.test(s)) return "proposicion_no_ley";
  if (/mocion/.test(s)) return "mocion";
  if (/convenios internacionales|tratados/.test(s)) return "tratado";
  if (/enmiendas del senado|veto del senado/.test(s)) return "enmiendas";
  if (/lectura unica/.test(s)) return "ley_conjunto";
  if (/dictamen(es)? de comisiones sobre iniciativas legislativas/.test(s)) {
    if (/votacion de conjunto|caracter organico/.test(sub)) return "ley_conjunto";
    if (/enmienda|voto particular|votos particulares|transaccional/.test(sub)) return "enmiendas";
    return "ley_dictamen";
  }
  return "otros";
}

export const VOTE_TYPE_LABELS: Record<VoteType, { label: string; help: string }> = {
  ley_conjunto: { label: "Votación de conjunto de una ley", help: "Votación final del texto completo: votación de conjunto (leyes orgánicas, mayoría absoluta) o lectura única." },
  ley_dictamen: { label: "Votación del dictamen de una ley", help: "Votación en Pleno del texto elaborado por la comisión. En leyes no orgánicas suele ser la votación del texto completo." },
  enmiendas: { label: "Enmiendas a una ley", help: "Votación de enmiendas, votos particulares o enmiendas del Senado: afecta a partes concretas, no al texto completo." },
  enmienda_totalidad: { label: "Enmienda a la totalidad", help: "Si se aprueba, el proyecto de ley se devuelve al Gobierno o se sustituye por un texto alternativo." },
  toma_consideracion: { label: "Toma en consideración", help: "Decide si una proposición de ley empieza su tramitación. No es la aprobación de la ley." },
  real_decreto_ley: { label: "Convalidación de real decreto-ley", help: "El Congreso convalida o deroga un decreto-ley del Gobierno, ya en vigor, en un plazo de 30 días." },
  proposicion_no_ley: { label: "Proposición no de ley", help: "Pide al Gobierno que actúe en un sentido. No tiene fuerza de ley." },
  mocion: { label: "Moción", help: "Moción consecuencia de interpelación. Expresa la posición de la Cámara; no tiene fuerza de ley." },
  tratado: { label: "Tratado o convenio internacional", help: "Autorización para que España se obligue por un tratado." },
  presupuestos: { label: "Presupuestos", help: "Debate de totalidad de los Presupuestos Generales del Estado." },
  investidura: { label: "Investidura", help: "Votación de confianza a la persona candidata a la Presidencia del Gobierno." },
  otros: { label: "Otros procedimientos", help: "Otros asuntos: dictámenes, informes, solicitudes, etc." },
};

const TOPIC_RULES: [string, RegExp][] = [
  ["vivienda", /vivienda|alquiler|arrendamiento|desahucio|okupa|ocupacion ilegal|suelo|hipotec/],
  ["fiscalidad", /impuesto|tribut|fiscal|irpf|iva\b|gravamen|grandes fortunas/],
  ["empleo", /trabaj|empleo|salario|laboral|jornada|desemple|autonom/],
  ["pensiones", /pension|jubilaci|seguridad social/],
  ["sanidad", /sanid|sanitari|salud|medicament|hospital/],
  ["educacion", /educa|escuela|universi|becas|formacion profesional/],
  ["inmigracion", /migra|extranjer|asilo|frontera|menores no acompanados/],
  ["seguridad", /seguridad ciudadana|policia|guardia civil|terroris/],
  ["justicia", /justicia|judicial|corrupcion|fiscal general|amnistia|tribunal/],
  ["igualdad", /igualdad|violencia de genero|violencia machista|lgtb|aborto|mujeres/],
  ["medio-ambiente", /clima|ambiental|emisiones|dana|incendi|agua|biodiversidad/],
  ["energia", /energ|electric|nuclear|renovable|combustible|gas\b/],
  ["transporte", /transporte|ferrocarril|tren|cercanias|carretera|aeropuerto|rodalies/],
  ["territorial", /autonom|financiacion autonomica|cataluna|pais vasco|condonacion|deuda autonomica/],
  ["ue-exterior", /union europea|exterior|internacional|ucrania|palestina|israel|gaza|tratado/],
  ["defensa", /defensa|fuerzas armadas|militar|otan/],
  ["familia", /famili|natalidad|infancia|crianza|permiso/],
  ["economia", /presupuestos generales|economi|deficit|estabilidad presupuestaria/],
];

export function topicsForVote(text: string): string[] {
  const t = norm(text);
  return TOPIC_RULES.filter(([, re]) => re.test(t)).map(([id]) => id);
}

/** Votaciones que exigen mayoría absoluta del Congreso (176): carácter orgánico. */
export function requiresAbsoluteMajority(section: string, subgroup: string) {
  return /caracter organico|votacion de conjunto.*organic|organica/.test(norm(`${section} ${subgroup}`));
}

export function computeResult(
  totals: { si: number; no: number; abst: number },
  assent: boolean,
  absoluteMajority = false,
): "aprobada" | "rechazada" | "empate" | "asentimiento" | "indeterminado" {
  if (assent) return "asentimiento";
  if (absoluteMajority) return totals.si >= 176 ? "aprobada" : "rechazada";
  if (totals.si > totals.no) return "aprobada";
  if (totals.no > totals.si) return "rechazada";
  if (totals.si === totals.no && totals.si > 0) return "empate";
  return "indeterminado";
}
