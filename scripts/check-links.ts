/**
 * Detector de enlaces rotos. Recorre todas las URL de los datos (fuentes, indicadores,
 * promesas, acontecimientos, glosario) y comprueba su respuesta HTTP.
 *
 * Uso: npx tsx scripts/check-links.ts
 * Escribe data/link-report.json. Algunos sitios (voxespana.es, podemos.info, psoe.es) bloquean
 * peticiones automatizadas (403/Incapsula): se informan como «bloqueado», no como roto.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(root, "data", f), "utf8"));

function collect(): { url: string; where: string }[] {
  const out: { url: string; where: string }[] = [];
  for (const s of read("sources.json")) {
    out.push({ url: s.officialUrl, where: `fuente ${s.id} (oficial)${s.originalUnavailable ? " [conocido: no disponible]" : ""}` });
    if (s.archiveUrl) out.push({ url: s.archiveUrl, where: `fuente ${s.id} (copia)` });
  }
  for (const i of read("indicators.json")) out.push({ url: i.sourceUrl, where: `indicador ${i.id}` });
  for (const p of read("promises.json")) for (const a of p.assessment.officialActions) out.push({ url: a.url, where: `promesa ${p.id}` });
  const ev = read("events.json");
  out.push({ url: ev.governmentsSource, where: "gobiernos" });
  for (const e of ev.events) out.push({ url: e.url, where: `acontecimiento ${e.label}` });
  for (const g of read("glossary.json")) if (g.sourceUrl) out.push({ url: g.sourceUrl, where: `glosario ${g.slug}` });
  for (const p of read("pending-indicators.json")) out.push({ url: p.url, where: `pendiente ${p.name}` });
  return [...new Map(out.map((o) => [o.url, o])).values()];
}

async function check(url: string) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (comprobador de enlaces)" }, signal: AbortSignal.timeout(30000) });
    const body = res.status === 200 ? "" : await res.text().catch(() => "");
    const blocked = res.status === 403 || /Incapsula|cloudflare|Just a moment/i.test(body);
    return { status: res.status, state: res.ok ? "ok" : blocked ? "bloqueado" : "roto" };
  } catch (e) {
    return { status: 0, state: "error", error: (e as Error).message };
  }
}

async function main() {
  const links = collect();
  const results = [];
  for (const l of links) {
    const r = await check(l.url);
    results.push({ ...l, ...r });
    console.log(`${r.state === "ok" ? "✓" : r.state === "bloqueado" ? "~" : "✗"} ${r.status} ${l.url}  (${l.where})`);
  }
  fs.writeFileSync(path.join(root, "data", "link-report.json"), JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
  const broken = results.filter((r) => r.state === "roto" || r.state === "error");
  console.log(`\n${results.length} enlaces · ${broken.length} rotos o con error · ${results.filter((r) => r.state === "bloqueado").length} bloqueados`);
  if (broken.length) process.exitCode = 1;
}

main();
