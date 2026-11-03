/**
 * Capa de acceso a datos (solo servidor / build).
 * Todo se valida con Zod: si un fichero de datos no cumple el esquema, el build falla.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  PartySchema,
  CoalitionSchema,
  ElectoralCycleSchema,
  SourceDocumentSchema,
  PolicyTopicSchema,
  ProposalSchema,
  QuizStatementSchema,
  StatisticalIndicatorSchema,
  SeriesFileSchema,
  ParliamentaryVoteSchema,
  HistoricalPromiseSchema,
  GlossaryEntrySchema,
  VerificationRecordSchema,
  type SeriesFile,
  type ParliamentaryVote,
} from "./schema";

const DATA = path.join(process.cwd(), "data");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));

function cached<T>(fn: () => T): () => T {
  let v: T | undefined;
  return () => (v ??= fn());
}

export const getParties = cached(() => z.array(PartySchema).parse(read("parties.json")));
export const getCoalitions = cached(() => z.array(CoalitionSchema).parse(read("coalitions.json")));
export const getCycle = cached(() => ElectoralCycleSchema.parse(read("cycle.json")));
export const getSources = cached(() => z.array(SourceDocumentSchema).parse(read("sources.json")));
export const getTopics = cached(() => z.array(PolicyTopicSchema).parse(read("topics.json")));
export const getProposals = cached(() =>
  z
    .array(ProposalSchema)
    .parse(read("proposals.json"))
    .filter((p) => p.status === "publicado"),
);
export const getQuiz = cached(() => z.array(QuizStatementSchema).parse(read("quiz.json")));
export const getIndicators = cached(() => z.array(StatisticalIndicatorSchema).parse(read("indicators.json")));
export const getPromises = cached(() => z.array(HistoricalPromiseSchema).parse(read("promises.json")));
export const getGlossary = cached(() => z.array(GlossaryEntrySchema).parse(read("glossary.json")));
export const getChangelog = cached(() => z.array(VerificationRecordSchema).parse(read("changelog.json")));

export function getSeries(id: string): SeriesFile | null {
  const f = path.join(DATA, "stats", `${id}.json`);
  if (!fs.existsSync(f)) return null;
  return SeriesFileSchema.parse(JSON.parse(fs.readFileSync(f, "utf8")));
}

export const getVotes = cached((): { importedAt: string | null; votes: ParliamentaryVote[] } => {
  const f = path.join(DATA, "votes", "index.json");
  if (!fs.existsSync(f)) return { importedAt: null, votes: [] };
  const raw = JSON.parse(fs.readFileSync(f, "utf8"));
  return { importedAt: raw.importedAt, votes: z.array(ParliamentaryVoteSchema).parse(raw.votes) };
});

export const getCorpus = cached(() => {
  const dir = path.join(DATA, "corpus");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as { sourceId: string; pages: Record<string, string> });
});

export function sourceById(id: string) {
  return getSources().find((s) => s.id === id) ?? null;
}
export function partyById(id: string) {
  return getParties().find((p) => p.id === id) ?? null;
}
export function topicById(id: string) {
  return getTopics().find((t) => t.id === id) ?? null;
}

/** Fecha de la última actualización de datos visibles en la plataforma. */
export function lastDataUpdate(): string {
  const dates = [
    ...getSources().map((s) => s.lastChecked),
    getVotes().importedAt?.slice(0, 10) ?? "",
    ...getIndicators()
      .map((i) => getSeries(i.id)?.fetchedAt.slice(0, 10) ?? "")
      .filter(Boolean),
  ].filter(Boolean);
  return dates.sort().at(-1) ?? "";
}

/**
 * Diputados que votaron en más de un grupo durante la legislatura (derivado del voto nominal).
 * Devuelve número de votaciones registradas en cada grupo; no infiere afiliación de partido.
 */
export const getGroupMovers = cached(() => {
  const dir = path.join(process.cwd(), "public", "data", "votes");
  const regFile = path.join(dir, "registry.json");
  if (!fs.existsSync(regFile)) return [] as { name: string; groups: Record<string, number> }[];
  const reg = JSON.parse(fs.readFileSync(regFile, "utf8")) as { deputies: string[]; groups: string[] };
  const acc = new Map<string, Record<string, number>>();
  for (const f of fs.readdirSync(dir).filter((x) => /^S\d+\.json$/.test(x))) {
    const ses = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Record<string, string>;
    for (const enc of Object.values(ses)) {
      for (let i = 0; i + 4 <= enc.length; i += 4) {
        const d = reg.deputies[parseInt(enc.slice(i, i + 2), 36)];
        const g = reg.groups[enc.charCodeAt(i + 2) - 97];
        if (!g) continue;
        const m = acc.get(d) ?? {};
        m[g] = (m[g] ?? 0) + 1;
        acc.set(d, m);
      }
    }
  }
  return [...acc.entries()].filter(([, g]) => Object.keys(g).length > 1).map(([name, groups]) => ({ name, groups }));
});

/* ---------- Ampliación: encuestas, gobierno, organigrama, fotos, coincidencias ---------- */
import { CommonalitySchema } from "./schema";

export type Poll = {
  id: string;
  firm: string;
  media: string;
  fieldwork: string;
  published: string;
  type: "puntual" | "horquilla";
  title: string;
  url: string;
  seats: Record<string, number | { min: number; max: number }>;
  verification: { status: "verificada" | "corregida" | "parcial" | "no_verificable"; checkedAt: string; method: string; notes: string };
  /** Escaños que la publicación no detalla (no se estiman). */
  unpublishedSeats?: number;
  partisan?: string;
};


export const getPolls = cached(() => read("polls.json") as { aggregator: { name: string; url: string; revision: string; revisionTimestamp: string }; checkedAt: string; note: string; polls: Poll[] });

export type Minister = { id: string; name: string; role: string; profileUrl: string; photo: string | null; since: string | null; sinceContext: string | null };
export const getGovernment = cached(() => read("government.json") as { source: string; checkedAt: string; photoCredit: string; members: Minister[] });

export type Organization = {
  constitutionUrl: string;
  checkedAt: string;
  institutions: { id: string; name: string; short: string; holder: string | null; role: string; what: string[]; articles: string; icon: string; children?: string[] }[];
  relations: { from: string; to: string; label: string; articles: string }[];
  parties: Record<string, { status: "documentado" | "parcial" | "pendiente"; note?: string; doc: { title: string; url: string; sha256?: string; note?: string }; organs: { id: string; name: string; kind: string; what: string; article: string; children?: string[] }[] }>;
};
export const getOrganization = cached(() => read("organization.json") as Organization);

export type Photo = { file: string; commonsPage: string; license: string; licenseUrl: string; author: string; date: string; credit: string };
export const getPhotos = cached(() => read("photos.json") as Record<string, Photo>);

export const getCommonalities = cached(() => z.array(CommonalitySchema).parse(read("commonalities.json")));
export const getBoeLaws = cached(() => read("boe-leyes.json") as { from: string; to: string; importedAt: string; items: { id: string; date: string; title: string; kind: string; url: string; scope?: "estatal" | "autonomica" }[] });
export const getPromiseCoverage = cached(() => read("promise-coverage.json") as Record<string, { sourceId: string; futureCommitments: number; legislativeCommitments: number; method: string; legislativeMethod: string; periodEnd: string }>);

export type DataStatusFile = {
  datasets: Record<string, { label: string; lastAttempt?: { at: string; ok: boolean; detail?: string }; lastSuccess?: string; lastError?: { at: string; message: string } }>;
  editorial: Record<string, { label: string; date: string; by: string; human: boolean; scope: string }>;
};
export const getDataStatus = cached(() => read("data-status.json") as DataStatusFile);
