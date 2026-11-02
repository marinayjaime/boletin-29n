import { Suspense } from "react";
import type { Metadata } from "next";
import { getParties, getProposals, getSources, getTopics } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { Comparator } from "@/components/comparator";
import { PageHero, Disclosure } from "@/components/ui";

export const metadata: Metadata = { title: "Comparador", description: "Compara entre dos y cinco partidos, tema a tema, con la cita original de cada propuesta." };

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Comparador" title="¿Qué propone cada uno?" sub="Elige partidos y tema. Toca una propuesta para ver la cita y el documento." />
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <Suspense fallback={<p className="py-10 font-bold text-ink-3">Cargando…</p>}>
          <Comparator parties={alphabetical(getParties())} topics={getTopics()} proposals={getProposals()} sources={getSources()} />
        </Suspense>
        <div className="mt-12 grid gap-2 md:grid-cols-3">
          <Disclosure summary="Programas 2026: pendientes">Ningún partido había publicado su programa 2026 al comprobarlo (2 de noviembre de 2026). Se muestran documentos anteriores, siempre etiquetados.</Disclosure>
          <Disclosure summary="Frente Amplio y Podemos">En la columna de Frente Amplio aparece el programa de la coalición Sumar de 2023 (que entonces incluía a Podemos) como antecedente. En la de Podemos, su programa de generales de 2019 y su programa europeo de 2024.</Disclosure>
          <Disclosure summary="¿Por qué colores de partido?">Sirven para identificar, no para valorar. Todos tienen el mismo tamaño y el nombre siempre acompaña al color. El orden inicial es alfabético y puedes cambiarlo.</Disclosure>
        </div>
      </div>
    </>
  );
}
