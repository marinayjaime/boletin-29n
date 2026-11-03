import type { Metadata } from "next";
import { getParties, getProposals, getQuiz, getSources, getTopics } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { PageHero } from "@/components/ui";
import { BlindTest } from "@/components/blind-test";
import { DataStatus } from "@/components/data-status";

export const metadata: Metadata = { title: "Test a ciegas", description: "Responde sin saber qué partido defiende cada postura. Al final, tus coincidencias con los cinco partidos, tema a tema y con sus fuentes." };

export default function Page() {
  const quiz = getQuiz();
  const ids = new Set(quiz.flatMap((q) => q.positions.flatMap((p) => p.proposalIds)));
  return (
    <>
      <PageHero eyebrow="Test a ciegas" title="Primero tú. Después, quién lo dijo." tone="brand" />
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <DataStatus datasets={[]} editorial={["quiz"]} />
        <BlindTest statements={quiz} parties={alphabetical(getParties())} topics={getTopics()} proposals={getProposals().filter((p) => ids.has(p.id))} sources={getSources()} />
      </div>
    </>
  );
}
