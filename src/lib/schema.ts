/**
 * Modelo de datos de la plataforma.
 *
 * Todas las entidades se validan con Zod en tiempo de build (scripts/validate-data.ts)
 * y en los tests. Ningún contenido se publica si no supera esta validación.
 */
import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, "Fecha ISO (AAAA-MM o AAAA-MM-DD)");
const slug = z.string().regex(/^[a-z0-9-]+$/);

/* ---------- Partidos, coaliciones, ciclo electoral ---------- */

export const PartySchema = z.object({
  id: slug,
  officialName: z.string(),
  shortName: z.string(),
  acronym: z.string(),
  kind: z.enum(["partido", "coalicion"]),
  /** Denominaciones con las que concurre en 2026 según el BOE de candidaturas. */
  ballotNames2026: z.array(z.string()),
  ballotSource: z.string(), // id de SourceDocument
  /** Cabeza de lista por Madrid según BOE (no existe la figura legal de "candidato a presidente"). */
  madridListHead: z.string().nullable(),
  website: z.string().url(),
  /** Descripción factual, atribuida y breve. */
  summary: z.string(),
  history: z.array(z.object({ date: isoDate, text: z.string(), sourceId: z.string() })),
  /** Grupos parlamentarios de la XV Legislatura con los que se relaciona (sin equiparar). */
  parliamentaryGroups: z.array(z.object({ code: z.string(), note: z.string() })),
  monogram: z.string().max(3),
});
export type Party = z.infer<typeof PartySchema>;

export const CoalitionSchema = z.object({
  id: slug,
  partyId: slug,
  members: z.array(z.object({ name: z.string(), note: z.string().optional() })),
  explanation: z.string(),
  sources: z.array(z.string()),
  verification: z.enum(["verificado", "parcial", "pendiente"]),
});
export type Coalition = z.infer<typeof CoalitionSchema>;

export const ElectoralCycleSchema = z.object({
  id: slug,
  name: z.string(),
  electionDate: isoDate,
  decree: z.object({ title: z.string(), boeId: z.string(), url: z.string().url(), published: isoDate }),
  campaign: z.object({ start: isoDate, end: isoDate }),
  seats: z.number(),
  programStatus: z.array(
    z.object({
      partyId: slug,
      status: z.enum(["publicado", "pendiente"]),
      checkedAt: isoDate,
      note: z.string(),
      sourceId: z.string().optional(),
    }),
  ),
});
export type ElectoralCycle = z.infer<typeof ElectoralCycleSchema>;

/* ---------- Fuentes ---------- */

export const SourceKind = z.enum([
  "programa_2026",
  "propuesta_2026",
  "programa_anterior",
  "declaracion",
  "iniciativa_parlamentaria",
  "votacion",
  "ley",
  "boe",
  "estadistica",
  "periodistica",
]);
export type SourceKindT = z.infer<typeof SourceKind>;

export const SourceDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(), // autor institucional
  kind: SourceKind,
  partyId: slug.nullable(),
  cycle: z.string().nullable(), // p. ej. "generales-2023"
  published: isoDate,
  officialUrl: z.string().url(),
  /** Copia archivada (Wayback Machine) cuando el original no es accesible de forma estable. */
  archiveUrl: z.string().url().nullable(),
  /** Si la copia procede de un tercero (no del autor). */
  hostedByThirdParty: z.boolean().default(false),
  /** El enlace original ya no responde (p. ej. 404); se prioriza la copia archivada. */
  originalUnavailable: z.boolean().default(false),
  sha256: z.string().nullable(),
  pages: z.number().nullable(),
  /** Desfase entre número de página impreso y página del PDF, si se conoce (impresa = pdf - offset). */
  printedPageOffset: z.number().nullable().default(null),
  verification: z.enum(["verificado", "copia_tercero", "pendiente"]),
  lastChecked: isoDate,
  notes: z.string().optional(),
  topics: z.array(slug).default([]),
});
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;

/* ---------- Taxonomía ---------- */

export const PolicyTopicSchema = z.object({
  id: slug,
  name: z.string(),
  short: z.string(),
  description: z.string(),
  /** Filas comparables del comparador para este tema. */
  dimensions: z.array(z.object({ id: slug, label: z.string(), help: z.string().optional() })),
  /** Competencias administrativas relevantes (contexto, no juicio). */
  competence: z.string(),
});
export type PolicyTopic = z.infer<typeof PolicyTopicSchema>;

/* ---------- Propuestas y citas ---------- */

export const CitationSchema = z.object({
  sourceId: z.string(),
  /** Página del PDF (no la impresa). */
  pdfPage: z.number().int().positive(),
  section: z.string().optional(),
  /** Extracto literal, copiado del documento. Se comprueba automáticamente contra el texto del PDF. */
  quote: z.string().min(20),
});
export type Citation = z.infer<typeof CitationSchema>;

export const ProposalSchema = z.object({
  id: z.string(),
  partyId: slug,
  topicId: slug,
  dimensionId: slug,
  /** Resumen objetivo redactado por la plataforma; nunca añade contenido que no esté en la cita. */
  summary: z.string(),
  category: SourceKind,
  cycle: z.string(),
  citations: z.array(CitationSchema).min(1),
  /** Competencia necesaria para aplicarla, solo si es deducible del propio texto o de la Constitución. */
  competence: z.string().optional(),
  conditions: z.string().optional(),
  context: z.string().optional(),
  /**
   * Clave de coincidencia documentada: dos propuestas con la misma clave plantean lo mismo
   * (asignado manualmente en revisión editorial). Lo usa el modo «Solo diferencias».
   */
  positionKey: z.string().optional(),
  status: z.enum(["publicado", "pendiente_revision", "rechazado"]),
  verification: z.object({
    checkedAt: isoDate,
    method: z.enum(["cotejo_manual_pdf", "cotejo_automatico_texto", "extraccion_automatica"]),
    reviewer: z.string(),
  }),
});
export type Proposal = z.infer<typeof ProposalSchema>;

/* ---------- Test a ciegas ---------- */

export const StanceSchema = z.enum([
  "a_favor",
  "en_contra",
  "matizada",
  "sin_posicion_documentada",
  "no_comparable",
]);
export type Stance = z.infer<typeof StanceSchema>;

export const QuizStatementSchema = z.object({
  id: z.string(),
  topicId: slug,
  statement: z.string(),
  /** Explicación neutral del contexto para quien no conoce el tema. */
  context: z.string(),
  positions: z.array(
    z.object({
      partyId: slug,
      stance: StanceSchema,
      /** Propuestas que justifican la postura (deben existir). Vacío si sin_posicion_documentada. */
      proposalIds: z.array(z.string()),
      note: z.string().optional(),
    }),
  ),
});
export type QuizStatement = z.infer<typeof QuizStatementSchema>;

/* ---------- Estadística ---------- */

export const StatisticalIndicatorSchema = z.object({
  id: slug,
  area: z.enum(["economia", "trabajo", "vivienda", "pensiones", "sanidad-educacion", "sociedad"]),
  name: z.string(),
  short: z.string(),
  unit: z.string(),
  unitShort: z.string(),
  description: z.string(),
  methodology: z.string(),
  frequency: z.enum(["A", "Q", "M", "S"]),
  provider: z.enum(["Eurostat", "INE", "Banco de España", "Seguridad Social"]),
  dataset: z.string(),
  query: z.record(z.string()),
  geos: z.array(z.string()),
  regional: z
    .object({ dataset: z.string(), query: z.record(z.string()), level: z.literal("NUTS2") })
    .optional(),
  sourceUrl: z.string().url(),
  caveats: z.array(z.string()).default([]),
  decimals: z.number().default(1),
  /** Serie derivada: se documenta la fórmula. */
  derived: z.string().optional(),
  /** Serie auxiliar (p. ej. deflactor) que no se muestra en el Observatorio. */
  hidden: z.boolean().optional(),
});
export type StatisticalIndicator = z.infer<typeof StatisticalIndicatorSchema>;

export const StatisticalObservationSchema = z.object({
  geo: z.string(),
  period: z.string(),
  value: z.number(),
  flag: z.string().optional(),
});

export const SeriesFileSchema = z.object({
  indicatorId: slug,
  fetchedAt: z.string(),
  requestUrl: z.string().url(),
  datasetLabel: z.string(),
  datasetUpdated: z.string().nullable(),
  observations: z.array(StatisticalObservationSchema),
  regional: z.array(StatisticalObservationSchema).optional(),
  regionalRequestUrl: z.string().url().optional(),
});
export type SeriesFile = z.infer<typeof SeriesFileSchema>;

/* ---------- Votaciones ---------- */

export const VoteTypeSchema = z.enum([
  "ley_dictamen",
  "ley_conjunto",
  "enmienda_totalidad",
  "toma_consideracion",
  "real_decreto_ley",
  "proposicion_no_ley",
  "mocion",
  "enmiendas",
  "tratado",
  "presupuestos",
  "investidura",
  "otros",
]);
export type VoteType = z.infer<typeof VoteTypeSchema>;

export const GroupTallySchema = z.object({
  group: z.string(),
  si: z.number(),
  no: z.number(),
  abst: z.number(),
  noVota: z.number(),
});

export const ParliamentaryVoteSchema = z.object({
  id: z.string(), // L15-S043-V001
  legislature: z.number(),
  session: z.number(),
  number: z.number(),
  date: isoDate,
  section: z.string(), // "Proposiciones no de Ley."
  title: z.string(), // textoExpediente
  subgroup: z.string().optional(),
  subgroupText: z.string().optional(),
  expediente: z.string().nullable(),
  type: VoteTypeSchema,
  assent: z.boolean(),
  /** Exige mayoría absoluta (176 síes), p. ej. votación de carácter orgánico. */
  absoluteMajority: z.boolean().default(false),
  /** Votación pública por llamamiento: el Congreso no publica el voto nominal en JSON. */
  rollCall: z.boolean().default(false),
  totals: z.object({ presentes: z.number(), si: z.number(), no: z.number(), abst: z.number(), noVota: z.number() }),
  result: z.enum(["aprobada", "rechazada", "empate", "asentimiento", "indeterminado"]),
  groups: z.array(GroupTallySchema),
  topicIds: z.array(slug),
  detailUrl: z.string().url().nullable(),
  sourceZip: z.string().url(),
  hasDeputyDetail: z.boolean(),
});
export type ParliamentaryVote = z.infer<typeof ParliamentaryVoteSchema>;

export const ParliamentaryPositionSchema = z.object({
  voteId: z.string(),
  seat: z.string(),
  deputy: z.string(),
  group: z.string(),
  vote: z.enum(["Sí", "No", "Abstención", "No vota"]),
});

/* ---------- Promesas ---------- */

export const PromiseStatusSchema = z.enum([
  "cumplido",
  "cumplido_parcial",
  "en_tramitacion",
  "no_cumplido",
  "no_verificable",
]);

export const HistoricalPromiseSchema = z.object({
  id: z.string(),
  partyIds: z.array(slug),
  attribution: z.enum(["partido", "gobierno_coalicion", "partido_en_oposicion"]),
  government: z.string().nullable(),
  legislature: z.string(),
  topicId: slug,
  promise: z.string(),
  promisedAt: isoDate,
  citation: CitationSchema,
  assessment: z.object({
    status: PromiseStatusSchema,
    criterion: z.string(),
    officialActions: z.array(z.object({ date: isoDate, text: z.string(), url: z.string().url() })),
    outcome: z.string(),
    limits: z.string(),
    assessedAt: isoDate,
    reviewer: z.string(),
  }),
});
export type HistoricalPromise = z.infer<typeof HistoricalPromiseSchema>;

/* ---------- Registro de verificación / cambios ---------- */

export const VerificationRecordSchema = z.object({
  date: isoDate,
  entity: z.string(),
  entityId: z.string(),
  action: z.enum(["alta", "modificacion", "verificacion", "baja", "importacion"]),
  detail: z.string(),
  by: z.string(),
});
export type VerificationRecord = z.infer<typeof VerificationRecordSchema>;

export const GlossaryEntrySchema = z.object({
  term: z.string(),
  slug,
  definition: z.string(),
  sourceUrl: z.string().url().optional(),
});
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;
