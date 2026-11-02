/**
 * Propone pasajes candidatos de un documento del corpus para un tema.
 *
 * Uso: npx tsx scripts/extract-candidates.ts <sourceId> <topicId> "<regex>"
 *   p. ej. npx tsx scripts/extract-candidates.ts psoe-programa-2023 vivienda "alquiler|vivienda pública"
 *
 * Las candidatas se guardan en data/candidates/<sourceId>.<topicId>.json con estado
 * «pendiente_revision» y resumen vacío. NO se publican: una persona debe revisarlas,
 * redactar el resumen, elegir la dimensión y moverlas a data/proposals.json con estado «publicado».
 */
import fs from "node:fs";
import path from "node:path";

function main() {
  const [sourceId, topicId, pattern] = process.argv.slice(2);
  if (!sourceId || !topicId || !pattern) {
    console.error('Uso: npx tsx scripts/extract-candidates.ts <sourceId> <topicId> "<regex>"');
    process.exit(2);
  }
  const root = process.cwd();
  const corpus = JSON.parse(fs.readFileSync(path.join(root, "data", "corpus", `${sourceId}.json`), "utf8")) as { pages: Record<string, string> };
  const sources = JSON.parse(fs.readFileSync(path.join(root, "data", "sources.json"), "utf8")) as { id: string; partyId: string | null; cycle: string | null }[];
  const src = sources.find((s) => s.id === sourceId);
  if (!src) throw new Error(`Fuente no registrada: ${sourceId}`);
  const rx = new RegExp(pattern, "i");
  const out: unknown[] = [];
  for (const [page, text] of Object.entries(corpus.pages)) {
    const sentences = text.split(/(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÑ0-9•●])/);
    for (const s of sentences) {
      if (s.length < 40 || s.length > 600 || !rx.test(s)) continue;
      // solo frases con verbo de compromiso en futuro o infinitivo de propuesta
      if (!/(remos|reremos|iremos|aremos|eremos|Garantizar|Impulsar|Crear|Establecer|Aprobar|Reducir|Aumentar|Derogar)/.test(s)) continue;
      out.push({
        id: `${src.partyId}-${topicId}-cand-${page}-${out.length + 1}`,
        partyId: src.partyId,
        topicId,
        dimensionId: "otras",
        summary: "",
        category: "programa_anterior",
        cycle: src.cycle,
        citations: [{ sourceId, pdfPage: Number(page), quote: s }],
        status: "pendiente_revision",
        verification: { checkedAt: new Date().toISOString().slice(0, 10), method: "extraccion_automatica", reviewer: "pendiente" },
      });
    }
  }
  const dir = path.join(root, "data", "candidates");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${sourceId}.${topicId}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`${out.length} candidatas en ${path.relative(root, file)} (pendientes de revisión, no publicadas)`);
}

main();
