import MiniSearch from "minisearch";

export type SearchDoc = {
  id: string;
  k: "propuesta" | "pasaje" | "votacion" | "glosario";
  party: string | null;
  src: string | null;
  page: number | null;
  title: string;
  text: string;
  url: string;
  date: string | null;
};

const STOP = new Set(
  "a al algo algun alguna algunas alguno algunos ante antes como con contra cual cuales cuando de del desde donde dos el ella ellas ellos en entre era es esa esas ese eso esos esta estas este esto estos fue ha han hay la las le les lo los mas me mi muy nada ni no nos o os otra otras otro otros para pero poco por porque que quien se sea segun ser si sin sobre son su sus tambien tan tanto te tiene tienen todo todos tu un una unas uno unos y ya cada propone proponen propuesta propuestas partido partidos plantea plantean quiere quieren dice hacer".split(
    " ",
  ),
);

export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Lematización ligera para español: quita plurales y terminaciones frecuentes. */
export function stem(w: string) {
  if (w.length <= 4) return w;
  return w.replace(/(aciones|acion|amientos|amiento|idades|idad|mente|es|s)$/u, "");
}

export function tokenize(s: string) {
  return normalize(s)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export function createIndex(docs: SearchDoc[]) {
  const ms = new MiniSearch<SearchDoc>({
    fields: ["title", "text"],
    storeFields: ["id"],
    tokenize,
    processTerm: (t) => (STOP.has(t) ? null : stem(t)),
    searchOptions: {
      boost: { title: 2 },
      prefix: (t) => t.length > 4,
      fuzzy: (t) => (t.length > 6 ? 0.15 : false),
      combineWith: "OR",
      boostDocument: (id) => (String(id).startsWith("prop:") ? 1.6 : String(id).startsWith("glo:") ? 1.2 : 1),
    },
  });
  ms.addAll(docs);
  return ms;
}
