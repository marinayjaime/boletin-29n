/**
 * Vigilante de programas electorales de 2026. Revisa las páginas de cada candidatura
 * (data/watch.json) en busca de enlaces a un programa de 2026. Si un sitio bloquea el
 * acceso automatizado se informa como «bloqueado»: no se deduce nada de ello.
 *
 * Uso: npx tsx scripts/check-programs.ts  → data/review/programs.json
 */
import { UA, readData, writeReview, type Finding } from "./lib/review";

type Watch = { programs: { partyId: string; pages: string[] }[] };
const KNOWN = new Set(readData<{ officialUrl: string; archiveUrl?: string }[]>("sources.json").flatMap((s) => [s.officialUrl, s.archiveUrl]).filter(Boolean) as string[]);

async function main() {
  const { programs } = readData<Watch>("watch.json");
  const findings: Finding[] = [];
  const blocked: string[] = [];
  for (const p of programs)
    for (const page of p.pages) {
      try {
        const r = await fetch(page, { headers: UA, redirect: "follow" });
        if (!r.ok) {
          blocked.push(`${p.partyId}: ${page} (HTTP ${r.status})`);
          continue;
        }
        const html = await r.text();
        for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
          const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          const href = new URL(m[1], page).toString();
          const looks = /programa/i.test(text + " " + href) && /2026|generales/i.test(text + " " + href);
          if (looks && !KNOWN.has(href)) findings.push({ kind: "programa_posible", title: `${p.partyId}: ${text || href}`, url: href, detail: `Enlace encontrado en ${page}. Comprobar que es el programa oficial de las generales de 2026.` });
        }
      } catch (e) {
        blocked.push(`${p.partyId}: ${page} (${(e as Error).message})`);
      }
    }
  const uniq = [...new Map(findings.map((f) => [f.url, f])).values()];
  writeReview({ checker: "programs", ok: true, findings: uniq, note: blocked.length ? `Sin acceso automatizado: ${blocked.join("; ")}` : "Todas las páginas respondieron." });
}
main();
