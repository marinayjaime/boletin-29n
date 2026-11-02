/**
 * Vigilante de cargos del Gobierno. Lee la composición publicada en La Moncloa y la
 * compara con data/government.json (nombre y cargo). Los cambios se proponen para revisión;
 * nunca se aplican solos.
 *
 * Uso: npx tsx scripts/check-government.ts  → data/review/government.json
 */
import { get, readData, writeReview, type Finding } from "./lib/review";

type Gov = { source: string; members: { name: string; role: string }[] };
const norm = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();

async function main() {
  const gov = readData<Gov>("government.json");
  try {
    const html = await get(gov.source);
    const live = [...html.matchAll(/<meta content="([^"]+)" property="jobTitle"\s*\/>\s*<meta content="([^"]+)" property="name"/g)].map((m) => ({ role: norm(m[1]), name: norm(m[2]) }))
      .filter((m) => /president|ministr/i.test(m.role)); // descarta metadatos de la propia página
    if (live.length < 10) throw new Error(`Estructura de la página no reconocida (${live.length} cargos leídos)`);
    const findings: Finding[] = [];
    const stored = new Map(gov.members.map((m) => [norm(m.name), norm(m.role)]));
    const liveMap = new Map(live.map((m) => [m.name, m.role]));
    for (const m of live) {
      if (!stored.has(m.name)) findings.push({ kind: "alta", title: `${m.name}: ${m.role}`, url: gov.source, detail: "Aparece en La Moncloa y no en los datos." });
      else if (stored.get(m.name) !== m.role) findings.push({ kind: "cambio_cargo", title: m.name, url: gov.source, detail: `Datos: «${stored.get(m.name)}» · La Moncloa: «${m.role}»` });
    }
    for (const [name, role] of stored)
      if (!liveMap.has(name) && !html.includes(name)) findings.push({ kind: "baja", title: `${name}: ${role}`, url: gov.source, detail: "Figura en los datos y ya no aparece en La Moncloa." });
    writeReview({ checker: "government", ok: true, findings, note: `${live.length} cargos leídos en La Moncloa.` });
  } catch (e) {
    writeReview({ checker: "government", ok: false, error: (e as Error).message, findings: [] });
  }
}
main();
