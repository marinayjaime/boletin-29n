/**
 * Estado de cada conjunto de datos (data/data-status.json).
 * Distingue la última ejecución, la última actualización satisfactoria, el último error
 * y la última revisión editorial. Los fallos se registran aunque la web siga funcionando
 * con los datos anteriores.
 */
import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "data", "data-status.json");
const LOG = path.join(process.cwd(), "data", "import-log.json");

type Run = { at: string; ok: boolean; detail?: string };
export type DatasetStatus = {
  label: string;
  lastAttempt?: Run;
  lastSuccess?: string;
  lastError?: { at: string; message: string };
};

export function recordRun(id: string, ok: boolean, detail?: string, failures: string[] = []) {
  const all = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : { datasets: {} };
  const d = (all.datasets[id] ??= { label: id });
  const at = new Date().toISOString();
  d.lastAttempt = { at, ok, ...(detail ? { detail } : {}) };
  if (ok) d.lastSuccess = at;
  else d.lastError = { at, message: (failures.length ? failures.join("; ") : detail ?? "error").slice(0, 500) };
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2) + "\n");
  // Registro histórico de ejecuciones (incluidos los fallos).
  const prev = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : [];
  prev.unshift({ date: at, importer: id, ok: ok ? 1 : 0, failures: ok ? [] : failures.length ? failures : [detail ?? "error"] });
  fs.writeFileSync(LOG, JSON.stringify(prev.slice(0, 80), null, 2));
}
