/**
 * Resume data/review/*.json en Markdown para la incidencia de revisión de GitHub.
 * Escribe review-summary.md y, en Actions, la salida `needs_review`.
 */
import fs from "node:fs";
import path from "node:path";
import type { Review } from "./lib/review";

const dir = path.join(process.cwd(), "data", "review");
const LABEL: Record<string, string> = { polls: "Encuestas", government: "Cargos del Gobierno", programs: "Programas electorales de 2026", links: "Enlaces rotos" };
const reviews: Review[] = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) : [];
const pending = reviews.filter((r) => r.findings.length || !r.ok);
let md = `Informe generado el ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC por la actualización automática.\n\n`;
md += "Estos cambios **no se publican solos**: requieren interpretación política o comprobación con la fuente original. Tras revisarlos, actualiza los datos en una rama, pasa `npm run validate && npm test` y abre un PR.\n\n";
for (const r of reviews) {
  md += `### ${LABEL[r.checker] ?? r.checker} — ${!r.ok ? "⚠️ error" : r.findings.length ? `${r.findings.length} por revisar` : "sin novedades"}\n\n`;
  if (r.error) md += `Error: \`${r.error}\`\n\n`;
  if (r.note) md += `${r.note}\n\n`;
  for (const f of r.findings.slice(0, 40)) md += `- [ ] **${f.title}**${f.url ? ` — ${f.url}` : ""}${f.detail ? `\n  ${f.detail}` : ""}\n`;
  if (r.findings.length > 40) md += `- … y ${r.findings.length - 40} más (ver data/review/${r.checker}.json)\n`;
  md += "\n";
}
fs.writeFileSync("review-summary.md", md);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `needs_review=${pending.length ? "true" : "false"}\n`);
console.log(md);
