import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { getIndicators, getParties, getPromises, getProposals, getSources } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { PageHero } from "@/components/ui";
import { SourcesLibrary } from "@/components/sources-library";

export const metadata: Metadata = { title: "Biblioteca de fuentes" };

export default function Page() {
  const counts: Record<string, number> = {};
  for (const p of getProposals()) for (const c of p.citations) counts[c.sourceId] = (counts[c.sourceId] ?? 0) + 1;
  for (const p of getPromises()) counts[p.citation.sourceId] = (counts[p.citation.sourceId] ?? 0) + 1;
  const events = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "events.json"), "utf8")) as { events: { date: string; label: string; url: string; topics: string[] }[] };
  const extras = [
    ...getIndicators()
      .filter((i) => !i.hidden)
      .map((i) => ({ id: `ind-${i.id}`, title: `${i.name} (${i.dataset})`, author: i.provider, kind: "estadistica", year: "2026", url: i.sourceUrl, topic: i.area })),
    ...events.events
      .filter((e) => e.url.includes("boe.es"))
      .map((e) => ({ id: `ev-${e.date}`, title: e.label, author: "Boletín Oficial del Estado", kind: "ley", year: e.date.slice(0, 4), url: e.url, topic: e.topics.join(", ") })),
    ...getPromises()
      .flatMap((p) => p.assessment.officialActions)
      .filter((a) => a.url.includes("boe.es"))
      .map((a) => ({ id: `boe-${a.url}`, title: a.text, author: "Boletín Oficial del Estado", kind: "ley", year: a.date.slice(0, 4), url: a.url, topic: "promesas" })),
  ];
  const uniq = [...new Map(extras.map((e) => [e.url + e.title, e])).values()];
  return (
    <>
      <PageHero eyebrow="Fuentes" title="De dónde sale todo" sub="Cada documento, con su enlace original, copia archivada y estado de verificación." />
      <div className="mx-auto max-w-[1100px] px-4 md:px-8">
      <SourcesLibrary sources={getSources()} extras={uniq} parties={alphabetical(getParties()).map((p) => ({ id: p.id, shortName: p.shortName }))} counts={counts} />
    </div>
    </>
  );
}
