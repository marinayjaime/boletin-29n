/**
 * Registra en data/changelog.json los cambios de datos que hace la actualización automática.
 * Compara cada fichero con su versión en HEAD (git) y describe el cambio en una línea.
 *
 * Uso: npx tsx scripts/log-changes.ts  (imprime el resumen; escribe el changelog si hay cambios)
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const BY = "Actualización automática (GitHub Actions)";
const today = new Date().toISOString().slice(0, 10);
const old = (f: string) => {
  try {
    return JSON.parse(execSync(`git show HEAD:${f}`, { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    return null;
  }
};
const cur = (f: string) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const VOLATILE = new Set(["fetchedAt", "checkedAt", "importedAt"]);
const strip = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(strip) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => !VOLATILE.has(k)).map(([k, x]) => [k, strip(x)])) : v;
const modified = execSync("git status --porcelain -- data", { encoding: "utf8" })
  .split("\n")
  .map((l) => l.slice(3).trim())
  .filter((f) => f.endsWith(".json") && f !== "data/changelog.json" && f !== "data/import-log.json");
// Un cambio solo de marcas de tiempo no es un cambio de datos: se descarta para no publicar ruido.
const changed = modified.filter((f) => {
  const a = old(f);
  if (a && JSON.stringify(strip(a)) === JSON.stringify(strip(cur(f)))) {
    if (process.env.CI) execSync(`git checkout -- "${f}"`); // en local nunca se tocan ficheros
    return false;
  }
  return true;
});
if (!changed.length && process.env.CI) {
  try {
    execSync("git checkout -- data/import-log.json", { stdio: "ignore" });
  } catch {}
}

type Entry = { date: string; entity: string; entityId: string; action: string; detail: string; by: string };
const entries: Entry[] = [];
for (const f of changed) {
  const a = old(f);
  const b = cur(f);
  if (f === "data/boe-leyes.json") {
    const known = new Set((a?.items ?? []).map((x: { id: string }) => x.id));
    const nuevos = b.items.filter((x: { id: string }) => !known.has(x.id));
    entries.push({ date: today, entity: "RegistroBOE", entityId: "boe-leyes", action: "importacion", detail: `${nuevos.length} normas nuevas (${b.from} → ${b.to})${nuevos.length ? ": " + nuevos.slice(0, 5).map((x: { title: string }) => x.title.split(",")[0]).join("; ") : ""}.`, by: BY });
  } else if (f.startsWith("data/stats/")) {
    const n = (d: { observations?: unknown[]; series?: { observations?: unknown[] }[] } | null) =>
      d ? (d.observations?.length ?? (d.series ?? []).reduce((s, x) => s + (x.observations?.length ?? 0), 0)) : 0;
    entries.push({ date: today, entity: "StatisticalIndicator", entityId: path.basename(f, ".json"), action: "importacion", detail: `Serie actualizada desde Eurostat (${n(a)} → ${n(b)} observaciones).`, by: BY });
  } else if (f === "data/link-report.json") {
    const broken = (d: { results?: { state: string }[] } | null) => (d?.results ?? []).filter((r) => r.state === "roto" || r.state === "error").length;
    entries.push({ date: today, entity: "Enlaces", entityId: "link-report", action: "comprobacion", detail: `Comprobación de enlaces: ${broken(b)} rotos (antes ${broken(a)}).`, by: BY });
  } else {
    entries.push({ date: today, entity: "Datos", entityId: f, action: "modificacion", detail: "Fichero modificado por la actualización automática.", by: BY });
  }
}
if (entries.length) {
  const log = cur("data/changelog.json");
  fs.writeFileSync(path.join(root, "data/changelog.json"), JSON.stringify([...entries, ...log], null, 2) + "\n");
}
for (const e of entries) console.log(`- ${e.entityId}: ${e.detail}`);
if (!entries.length) console.log("Sin cambios de datos.");
