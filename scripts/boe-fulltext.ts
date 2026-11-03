/**
 * Texto íntegro de las normas con rango de ley de la legislatura (leyes, leyes orgánicas,
 * reales decretos-leyes) para buscar disposiciones incluidas dentro de otras normas
 * (por ejemplo, una reforma del Estatuto de los Trabajadores en una ley de otro título).
 *
 * Uso: npx tsx scripts/boe-fulltext.ts                → descarga a .cache/boe-texto (con caché)
 *      npx tsx scripts/boe-fulltext.ts --buscar "a" "b" → normas cuyo texto contiene TODOS los términos
 * Sin acentos ni mayúsculas en la comparación.
 */
import fs from "node:fs";
import path from "node:path";
import { recordRun } from "./lib/status";

const root = process.cwd();
const dir = path.join(root, ".cache", "boe-texto");
fs.mkdirSync(dir, { recursive: true });
type Item = { id: string; date: string; title: string; kind: string };
const { items } = JSON.parse(fs.readFileSync(path.join(root, "data", "boe-leyes.json"), "utf8")) as { items: Item[] };
const laws = items.filter((i) => i.kind !== "real_decreto");
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ");

async function download() {
  let n = 0;
  const failed: string[] = [];
  for (const l of laws) {
    const f = path.join(dir, `${l.id}.txt`);
    if (fs.existsSync(f)) continue;
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch(`https://www.boe.es/diario_boe/xml.php?id=${l.id}`, { headers: { "User-Agent": "Boletin29N/1.0 (+https://github.com/marinayjaime/boletin-29n)" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const xml = await r.text();
        const texto = xml.match(/<texto>([\s\S]*)<\/texto>/)?.[1] ?? xml;
        fs.writeFileSync(f, texto.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " "));
        n++;
        break;
      } catch (e) {
        if (i === 3) {
          console.error(`✗ ${l.id}: ${(e as Error).message}`);
          failed.push(`${l.id}: ${(e as Error).message}`);
        }
        await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
      }
    }
    await new Promise((res) => setTimeout(res, 300));
  }
  // Ámbito: el BOE también publica leyes autonómicas. Son estatales los reales decretos-leyes, las reformas
  // constitucionales y las leyes cuyo texto dice «las Cortes Generales han aprobado».
  const file = path.join(root, "data", "boe-leyes.json");
  const reg = JSON.parse(fs.readFileSync(file, "utf8")) as { items: (Item & { scope?: string })[] };
  for (const it of reg.items) {
    if (it.kind === "real_decreto" || it.kind === "real_decreto_ley" || it.kind === "reforma_constitucional") it.scope = "estatal";
    else {
      const f = path.join(dir, `${it.id}.txt`);
      if (fs.existsSync(f)) it.scope = fold(fs.readFileSync(f, "utf8").slice(0, 6000)).includes("cortes generales han aprobado") ? "estatal" : "autonomica";
    }
  }
  fs.writeFileSync(file, JSON.stringify(reg, null, 1));
  recordRun("boe-texto", failed.length === 0, `${laws.length - failed.length} de ${laws.length} textos disponibles`, failed);
  console.log(`${n} descargadas · ${laws.filter((l) => fs.existsSync(path.join(dir, `${l.id}.txt`))).length}/${laws.length} disponibles`);
}

export function search(terms: string[], until = "9999", onlyState = true) {
  const t = terms.map(fold);
  return laws
    .filter((l) => l.date <= until && fs.existsSync(path.join(dir, `${l.id}.txt`)))
    .map((l) => ({ ...l, text: fold(fs.readFileSync(path.join(dir, `${l.id}.txt`), "utf8")) }))
    .filter((l) => (!onlyState || l.kind === "real_decreto_ley" || l.kind === "reforma_constitucional" || l.text.slice(0, 6000).includes("cortes generales han aprobado")) && t.every((x) => l.text.includes(x)))
    .map((l) => {
      const i = l.text.indexOf(t[0]);
      return { id: l.id, date: l.date, title: l.title, excerpt: l.text.slice(Math.max(0, i - 160), i + 240) };
    });
}

if (process.argv[1]?.endsWith("boe-fulltext.ts")) {
  const k = process.argv.indexOf("--buscar");
  if (k > 0) for (const r of search(process.argv.slice(k + 1))) console.log(`${r.date} ${r.id} ${r.title.slice(0, 110)}\n   …${r.excerpt}…`);
  else download();
}
