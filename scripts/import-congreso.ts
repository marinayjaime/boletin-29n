/**
 * Importador de votaciones del Congreso de los Diputados (datos abiertos).
 *
 * Uso:
 *   npx tsx scripts/import-congreso.ts            # todas las fechas de la XV Legislatura
 *   npx tsx scripts/import-congreso.ts 20240530    # una o varias fechas (AAAAMMDD)
 *
 * Flujo verificable:
 *  1. Lee la lista oficial de días con votaciones de https://www.congreso.es/es/opendata/votaciones
 *  2. Para cada día, abre la página del día y obtiene: ZIP de la sesión, número de expediente,
 *     enlace al Diario de Sesiones y número de votación (a partir de la ruta de la gráfica).
 *  3. Descarga el ZIP (se guarda en .cache/congreso para poder repetir el proceso) y lee
 *     el JSON de cada votación: totales y voto nominal de cada diputado.
 *  4. Calcula el desglose por grupo a partir de los votos nominales (no a partir de suposiciones).
 *  5. Escribe data/votes/index.json y public/data/votes/<id>.json (detalle nominal).
 */
import fs from "node:fs";
import path from "node:path";
import { recordRun } from "./lib/status";
import { unzipSync, strFromU8 } from "fflate";
import { classifyVote, topicsForVote, computeResult, requiresAbsoluteMajority } from "../src/lib/votes-classify";

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, ".cache", "congreso");
const OUT_INDEX = path.join(ROOT, "data", "votes");
const OUT_DETAIL = path.join(ROOT, "public", "data", "votes");
const BASE = "https://www.congreso.es";
const LEG = 15;
const UA = { "User-Agent": "Mozilla/5.0 (plataforma-electoral; importador de datos abiertos)" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, binary = false, attempt = 1): Promise<string | Uint8Array> {
  try {
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return binary ? new Uint8Array(await res.arrayBuffer()) : await res.text();
  } catch (e) {
    if (attempt < 4) {
      await sleep(1500 * attempt);
      return get(url, binary, attempt + 1);
    }
    throw new Error(`${(e as Error).message} en ${url}`);
  }
}

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

interface DayVoteMeta {
  expediente: string | null;
  detailUrl: string | null;
  heading: string;
  section: string;
  totals: { si: number; no: number; abst: number } | null;
}
interface DayMeta {
  zips: string[];
  session: number | null;
  byVote: Record<number, DayVoteMeta>;
}

/**
 * Extrae de la página de un día los metadatos que no vienen en el JSON (expediente, Diario de Sesiones)
 * y los totales publicados en HTML, que son la única fuente para las votaciones públicas por llamamiento.
 */
export function parseDayPage(html: string): DayMeta {
  const zips = [...new Set([...html.matchAll(/\/webpublica\/opendata\/votaciones\/[^"]+?\.zip/g)].map((m) => BASE + m[0]))];
  const session = Number(html.match(/\/votaciones\/Leg\d+\/Sesion(\d+)\//)?.[1] ?? NaN) || null;
  const byVote: DayMeta["byVote"] = {};
  const sections = [...html.matchAll(/<h4>([\s\S]*?)<\/h4>/g)].map((m) => ({
    at: m.index ?? 0,
    text: decodeEntities(m[1].replace(/<[^>]+>/g, "")).replace(/^PUNTO [^.]+\.\s*/, ""),
  }));
  const re = /<div id="accordionEst\d+"/g;
  const starts = [...html.matchAll(re)].map((m) => m.index ?? 0);
  starts.forEach((start, k) => {
    const b = html.slice(start, starts[k + 1] ?? html.length);
    const heading = decodeEntities((b.match(/<h5[^>]*>([\s\S]*?)<\/h5>/)?.[1] ?? "").replace(/<[^>]+>/g, ""));
    const expediente = b.match(/Núm\. expte\. ([0-9]{3}\/[0-9]{6})/)?.[1] ?? null;
    const detailUrl = b.match(/href="(https:\/\/www\.congreso\.es\/public_oficiales\/[^"]+)"/)?.[1] ?? null;
    const section = [...sections].reverse().find((x) => x.at < start)?.text ?? "";
    const si = b.match(/<p>Si: (\d+)<\/p>/);
    const no = b.match(/<p>No: (\d+)<\/p>/);
    const ab = b.match(/<p>Abstenciones: (\d+)<\/p>/);
    const totals = si && no && ab ? { si: Number(si[1]), no: Number(no[1]), abst: Number(ab[1]) } : null;
    const nums = [...b.matchAll(/Votacion(\d{3})\/VOT_/g)].map((m) => Number(m[1]));
    for (const n of nums) byVote[n] = { expediente, detailUrl, heading, section, totals };
  });
  return { zips, session, byVote };
}

const VOTE_CODE: Record<string, string> = { Sí: "S", No: "N", Abstención: "A", "No vota": "X" };

interface RawVote {
  informacion: {
    sesion: number;
    numeroVotacion: number;
    fecha: string;
    titulo: string;
    textoExpediente: string;
    tituloSubGrupo?: string;
    textoSubGrupo?: string;
  };
  totales: { asentimiento: string; presentes: number; afavor: number; enContra: number; abstenciones: number; noVotan: number };
  votaciones: { asiento: string; diputado: string; grupo: string; voto: string }[];
}

function isoFromCongreso(fecha: string) {
  const [d, m, y] = fecha.split("/").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

async function listDays(): Promise<string[]> {
  const html = (await get(`${BASE}/es/opendata/votaciones`)) as string;
  const m = html.match(/var diasVotaciones = \[([^\]]+)\]/);
  if (!m) throw new Error("No se encontró la lista de días con votaciones");
  return m[1].split(",").map((s) => s.trim());
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.mkdirSync(OUT_INDEX, { recursive: true });
  fs.mkdirSync(OUT_DETAIL, { recursive: true });

  const args = process.argv.slice(2);
  const days = args.length ? args : await listDays();
  console.log(`${days.length} días con votaciones`);

  const indexPath = path.join(OUT_INDEX, "index.json");
  const byId = new Map<string, Record<string, unknown>>();
  // Registro de diputados y grupos para codificar el voto nominal de forma compacta.
  const deputies: string[] = [];
  const depIdx = new Map<string, number>();
  const groups: string[] = [];
  const grpIdx = new Map<string, number>();
  const sessionDetail = new Map<number, Record<string, string>>();
  const failures: string[] = [];
  const di = (n: string) => {
    if (!depIdx.has(n)) {
      depIdx.set(n, deputies.length);
      deputies.push(n);
    }
    return depIdx.get(n)!;
  };
  const gi = (g: string) => {
    if (!grpIdx.has(g)) {
      grpIdx.set(g, groups.length);
      groups.push(g);
    }
    return grpIdx.get(g)!;
  };
  const CODE_CHARS = "abcdefghijklmnopqrstuvwxyz";

  for (const day of days) {
    const dd = `${day.slice(6, 8)}/${day.slice(4, 6)}/${day.slice(0, 4)}`;
    const iso = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
    try {
      const pageCache = path.join(CACHE, `${day}.html`);
      let html: string;
      if (fs.existsSync(pageCache)) html = fs.readFileSync(pageCache, "utf8");
      else {
        html = (await get(
          `${BASE}/es/opendata/votaciones?p_p_id=votaciones&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&targetLegislatura=XV&targetDate=${dd}`,
        )) as string;
        fs.writeFileSync(pageCache, html);
        await sleep(250);
      }
      const meta = parseDayPage(html);
      if (!meta.zips.length) throw new Error("sin ZIP en la página del día");
      let count = 0;
      const seen = new Set<number>();
      let session = meta.session;
      for (const zipUrl of meta.zips) {
        const zipCache = path.join(CACHE, path.basename(zipUrl));
        let buf: Uint8Array;
        if (fs.existsSync(zipCache)) buf = new Uint8Array(fs.readFileSync(zipCache));
        else {
          buf = (await get(zipUrl, true)) as Uint8Array;
          fs.writeFileSync(zipCache, buf);
          await sleep(250);
        }
        const files = unzipSync(buf, { filter: (f) => f.name.endsWith(".json") });
        for (const data of Object.values(files)) {
          const raw = JSON.parse(strFromU8(data).replace(/^\uFEFF/, "")) as RawVote;
          const i = raw.informacion;
          session = i.sesion;
          seen.add(i.numeroVotacion);
          const id = `L${LEG}-S${String(i.sesion).padStart(3, "0")}-V${String(i.numeroVotacion).padStart(3, "0")}`;
          const m = meta.byVote[i.numeroVotacion];
          const tallies = new Map<string, { si: number; no: number; abst: number; noVota: number }>();
          let enc = "";
          for (const v of raw.votaciones) {
            const g = tallies.get(v.grupo) ?? { si: 0, no: 0, abst: 0, noVota: 0 };
            if (v.voto === "Sí") g.si++;
            else if (v.voto === "No") g.no++;
            else if (v.voto === "Abstención") g.abst++;
            else g.noVota++;
            tallies.set(v.grupo, g);
            enc += di(v.diputado).toString(36).padStart(2, "0") + CODE_CHARS[gi(v.grupo)] + (VOTE_CODE[v.voto] ?? "X");
          }
          const assent = raw.totales.asentimiento === "Sí";
          const totals = {
            presentes: raw.totales.presentes,
            si: raw.totales.afavor,
            no: raw.totales.enContra,
            abst: raw.totales.abstenciones,
            noVota: raw.totales.noVotan,
          };
          const sub = `${i.tituloSubGrupo ?? ""} ${i.textoSubGrupo ?? ""}`;
          const absolute = requiresAbsoluteMajority(i.titulo, sub);
          byId.set(id, {
            id,
            legislature: LEG,
            session: i.sesion,
            number: i.numeroVotacion,
            date: isoFromCongreso(i.fecha),
            section: i.titulo,
            title: i.textoExpediente,
            subgroup: i.tituloSubGrupo || undefined,
            subgroupText: i.textoSubGrupo || undefined,
            expediente: m?.expediente ?? null,
            type: classifyVote(i.titulo, i.textoExpediente, i.tituloSubGrupo ?? "", i.textoSubGrupo ?? ""),
            assent,
            absoluteMajority: absolute,
            rollCall: false,
            totals,
            result: computeResult(totals, assent, absolute),
            groups: [...tallies.entries()].map(([group, t]) => ({ group, ...t })).sort((a, b) => a.group.localeCompare(b.group)),
            topicIds: topicsForVote(`${i.textoExpediente} ${i.textoSubGrupo ?? ""}`),
            detailUrl: m?.detailUrl ?? null,
            sourceZip: zipUrl,
            hasDeputyDetail: raw.votaciones.length > 0,
          });
          if (enc) {
            const sd = sessionDetail.get(i.sesion) ?? {};
            sd[String(i.numeroVotacion)] = enc;
            sessionDetail.set(i.sesion, sd);
          }
          count++;
        }
      }
      // Votaciones sin JSON nominal (públicas por llamamiento, p. ej. investidura): totales del HTML oficial.
      let rollCalls = 0;
      for (const [nStr, m] of Object.entries(meta.byVote)) {
        const n = Number(nStr);
        if (seen.has(n) || !m.totals || !session) continue;
        const id = `L${LEG}-S${String(session).padStart(3, "0")}-V${String(n).padStart(3, "0")}`;
        const totals = { presentes: m.totals.si + m.totals.no + m.totals.abst, si: m.totals.si, no: m.totals.no, abst: m.totals.abst, noVota: 0 };
        const absolute = requiresAbsoluteMajority(m.section, m.heading);
        const title = m.heading.replace(/\s*\((Pública por llamamiento|Secreta)[^)]*\)\s*$/i, "");
        byId.set(id, {
          id,
          legislature: LEG,
          session,
          number: n,
          date: iso,
          section: m.section,
          title,
          expediente: m.expediente,
          type: classifyVote(m.section, title, "", ""),
          assent: false,
          absoluteMajority: absolute,
          rollCall: /llamamiento/i.test(m.heading),
          totals,
          result: computeResult(totals, false, absolute),
          groups: [],
          topicIds: topicsForVote(title),
          detailUrl: m.detailUrl,
          sourceZip: meta.zips[0],
          hasDeputyDetail: false,
        });
        rollCalls++;
      }
      console.log(`✓ ${day}: ${count} votaciones con detalle nominal${rollCalls ? `, ${rollCalls} solo con totales (HTML)` : ""}`);
    } catch (e) {
      failures.push(`${day}: ${(e as Error).message}`);
      console.error(`✗ ${day}: ${(e as Error).message}`);
    }
  }

  const votes = [...byId.values()].sort(
    (a, b) =>
      String(b.date).localeCompare(String(a.date)) || (b.session as number) - (a.session as number) || (b.number as number) - (a.number as number),
  );
  fs.writeFileSync(indexPath, JSON.stringify({ importedAt: new Date().toISOString(), legislature: LEG, votes }));
  fs.rmSync(OUT_DETAIL, { recursive: true, force: true });
  fs.mkdirSync(OUT_DETAIL, { recursive: true });
  for (const [ses, detail] of sessionDetail) {
    fs.writeFileSync(path.join(OUT_DETAIL, `S${String(ses).padStart(3, "0")}.json`), JSON.stringify(detail));
  }
  fs.writeFileSync(path.join(OUT_DETAIL, "registry.json"), JSON.stringify({ deputies, groups, encoding: "por diputado: 2 caracteres base36 (índice en deputies) + 1 letra (índice en groups) + voto S/N/A/X" }));
  recordRun("congreso", failures.length === 0, `${days.length - failures.length} de ${days.length} sesiones importadas`, failures);
  console.log(`Total: ${votes.length} votaciones. Diputados: ${deputies.length}. Fallos: ${failures.length}`);
  if (failures.length) process.exitCode = 1;
}

main();
