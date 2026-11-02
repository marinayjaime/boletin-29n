/**
 * Registro de normas con rango de ley publicadas en el BOE durante un periodo.
 * Recorre los sumarios diarios de la API de datos abiertos del BOE y extrae
 * leyes, leyes orgánicas, reales decretos-leyes y reales decretos (sección I: medidas ejecutivas).
 *
 * Uso: npx tsx scripts/import-boe-leyes.ts [desde AAAA-MM-DD] [hasta AAAA-MM-DD]
 *      npx tsx scripts/import-boe-leyes.ts --incremental   (desde el último día importado hasta ayer)
 * Resultado: data/boe-leyes.json (con caché en .cache/boe)
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cache = path.join(root, ".cache", "boe");
fs.mkdirSync(cache, { recursive: true });
const OUT = path.join(root, "data", "boe-leyes.json");
const incremental = process.argv.includes("--incremental");
type Item = { id: string; date: string; title: string; kind: string; url: string };
const prev: { from: string; to: string; items: Item[] } | null = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;
const dayAfter = (d: string) => new Date(Date.parse(d + "T12:00:00Z") + 864e5).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const [from, to] = incremental && prev ? [dayAfter(prev.to), yesterday] : [args[0] ?? "2023-11-17", args[1] ?? "2026-10-31"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sumario(day: string): Promise<string> {
  const f = path.join(cache, `${day}.xml`);
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(`https://www.boe.es/datosabiertos/api/boe/sumario/${day.replace(/-/g, "")}`, { headers: { Accept: "application/xml" } });
      const t = await res.text();
      if (res.status === 404 || /<code>404<\/code>/.test(t)) {
        fs.writeFileSync(f, "");
        return "";
      }
      if (res.ok) {
        fs.writeFileSync(f, t);
        return t;
      }
    } catch {}
    await sleep(1500 * (i + 1));
  }
  throw new Error(`No se pudo descargar el sumario ${day}`);
}

async function main() {
  if (from > to) {
    console.log(`Registro del BOE al día (hasta ${prev?.to}).`);
    return;
  }
  const out: Item[] = incremental && prev ? [...prev.items] : [];
  for (let d = new Date(from + "T12:00:00Z"); d <= new Date(to + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    const xml = await sumario(day);
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const id = m[1].match(/<identificador>(.*?)<\/identificador>/)?.[1];
      const title = m[1].match(/<titulo>([\s\S]*?)<\/titulo>/)?.[1]?.replace(/\s+/g, " ").trim();
      if (!id || !title) continue;
      const kind = /^Ley Orgánica \d+\/\d{4}/.test(title) ? "ley_organica" : /^Ley \d+\/\d{4}/.test(title) ? "ley" : /^Real Decreto-ley \d+\/\d{4}/.test(title) ? "real_decreto_ley" : /^Real Decreto \d+\/\d{4}/.test(title) ? "real_decreto" : null;
      if (kind) out.push({ id, date: day, title, kind, url: `https://www.boe.es/diario_boe/txt.php?id=${id}` });
    }
  }
  const uniq = [...new Map(out.map((o) => [o.id, o])).values()];
  const start = incremental && prev ? prev.from : from;
  fs.writeFileSync(OUT, JSON.stringify({ from: start, to, importedAt: new Date().toISOString(), source: "https://www.boe.es/datosabiertos/api/boe/sumario/", items: uniq }, null, 1));
  console.log(`${uniq.length} normas entre ${start} y ${to} (${uniq.length - (incremental && prev ? prev.items.length : 0)} nuevas)`);
}
main();
