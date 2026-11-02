/**
 * Informes de revisión: lo que detectan los vigilantes automáticos y que exige una
 * persona antes de publicarse (encuestas, cargos, programas). Nunca modifican los datos.
 */
import fs from "node:fs";
import path from "node:path";

export type Finding = { kind: string; title: string; detail?: string; url?: string };
export type Review = { checker: string; checkedAt: string; ok: boolean; error?: string; findings: Finding[]; note?: string };

export const DATA = path.join(process.cwd(), "data");
export const readData = <T = unknown>(f: string): T => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));

export function writeReview(r: Omit<Review, "checkedAt">) {
  const dir = path.join(DATA, "review");
  fs.mkdirSync(dir, { recursive: true });
  const out: Review = { ...r, checkedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, `${r.checker}.json`), JSON.stringify(out, null, 2) + "\n");
  console.log(`${r.checker}: ${r.error ? "ERROR " + r.error : `${r.findings.length} hallazgos`}`);
}

export const UA = { "User-Agent": "Boletin29N-monitor/1.0 (+https://github.com/marinayjaime/boletin-29n)" };

export async function get(url: string, tries = 3): Promise<string> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: "follow" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      last = e;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
