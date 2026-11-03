import type { Metadata } from "next";
import { getCommonalities, getParties, getProposals, getSources, getTopics } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { PageHero, Disclosure } from "@/components/ui";
import { CommonGround } from "@/components/common-ground";
import { DataStatus } from "@/components/data-status";

export const metadata: Metadata = { title: "Puntos en común", description: "Propuestas equivalentes, objetivos compartidos y coincidencias parciales entre partidos, documentadas." };

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Puntos en común" title="En qué coinciden" sub="Elige partidos. Las coincidencias salen de citas literales, no de palabras parecidas." />
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <DataStatus datasets={[]} editorial={["commonalities"]} />
        <CommonGround groups={getCommonalities()} parties={alphabetical(getParties())} proposals={getProposals()} topics={getTopics()} sources={getSources()} />
        <div className="mt-10 grid gap-2 md:grid-cols-2">
          <Disclosure summary="¿Cómo se decide que dos propuestas coinciden?">Cada grupo se revisa a mano a partir de las citas literales. «Equivalente» significa la misma medida; «objetivo compartido», el mismo fin con medios distintos; «parcial», coincidencia en una parte. Se indica siempre en qué difieren.</Disclosure>
          <Disclosure summary="Lo que no significa">Que dos partidos coincidan en un punto no implica afinidad general ni acuerdo político. La ausencia de coincidencia puede deberse a que no hay propuestas indexadas sobre ese tema.</Disclosure>
        </div>
      </div>
    </>
  );
}
