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
import { writeReview } from "./lib/review";

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
  for (const p of read("polls.json").polls) out.push({ url: p.url, where: `encuesta ${p.firm} ${p.published}` });
  for (const m of read("government.json").members) out.push({ url: m.profileUrl, where: `gobierno ${m.name}` });
  for (const [k, ph] of Object.entries(read("photos.json") as Record<string, { commonsPage: string }>)) out.push({ url: ph.commonsPage, where: `foto ${k}` });
  for (const [k, o] of Object.entries(read("organization.json").parties as Record<string, { doc: { url: string } }>)) out.push({ url: o.doc.url, where: `estatutos ${k}` });
  return [...new Map(out.map((o) => [o.url, o])).values()];
}

async function check(url: string) {
  // Los fallos de red (sin respuesta HTTP) suelen ser límites de peticiones: se reintenta con espera creciente.
  let r = await checkOnce(url);
  for (let i = 1; i <= 3 && r.state === "error"; i++) {
    await new Promise((res) => setTimeout(res, 4000 * i));
    r = await checkOnce(url);
  }
  return r;
}

async function checkOnce(url: string) {
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
    await new Promise((res) => setTimeout(res, 400)); // ritmo amable con los servidores públicos
    console.log(`${r.state === "ok" ? "✓" : r.state === "bloqueado" ? "~" : "✗"} ${r.status} ${l.url}  (${l.where})`);
  }
  fs.writeFileSync(path.join(root, "data", "link-report.json"), JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
  const broken = results.filter((r) => r.state === "roto" || r.state === "error");
  console.log(`\n${results.length} enlaces · ${broken.length} rotos o con error · ${results.filter((r) => r.state === "bloqueado").length} bloqueados`);
  const nuevos = broken.filter((r) => !r.where.includes("[conocido"));
  writeReview({
    checker: "links",
    ok: true,
    findings: nuevos.map((r) => ({ kind: "enlace_roto", title: r.where, url: r.url, detail: `HTTP ${r.status}${"error" in r && r.error ? ` · ${r.error}` : ""}` })),
    note: `${results.length} enlaces comprobados; ${results.filter((r) => r.state === "bloqueado").length} sitios bloquean el acceso automatizado (no se cuentan como rotos).`,
  });
  if (nuevos.length) process.exitCode = 1;
}

main();
