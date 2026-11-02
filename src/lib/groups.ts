/** Grupos parlamentarios de la XV Legislatura tal como aparecen en los datos abiertos del Congreso. */
export const GROUP_LABELS: Record<string, string> = {
  GP: "G. P. Popular",
  GS: "G. P. Socialista",
  GVOX: "G. P. VOX",
  GSUMAR: "G. P. Plurinacional SUMAR",
  GR: "G. P. Republicano",
  GJxCAT: "G. P. Junts per Catalunya",
  "GEH Bildu": "G. P. EH Bildu",
  "GV (EAJ-PNV)": "G. P. Vasco (EAJ-PNV)",
  GMx: "Grupo Mixto",
};

/**
 * Relación documental entre las cinco candidaturas y los grupos parlamentarios.
 * No es una equivalencia: se muestra siempre con su explicación.
 */
export const PARTY_GROUP_NOTE: Record<string, { group: string | null; note: string }> = {
  pp: { group: "GP", note: "Grupo Parlamentario Popular." },
  psoe: { group: "GS", note: "Grupo Parlamentario Socialista." },
  vox: { group: "GVOX", note: "Grupo Parlamentario VOX." },
  "frente-amplio": {
    group: "GSUMAR",
    note: "Antecedente, no equivalencia: el Grupo Plurinacional SUMAR agrupó a las formaciones de Sumar en la XV Legislatura. Su composición cambió y no coincide necesariamente con la coalición Frente Amplio de 2026.",
  },
  podemos: {
    group: null,
    note: "Sin grupo propio: sus diputados fueron elegidos en las listas de Sumar y, según los datos del Congreso, después votaron en el Grupo Mixto, donde también hay diputados de otras formaciones. No se agregan sus votos automáticamente.",
  },
};

export const VOTE_COLORS = { S: "var(--yes)", N: "var(--no)", A: "var(--abs)", X: "transparent" } as const;
export const VOTE_LABELS = { S: "Sí", N: "No", A: "Abstención", X: "No vota" } as const;
