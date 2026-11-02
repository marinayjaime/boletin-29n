/**
 * Transformaciones puras de series estadísticas (probadas en tests/series.test.ts).
 * Ninguna función rellena huecos ni extrapola: solo filtra, rebasa o deflacta valores existentes.
 */
export type Obs = { geo: string; period: string; value: number; flag?: string };

/** Clave ordenable para periodos A, S, Q y M de Eurostat. */
export function periodKey(p: string): number {
  const y = Number(p.slice(0, 4));
  if (/^\d{4}$/.test(p)) return y * 12 + 6;
  const q = p.match(/-Q(\d)$/);
  if (q) return y * 12 + (Number(q[1]) - 1) * 3 + 2;
  const s = p.match(/-S(\d)$/);
  if (s) return y * 12 + (Number(s[1]) - 1) * 6 + 1;
  const m = p.match(/-(\d{2})$/);
  if (m) return y * 12 + Number(m[1]) - 1;
  return y * 12;
}

export const yearOf = (p: string) => Number(p.slice(0, 4));

export function byGeo(obs: Obs[]): Map<string, Obs[]> {
  const m = new Map<string, Obs[]>();
  for (const o of obs) m.set(o.geo, [...(m.get(o.geo) ?? []), o]);
  for (const [k, v] of m) m.set(k, [...v].sort((a, b) => periodKey(a.period) - periodKey(b.period)));
  return m;
}

export function filterYears(obs: Obs[], from: number, to: number): Obs[] {
  return obs.filter((o) => yearOf(o.period) >= from && yearOf(o.period) <= to);
}

/**
 * Índice 100 en el primer periodo visible de cada geografía.
 * Si el primer valor es 0 o negativo, el rebase no tiene sentido y se devuelve null.
 */
export function rebase(series: Obs[]): Obs[] | null {
  if (!series.length) return series;
  const base = series[0].value;
  if (base <= 0) return null;
  return series.map((o) => ({ ...o, value: (o.value / base) * 100 }));
}

/**
 * Deflacta una serie anual nominal con un índice de precios anual (mismo geo).
 * Resultado en euros constantes del último año común. Los años sin índice se descartan.
 */
export function deflate(nominal: Obs[], priceIndex: Obs[]): Obs[] {
  const idx = new Map(priceIndex.map((o) => [`${o.geo}|${o.period}`, o.value]));
  const common = nominal.filter((o) => idx.has(`${o.geo}|${o.period}`));
  if (!common.length) return [];
  const lastByGeo = new Map<string, number>();
  for (const o of common) lastByGeo.set(o.geo, idx.get(`${o.geo}|${o.period}`)!);
  return common.map((o) => ({ ...o, value: (o.value * lastByGeo.get(o.geo)!) / idx.get(`${o.geo}|${o.period}`)! }));
}

export function toCSV(rows: Obs[], meta: { indicator: string; unit: string; source: string; fetchedAt: string }): string {
  const esc = (s: string) => (/[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const head = [`# ${meta.indicator}`, `# Unidad: ${meta.unit}`, `# Fuente: ${meta.source}`, `# Descargado: ${meta.fetchedAt}`, "geo,periodo,valor,marca"];
  return [...head, ...rows.map((r) => [r.geo, r.period, String(r.value), r.flag ?? ""].map(esc).join(","))].join("\n");
}

/** Valor de un año (media de subperiodos si la serie es infraanual), para comparar años. */
export function yearValue(series: Obs[], year: number): { value: number; n: number } | null {
  const xs = series.filter((o) => yearOf(o.period) === year);
  if (!xs.length) return null;
  return { value: xs.reduce((a, o) => a + o.value, 0) / xs.length, n: xs.length };
}
