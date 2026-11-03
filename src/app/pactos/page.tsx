import type { Metadata } from "next";
import { getPolls } from "@/lib/data";
import { PageHero } from "@/components/ui";
import { Pacts } from "@/components/pacts";
import { DataStatus } from "@/components/data-status";

export const metadata: Metadata = { title: "Pactos y mayorías", description: "Escaños según las encuestas publicadas y simulador de mayorías e investidura. Todas las combinaciones son hipotéticas." };

export default function Page() {
  const { polls, aggregator } = getPolls();
  return (
    <>
      <PageHero eyebrow="Pactos y mayorías" title="¿Quién llega a 176?" sub="Explora las encuestas publicadas o reparte tú los 350 escaños." tone="ink" />
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <DataStatus datasets={["vigilante-polls"]} editorial={["polls"]} />
        <Pacts polls={polls} aggregator={aggregator} />
      </div>
    </>
  );
}
