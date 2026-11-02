/**
 * Lógica pura del comparador. Sin dependencias de React: se prueba en tests/compare.test.ts.
 *
 * Garantías:
 *  - Una celda solo contiene propuestas cuyo partyId coincide con la columna (no hay relleno).
 *  - Una celda vacía se muestra como «Sin posición documentada», nunca como oposición.
 *  - «Solo diferencias» oculta únicamente las coincidencias marcadas editorialmente (positionKey)
 *    compartidas por TODOS los partidos seleccionados.
 */
import type { PolicyTopic, Proposal } from "./schema";

export interface MatrixCell {
  partyId: string;
  proposals: Proposal[];
  /** Propuestas ocultas en modo «solo diferencias». */
  hiddenAsCoincidence: Proposal[];
}
export interface MatrixRow {
  dimensionId: string;
  label: string;
  cells: MatrixCell[];
  /** Claves compartidas por todos los partidos seleccionados. */
  sharedKeys: string[];
  /** En «solo diferencias»: toda la fila son coincidencias; no se muestra, pero se cuenta. */
  collapsed: boolean;
}

export function buildMatrix(
  proposals: Proposal[],
  topic: PolicyTopic,
  partyIds: string[],
  mode: "todo" | "diferencias" = "todo",
): MatrixRow[] {
  const rows: MatrixRow[] = [];
  for (const dim of topic.dimensions) {
    const inRow = proposals.filter((p) => p.topicId === topic.id && p.dimensionId === dim.id);
    const byParty = partyIds.map((pid) => inRow.filter((p) => p.partyId === pid));
    const keySets = byParty.map((ps) => new Set(ps.map((p) => p.positionKey).filter(Boolean) as string[]));
    const sharedKeys =
      partyIds.length > 1 ? [...(keySets[0] ?? new Set<string>())].filter((k) => keySets.every((s) => s.has(k))) : [];
    const cells: MatrixCell[] = partyIds.map((pid, i) => {
      const all = byParty[i];
      if (mode === "diferencias") {
        const hidden = all.filter((p) => p.positionKey && sharedKeys.includes(p.positionKey));
        return { partyId: pid, proposals: all.filter((p) => !hidden.includes(p)), hiddenAsCoincidence: hidden };
      }
      return { partyId: pid, proposals: all, hiddenAsCoincidence: [] };
    });
    const anyVisible = cells.some((c) => c.proposals.length > 0);
    const anyDocumented = inRow.some((p) => partyIds.includes(p.partyId));
    if (!anyDocumented) continue; // fila sin ningún dato para los partidos elegidos
    rows.push({ dimensionId: dim.id, label: dim.label, cells, sharedKeys, collapsed: mode === "diferencias" && !anyVisible });
  }
  return rows;
}

/** Orden inicial alfabético (es-ES) por nombre corto; el usuario puede reordenar. */
export function alphabetical<T extends { shortName: string }>(parties: T[]): T[] {
  return [...parties].sort((a, b) => a.shortName.localeCompare(b.shortName, "es", { sensitivity: "base" }));
}

export function clampSelection(ids: string[], valid: string[]): string[] {
  const uniq = [...new Set(ids.filter((i) => valid.includes(i)))];
  if (uniq.length >= 2) return uniq.slice(0, 5);
  return valid.slice(0, Math.max(2, Math.min(5, valid.length)));
}

/** Codificación compacta de la comparación en la URL: ?p=pp,psoe&t=vivienda&m=diferencias */
export function encodeCompareState(s: { parties: string[]; topic: string; mode: "todo" | "diferencias" }) {
  const q = new URLSearchParams();
  q.set("p", s.parties.join(","));
  q.set("t", s.topic);
  if (s.mode === "diferencias") q.set("m", "diferencias");
  return q.toString();
}
