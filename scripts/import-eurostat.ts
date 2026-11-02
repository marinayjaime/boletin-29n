/**
 * Importador de Eurostat (API de difusión, JSON-stat 2.0).
 *
 * Uso:  npx tsx scripts/import-eurostat.ts [id-indicador ...]
 *
 * Para cada indicador de data/indicators.json descarga la serie, valida el resultado
 * y guarda data/stats/<id>.json con la URL exacta de la consulta, la fecha de descarga
 * y la fecha de actualización declarada por Eurostat. No inventa ni interpola valores:
 * si una observación no existe en la respuesta, no se escribe.
 */
import fs from "node:fs";
import path from "node:path";
import { StatisticalIndicatorSchema, SeriesFileSchema, type StatisticalIndicator } from "../src/lib/schema";
import { parseJsonStat, NUTS2_ES } from "../src/lib/jsonstat";

const BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "stats");

function buildUrl(dataset: string, query: Record<string, string>, geos: string[], since?: string) {
  const p = new URLSearchParams();
  p.set("lang", "en");
  for (const [k, v] of Object.entries(query)) p.append(k, v);
  for (const g of geos) p.append("geo", g);
  if (since) p.set("sinceTimePeriod", since);
  return `${BASE}/${dataset}?${p.toString()}`;
}

async function fetchJson(url: string, attempt = 1): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return fetchJson(url, attempt + 1);
    }
    throw e;
  }
  if (!res.ok) {
    if (attempt < 3 && res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return fetchJson(url, attempt + 1);
    }
    throw new Error(`HTTP ${res.status} en ${url}`);
  }
  return res.json();
}

function sinceFor(ind: StatisticalIndicator) {
  if (ind.frequency === "M") return "2000-01";
  if (ind.frequency === "Q") return "2000-Q1";
  if (ind.frequency === "S") return "2000-S1";
  return "1995";
}

async function importOne(ind: StatisticalIndicator) {
  const url = buildUrl(ind.dataset, ind.query, ind.geos, sinceFor(ind));
  const json = (await fetchJson(url)) as Record<string, unknown>;
  const parsed = parseJsonStat(json);
  if (parsed.observations.length === 0) throw new Error(`Sin observaciones para ${ind.id}`);

  let regional;
  let regionalRequestUrl;
  if (ind.regional) {
    regionalRequestUrl = buildUrl(ind.regional.dataset, ind.regional.query, NUTS2_ES.map((r) => r.code), "2010");
    const rj = (await fetchJson(regionalRequestUrl)) as Record<string, unknown>;
    regional = parseJsonStat(rj).observations;
  }

  const file = SeriesFileSchema.parse({
    indicatorId: ind.id,
    fetchedAt: new Date().toISOString(),
    requestUrl: url,
    datasetLabel: parsed.label,
    datasetUpdated: parsed.updated,
    observations: parsed.observations,
    regional,
    regionalRequestUrl,
  });
  fs.writeFileSync(path.join(OUT, `${ind.id}.json`), JSON.stringify(file));
  const es = file.observations.filter((o) => o.geo === ind.geos[0]);
  const last = es[es.length - 1];
  console.log(`✓ ${ind.id.padEnd(22)} ${String(file.observations.length).padStart(5)} obs · último ${ind.geos[0]} ${last?.period} = ${last?.value}${regional ? ` · ${regional.length} obs. regionales` : ""}`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const all = (JSON.parse(fs.readFileSync(path.join(ROOT, "data", "indicators.json"), "utf8")) as unknown[]).map((x) =>
    StatisticalIndicatorSchema.parse(x),
  );
  const only = process.argv.slice(2);
  const list = only.length ? all.filter((i) => only.includes(i.id)) : all;
  const failures: string[] = [];
  for (const ind of list) {
    try {
      await importOne(ind);
    } catch (e) {
      failures.push(`${ind.id}: ${(e as Error).message}`);
      console.error(`✗ ${ind.id}: ${(e as Error).message}`);
    }
  }
  const log = path.join(ROOT, "data", "import-log.json");
  const prev = fs.existsSync(log) ? JSON.parse(fs.readFileSync(log, "utf8")) : [];
  prev.unshift({ date: new Date().toISOString(), importer: "eurostat", ok: list.length - failures.length, failures });
  fs.writeFileSync(log, JSON.stringify(prev.slice(0, 50), null, 2));
  if (failures.length) process.exitCode = 1;
}

main();
