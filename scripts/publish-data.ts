/**
 * Copia a public/ los ficheros que el navegador carga bajo demanda (series estadísticas)
 * y regenera el índice del buscador. Se ejecuta antes de `next build` (prebuild).
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const from = path.join(root, "data", "stats");
const to = path.join(root, "public", "data", "stats");
fs.mkdirSync(to, { recursive: true });
let n = 0;
for (const f of fs.readdirSync(from)) {
  if (!f.endsWith(".json")) continue;
  fs.copyFileSync(path.join(from, f), path.join(to, f));
  n++;
}
console.log(`publish-data: ${n} series copiadas a public/data/stats`);

// Índice ligero de votaciones para el listado (el detalle nominal se carga por sesión)
const vi = path.join(root, "data", "votes", "index.json");
if (fs.existsSync(vi)) {
  const { importedAt, votes } = JSON.parse(fs.readFileSync(vi, "utf8"));
  const lite = votes.map((v: Record<string, unknown> & { totals: Record<string, number>; groups: Record<string, number | string>[] }) => [
    v.id, v.date, v.type, v.result, String(v.title || v.section).slice(0, 260), v.subgroupText ? String(v.subgroupText).slice(0, 120) : "",
    (v.topicIds as string[]).join(","), v.totals.si, v.totals.no, v.totals.abst, v.totals.noVota,
    v.groups.map((g) => [g.group, g.si, g.no, g.abst, g.noVota]), v.rollCall ? 1 : 0, v.expediente ?? "",
  ]);
  fs.writeFileSync(path.join(root, "public", "data", "votes-index.json"), JSON.stringify({ importedAt, fields: "id,date,type,result,title,subgroupText,topics,si,no,abst,noVota,groups,rollCall,expediente", votes: lite }));
  console.log(`publish-data: índice ligero de ${lite.length} votaciones`);
}
execFileSync(process.execPath, [path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), path.join(root, "scripts", "build-search-index.ts")], { stdio: "inherit" });
