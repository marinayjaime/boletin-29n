/**
 * Puntos en común (puro, probado en tests/common.test.ts).
 * Solo usa emparejamientos revisados a mano (data/commonalities.json): no deduce
 * equivalencias por palabras parecidas.
 */
import type { Commonality, Proposal } from "./schema";

export const KIND_LABELS: Record<Commonality["kind"], { label: string; help: string }> = {
  equivalente: { label: "Propuesta equivalente", help: "Plantean la misma medida (con matices que se indican)." },
  objetivo: { label: "Objetivo compartido", help: "Persiguen el mismo objetivo con medidas distintas." },
  parcial: { label: "Coincidencia parcial", help: "Coinciden solo en una parte de la propuesta." },
};

/** Grupos con al menos dos partidos distintos entre los seleccionados; los miembros se filtran a esos partidos. */
export function commonForSelection(groups: Commonality[], proposals: Proposal[], selected: string[]) {
  const pmap = new Map(proposals.map((p) => [p.id, p]));
  return groups
    .map((g) => ({ ...g, members: g.members.filter((m) => selected.includes(pmap.get(m.proposalId)?.partyId ?? "")) }))
    .filter((g) => new Set(g.members.map((m) => pmap.get(m.proposalId)!.partyId)).size >= 2);
}

/** Número de grupos compartidos por cada par de partidos. */
export function pairMatrix(groups: Commonality[], proposals: Proposal[], parties: string[]) {
  const pmap = new Map(proposals.map((p) => [p.id, p]));
  const m: Record<string, Record<string, number>> = {};
  for (const a of parties) {
    m[a] = {};
    for (const b of parties) m[a][b] = 0;
  }
  for (const g of groups) {
    const ps = [...new Set(g.members.map((x) => pmap.get(x.proposalId)?.partyId).filter(Boolean) as string[])];
    for (const a of ps) for (const b of ps) if (a !== b && m[a] && m[a][b] !== undefined) m[a][b]++;
  }
  return m;
}
