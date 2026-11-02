import type { Metadata } from "next";
import { getBoeLaws, getParties, getPromiseCoverage, getPromises, getSources, getTopics } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { PageHero, Disclosure } from "@/components/ui";
import { PromisesBoard } from "@/components/promises-board";

export const metadata: Metadata = { title: "Promesas y hechos", description: "Compromisos electorales contrastados con el BOE y las votaciones del Congreso, con criterio explícito." };

export default function Page() {
  const coverage = getPromiseCoverage()["psoe-2023"];
  const legislature = getBoeLaws().items.filter((x) => x.date <= coverage.periodEnd);
  return (
    <>
      <PageHero eyebrow="Promesas y hechos" title="Lo prometido, frente a lo que consta" sub="Cada estado tiene un criterio escrito y evidencias del BOE o del Congreso." />
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <PromisesBoard promises={getPromises()} parties={alphabetical(getParties())} topics={getTopics()} sources={getSources()} coverage={coverage} boeCount={legislature.filter((x) => x.kind !== "real_decreto").length} rdCount={legislature.filter((x) => x.kind === "real_decreto").length} />
        <div className="mt-10 grid gap-2 md:grid-cols-3">
          <Disclosure summary="¿Quién asigna los estados?">Una revisión humana con un criterio escrito antes de evaluar. Nunca se asignan con IA ni automáticamente.</Disclosure>
          <Disclosure summary="Partido, Gobierno u oposición">Se distingue el compromiso de un partido, la acción de un Gobierno de coalición y la iniciativa de un partido en la oposición, que no controla la agenda legislativa.</Disclosure>
          <Disclosure summary="¿Por qué hay más fichas del PSOE?">Porque es el partido que gobernó en la legislatura evaluada y sus compromisos legislativos se pueden contrastar con el BOE. No es una comparación del grado de cumplimiento entre partidos.</Disclosure>
        </div>
      </div>
    </>
  );
}
