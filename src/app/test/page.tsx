import type { Metadata } from "next";
import { getParties, getProposals, getQuiz, getSources, getTopics } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { PageHead } from "@/components/page-head";
import { BlindTest } from "@/components/blind-test";

export const metadata: Metadata = {
  title: "Test a ciegas",
  description: "Responde sin saber qué partido defiende cada postura y descubre después las posiciones documentadas. Sin ranking ni recomendación de voto.",
};

export default function Page() {
  const quiz = getQuiz();
  const ids = new Set(quiz.flatMap((q) => q.positions.flatMap((p) => p.proposalIds)));
  return (
    <div className="mx-auto max-w-[1320px] px-4 md:px-8">
      <PageHead kicker="Prioridad 2 · Test a ciegas" title="Primero tú. Después, quién lo dijo." lede="Reflexiona sobre cuestiones concretas sin etiquetas de partido. Al final verás las posturas documentadas, con su fuente." />
      <BlindTest
        statements={quiz}
        parties={alphabetical(getParties())}
        topics={getTopics()}
        proposals={getProposals().filter((p) => ids.has(p.id))}
        sources={getSources()}
      />
    </div>
  );
}
