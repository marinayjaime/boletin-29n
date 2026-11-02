/**
 * Incorpora un documento nuevo al corpus documental.
 *
 * Uso: npx tsx scripts/build-corpus.ts <sourceId> <ruta-al-pdf>
 *
 * 1. Calcula el SHA-256 del PDF (debe coincidir con el registrado en data/sources.json, si existe).
 * 2. Extrae el texto de cada página con `pdftotext` (poppler-utils), lo normaliza a NFC
 *    y corrige ligaduras tipográficas.
 * 3. Escribe data/corpus/<sourceId>.json. Las citas de las propuestas se verifican contra este fichero.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export function normalizePageText(t: string) {
  return t
    .replace(/昀椀/g, "fi")
    .replace(/昀氀/g, "fl")
    .replace(/昀/g, "f")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/­/g, "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function main() {
  const [sourceId, pdf] = process.argv.slice(2);
  if (!sourceId || !pdf) {
    console.error("Uso: npx tsx scripts/build-corpus.ts <sourceId> <ruta-al-pdf>");
    process.exit(2);
  }
  const buf = fs.readFileSync(pdf);
  const sha = crypto.createHash("sha256").update(buf).digest("hex");
  const sources = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "sources.json"), "utf8")) as { id: string; sha256: string | null }[];
  const known = sources.find((s) => s.id === sourceId);
  if (known?.sha256 && known.sha256 !== sha) {
    console.error(`✗ El SHA-256 (${sha}) no coincide con el registrado (${known.sha256}). ¿Es otra versión del documento?`);
    process.exit(1);
  }
  const info = execFileSync("pdfinfo", [pdf]).toString();
  const pagesN = Number(info.match(/Pages:\s+(\d+)/)?.[1] ?? 0);
  const pages: Record<string, string> = {};
  for (let i = 1; i <= pagesN; i++) {
    pages[String(i)] = normalizePageText(execFileSync("pdftotext", ["-f", String(i), "-l", String(i), pdf, "-"]).toString());
  }
  fs.writeFileSync(path.join(process.cwd(), "data", "corpus", `${sourceId}.json`), JSON.stringify({ sourceId, pages }));
  console.log(`✓ ${sourceId}: ${pagesN} páginas · SHA-256 ${sha}`);
  if (!known) console.log("  Recuerda registrar el documento en data/sources.json con este SHA-256.");
}

if (require.main === module) main();
