import type { Metadata } from "next";
import Link from "next/link";
import { getParties, getPromises, getSources, getTopics } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { PageHead } from "@/components/page-head";
import { PromisesBoard } from "@/components/promises-board";
import { PROMISE_STATUS as STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "Promesas frente a hechos" };

export default function Page() {
  const promises = getPromises();
  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-8">
      <PageHead
        kicker="Prioridad 4 · Promesas y hechos"
        title="Lo que se prometió y lo que consta"
        lede="Cada ficha compara un compromiso escrito con las decisiones oficiales posteriores (BOE y votaciones del Congreso), según un criterio explícito que se puede revisar."
      />
      <section className="mb-8 grid gap-6 rounded bg-paper-2 p-5 text-sm md:grid-cols-2">
        <div>
          <h2 className="kicker mb-2">Metodología</h2>
          <ul className="list-disc space-y-1 pl-5 text-ink-2">
            <li>Solo se evalúan compromisos con cita literal y página.</li>
            <li>Cada estado se asigna en revisión humana con un criterio escrito. Nunca se asigna con IA generativa ni de forma automática.</li>
            <li>Se distingue entre compromisos de partido, de Gobierno de coalición y de partidos en la oposición, que no controlan la agenda legislativa.</li>
            <li>Si las fuentes no permiten concluir, el estado es «No verificable».</li>
          </ul>
        </div>
        <div>
          <h2 className="kicker mb-2">Estados</h2>
          <ul className="space-y-1">
            {Object.values(STATUS).map((s) => (
              <li key={s.label}>
                <span className="mr-2 inline-block w-4 text-center" aria-hidden>
                  {s.glyph}
                </span>
                {s.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-ink-2">
            Primera versión: {promises.length} fichas. No es una muestra representativa del cumplimiento de ningún partido y no permite comparar porcentajes.{" "}
            <Link href="/metodologia#promesas" className="link">
              Más detalles
            </Link>
          </p>
        </div>
      </section>
      <PromisesBoard promises={promises} parties={alphabetical(getParties())} topics={getTopics()} sources={getSources()} />
    </div>
  );
}
