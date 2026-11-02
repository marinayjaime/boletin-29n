/**
 * Fuente única de la identidad cromática de las candidaturas.
 * Los valores también se exponen como variables CSS (--pp, --pp-soft…) en globals.css;
 * tests/party-theme.test.ts comprueba que ambos coinciden y que son distintos entre sí.
 *
 * El color identifica, no valora: todas las formaciones reciben el mismo tamaño,
 * la misma jerarquía y siempre van acompañadas de su nombre.
 */
export type PartyTheme = {
  id: string;
  primary: string;
  secondary: string;
  soft: string;
  strong: string;
  /** Color de texto legible sobre `primary`. */
  on: string;
  cssVar: string;
  source: { label: string; url: string };
};

export const PARTY_THEME: Record<string, PartyTheme> = {
  "frente-amplio": {
    id: "frente-amplio",
    primary: "#e51c55",
    secondary: "#f06fb0",
    soft: "#fce4f2",
    strong: "#b0123f",
    on: "#ffffff",
    cssVar: "fa",
    source: { label: "Color dominante de movimientosumar.es (no se ha localizado manual de marca propio de Frente Amplio)", url: "https://movimientosumar.es" },
  },
  podemos: {
    id: "podemos",
    primary: "#5a205a",
    secondary: "#8e4a8e",
    soft: "#f3e8f3",
    strong: "#5a205a",
    on: "#ffffff",
    cssVar: "podemos",
    source: { label: "Color de partido en Wikipedia (Module:Political party/P); podemos.info bloquea el acceso automatizado", url: "https://en.wikipedia.org/wiki/Module:Political_party/P" },
  },
  pp: {
    id: "pp",
    primary: "#21599e",
    secondary: "#5896ce",
    soft: "#e6eef8",
    strong: "#1a4780",
    on: "#ffffff",
    cssVar: "pp",
    source: { label: "Colores dominantes de la web oficial pp.es", url: "https://www.pp.es" },
  },
  psoe: {
    id: "psoe",
    primary: "#e01b26",
    secondary: "#f5747a",
    soft: "#fde8e9",
    strong: "#b5121b",
    on: "#ffffff",
    cssVar: "psoe",
    source: { label: "Rojo del PSOE (Wikipedia, Module:Political party/S), oscurecido levemente (#ef1c27 → #e01b26) para que el texto blanco cumpla el contraste 4,5:1; psoe.es bloquea el acceso automatizado", url: "https://en.wikipedia.org/wiki/Module:Political_party/S" },
  },
  vox: {
    id: "vox",
    primary: "#63be21",
    secondary: "#9ad86b",
    soft: "#edf7e4",
    strong: "#3d7a12",
    on: "#0b0d17",
    cssVar: "vox",
    source: { label: "Color de partido en Wikipedia (Module:Political party/V); voxespana.es bloquea el acceso automatizado", url: "https://en.wikipedia.org/wiki/Module:Political_party/V" },
  },
};

/** Variables CSS listas para usar en style={{ color: v.primary }} con soporte de tema oscuro. */
export function partyVars(id: string) {
  const c = PARTY_THEME[id]?.cssVar ?? "ink";
  return {
    primary: `var(--${c})`,
    secondary: `var(--${c}-2)`,
    soft: `var(--${c}-soft)`,
    strong: `var(--${c}-strong)`,
    on: `var(--${c}-on)`,
  };
}

/** Grupos parlamentarios y formaciones de las encuestas → color. Los no analizados usan una gama neutra. */
export const GROUP_COLORS: Record<string, string> = {
  GP: "var(--pp)",
  GS: "var(--psoe)",
  GVOX: "var(--vox)",
  GSUMAR: "var(--fa)",
  GMx: "#9aa1b8",
  GR: "#d4a017",
  GJxCAT: "#2bb3a8",
  "GEH Bildu": "#3f8f5b",
  "GV (EAJ-PNV)": "#5d8a3b",
};

/** Formaciones que aparecen en encuestas (claves de data/polls.json). */
export const POLL_PARTY = {
  PP: { name: "PP", color: "var(--pp)", partyId: "pp" },
  PSOE: { name: "PSOE", color: "var(--psoe)", partyId: "psoe" },
  VOX: { name: "Vox", color: "var(--vox)", partyId: "vox" },
  FA: { name: "Frente Amplio", color: "var(--fa)", partyId: "frente-amplio" },
  PODEMOS: { name: "Podemos", color: "var(--podemos)", partyId: "podemos" },
  ERC: { name: "ERC", color: "#d4a017", partyId: null },
  ERC_PODEMOS: { name: "ERC-Podemos", color: "#c08a12", partyId: null },
  UPN: { name: "UPN", color: "#5b7fb5", partyId: null },
  CHA: { name: "Chunta", color: "#8a6d3b", partyId: null },
  MES: { name: "Més", color: "#9c6fb0", partyId: null },
  CANARIAS: { name: "CC o UPC", color: "#e8c547", partyId: null },
  JUNTS: { name: "Junts", color: "#2bb3a8", partyId: null },
  BILDU: { name: "EH Bildu", color: "#3f8f5b", partyId: null },
  PNV: { name: "PNV", color: "#5d8a3b", partyId: null },
  BNG: { name: "BNG", color: "#7fb3d5", partyId: null },
  CCA: { name: "Coalición Canaria", color: "#e8c547", partyId: null },
  FV: { name: "Front Valencià", color: "#e07b39", partyId: null },
  ADELANTE: { name: "Adelante Andalucía", color: "#4c9a6a", partyId: null },
  SALF: { name: "SALF", color: "#7a7f93", partyId: null },
  OTROS: { name: "Otros", color: "#b8bdcc", partyId: null },
} as const;
export type PollKey = keyof typeof POLL_PARTY;

/** Orden de los bloques en el hemiciclo de escaños (convención visual, no ideológica: por tamaño). */
export function contrastRatio(a: string, b: string) {
  const lum = (h: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
