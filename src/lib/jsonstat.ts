/**
 * Utilidades para leer respuestas JSON-stat 2.0 de Eurostat.
 * Función pura y probada en tests/jsonstat.test.ts.
 */

export const NUTS2_ES = [
  { code: "ES11", name: "Galicia" },
  { code: "ES12", name: "Principado de Asturias" },
  { code: "ES13", name: "Cantabria" },
  { code: "ES21", name: "País Vasco" },
  { code: "ES22", name: "Comunidad Foral de Navarra" },
  { code: "ES23", name: "La Rioja" },
  { code: "ES24", name: "Aragón" },
  { code: "ES30", name: "Comunidad de Madrid" },
  { code: "ES41", name: "Castilla y León" },
  { code: "ES42", name: "Castilla-La Mancha" },
  { code: "ES43", name: "Extremadura" },
  { code: "ES51", name: "Cataluña" },
  { code: "ES52", name: "Comunitat Valenciana" },
  { code: "ES53", name: "Illes Balears" },
  { code: "ES61", name: "Andalucía" },
  { code: "ES62", name: "Región de Murcia" },
  { code: "ES63", name: "Ciudad de Ceuta" },
  { code: "ES64", name: "Ciudad de Melilla" },
  { code: "ES70", name: "Canarias" },
] as const;

export const GEO_LABELS: Record<string, string> = {
  ES: "España",
  EU27_2020: "UE-27",
  EA: "Zona euro",
  EA20: "Zona euro",
  DE: "Alemania",
  FR: "Francia",
  IT: "Italia",
  PT: "Portugal",
  ...Object.fromEntries(NUTS2_ES.map((r) => [r.code, r.name])),
};

type Dim = { category: { index: Record<string, number> | string[]; label?: Record<string, string> } };

export interface ParsedJsonStat {
  label: string;
  updated: string | null;
  observations: { geo: string; period: string; value: number; flag?: string }[];
}

function indexOf(dim: Dim): string[] {
  const idx = dim.category.index;
  if (Array.isArray(idx)) return idx;
  return Object.entries(idx)
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => k);
}

/**
 * Convierte una respuesta JSON-stat en observaciones (geo, periodo, valor).
 * Exige que todas las dimensiones salvo geo y time tengan un único valor:
 * así se evita mezclar series distintas por error en la consulta.
 */
export function parseJsonStat(json: Record<string, unknown>): ParsedJsonStat {
  const ids = json.id as string[];
  const sizes = json.size as number[];
  const dims = json.dimension as Record<string, Dim>;
  const values = (json.value ?? {}) as Record<string, number> | number[];
  const status = (json.status ?? {}) as Record<string, string>;
  if (!ids || !sizes || !dims) throw new Error("Respuesta JSON-stat no válida");

  ids.forEach((id, i) => {
    if (id !== "geo" && id !== "time" && sizes[i] !== 1) {
      throw new Error(`La dimensión «${id}» tiene ${sizes[i]} valores; la consulta debe fijar uno solo.`);
    }
  });

  const geoPos = ids.indexOf("geo");
  const timePos = ids.indexOf("time");
  const geos = indexOf(dims.geo);
  const times = indexOf(dims.time);

  // strides
  const strides = sizes.map((_, i) => sizes.slice(i + 1).reduce((a, b) => a * b, 1));
  const observations: ParsedJsonStat["observations"] = [];
  for (let g = 0; g < geos.length; g++) {
    for (let t = 0; t < times.length; t++) {
      const flat = g * strides[geoPos] + t * strides[timePos];
      const v = Array.isArray(values) ? values[flat] : values[String(flat)];
      if (v === null || v === undefined || Number.isNaN(v)) continue;
      const flag = status[String(flat)];
      observations.push({ geo: geos[g], period: times[t], value: v, ...(flag ? { flag } : {}) });
    }
  }
  return { label: String(json.label ?? ""), updated: (json.updated as string) ?? null, observations };
}
