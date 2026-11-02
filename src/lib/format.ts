const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-11-02" → "2 de noviembre de 2026"; "2019-10" → "octubre de 2019" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!m) return String(y);
  if (!d) return `${MONTHS[m - 1]} de ${y}`;
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!d) return `${MONTHS_SHORT[m - 1]} ${y}`;
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** Periodos de Eurostat: 2025, 2026-Q2, 2026-S1, 2026-09 */
export function formatPeriod(p: string): string {
  if (/^\d{4}$/.test(p)) return p;
  const q = p.match(/^(\d{4})-Q(\d)$/);
  if (q) return `${q[2]}.º trim. ${q[1]}`;
  const s = p.match(/^(\d{4})-S(\d)$/);
  if (s) return `${s[2]}.º sem. ${s[1]}`;
  const m = p.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${MONTHS_SHORT[Number(m[2]) - 1]} ${m[1]}`;
  return p;
}

export function formatNumber(v: number, decimals = 1): string {
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);
}

/** Días completos entre hoy y una fecha (zona Europe/Madrid aproximada por UTC). */
export function daysUntil(iso: string, now = new Date()): number {
  const target = new Date(`${iso}T00:00:00+01:00`).getTime();
  return Math.max(0, Math.ceil((target - now.getTime()) / 86_400_000));
}

/**
 * Formatea un valor con su unidad sin duplicarla. Única vía para mostrar cifras de indicadores.
 * formatValue(5, "%") → "5,0 %" · formatValue(100.5, "% PIB") → "100,5 % del PIB"
 */
export function formatValue(v: number, unitShort: string, decimals = 1): string {
  const n = formatNumber(v, decimals);
  const u = unitShort.trim();
  if (!u) return n;
  if (u === "% PIB") return `${n}\u00a0% del PIB`;
  if (u.startsWith("%")) return `${n}\u00a0${u}`;
  if (u === "€" || u.startsWith("€/")) return `${n}\u00a0${u}`;
  return `${n}\u00a0${u}`;
}

/** Unidad corta para acompañar una cifra grande (sin repetir la que ya se muestra). */
export function unitSuffix(unitShort: string): string {
  return unitShort === "% PIB" ? "% PIB" : unitShort;
}
