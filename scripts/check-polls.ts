/**
 * Vigilante de encuestas. Compara la revisión de Wikipedia usada en data/polls.json con la
 * actual y lista las referencias (URL) añadidas desde entonces. No incorpora cifras: cada
 * encuesta nueva debe contrastarse con su publicación original antes de entrar en los datos.
 *
 * Uso: npx tsx scripts/check-polls.ts  → data/review/polls.json
 */
import { get, readData, writeReview, type Finding } from "./lib/review";

const API = "https://en.wikipedia.org/w/api.php";
const TITLE = "Opinion_polling_for_the_2026_Spanish_general_election";

async function wikitext(oldid?: string) {
  const q = oldid ? `revids=${oldid}` : `titles=${TITLE}`;
  const j = JSON.parse(await get(`${API}?action=query&prop=revisions&${q}&rvprop=ids|timestamp|content&rvslots=main&format=json&formatversion=2`));
  const rev = j.query.pages[0].revisions[0];
  return { id: String(rev.revid), ts: rev.timestamp as string, text: rev.slots.main.content as string };
}

/** URL de las referencias de la sección de 2026 (antes de la primera tabla de años anteriores). */
function refs(text: string) {
  const out = new Map<string, string>();
  for (const m of text.matchAll(/\{\{\s*cite (?:web|news)([\s\S]*?)\}\}/gi)) {
    const url = m[1].match(/\|\s*url\s*=\s*([^|}\s]+)/)?.[1];
    const title = m[1].match(/\|\s*title\s*=\s*([^|}]+)/)?.[1]?.trim() ?? "";
    if (url) out.set(url.trim(), title);
  }
  return out;
}

async function main() {
  const polls = readData<{ aggregator: { revision: string }; polls: { url: string }[] }>("polls.json");
  try {
    const [base, cur] = await Promise.all([wikitext(polls.aggregator.revision), wikitext()]);
    const known = new Set(polls.polls.map((p) => p.url));
    const before = refs(base.text);
    const findings: Finding[] = [];
    if (cur.id !== base.id)
      for (const [url, title] of refs(cur.text)) if (!before.has(url) && !known.has(url)) findings.push({ kind: "encuesta_nueva", title: title || url, url, detail: `Añadida en Wikipedia después de la revisión ${base.id}. Contrastar con el original antes de publicar.` });
    writeReview({
      checker: "polls",
      ok: true,
      findings,
      note: cur.id === base.id ? `Sin cambios desde la revisión ${base.id}.` : `Revisión de referencia ${base.id} → actual ${cur.id} (${cur.ts}).`,
    });
  } catch (e) {
    writeReview({ checker: "polls", ok: false, error: (e as Error).message, findings: [] });
  }
}
main();
