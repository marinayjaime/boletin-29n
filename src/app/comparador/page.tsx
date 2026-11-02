import { Suspense } from "react";
import type { Metadata } from "next";
import { getParties, getProposals, getSources, getTopics, getCycle } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { Comparator } from "@/components/comparator";
import { PageHead } from "@/components/page-head";
import { ProgramStatusStrip } from "@/components/program-status";

export const metadata: Metadata = {
  title: "Comparador de propuestas",
  description: "Compara entre dos y cinco partidos, tema a tema, con la cita original de cada propuesta.",
};

export default function Page() {
  const parties = alphabetical(getParties());
  return (
    <div className="mx-auto max-w-[1320px] px-4 md:px-8">
      <PageHead
        kicker="Prioridad 1 · Comparador"
        title="¿Qué plantea cada uno?"
        lede="Elige partidos y tema. Cada celda contiene una propuesta citada literalmente de su documento de origen. Si una celda está vacía, significa que no hay posición documentada aquí todavía, no que el partido se oponga."
      />
      <ProgramStatusStrip cycle={getCycle()} parties={parties} />
      <Suspense fallback={<p className="py-10 text-ink-3">Cargando comparador…</p>}>
        <Comparator parties={parties} topics={getTopics()} proposals={getProposals()} sources={getSources()} />
      </Suspense>
      <aside className="mt-10 max-w-3xl text-sm text-ink-2">
        <p>
          <strong className="text-ink">Orden y color.</strong> Las columnas aparecen en orden alfabético y todas usan el mismo estilo; puedes
          reordenarlas con las flechas. No se usan colores de partido.
        </p>
        <p className="mt-2">
          <strong className="text-ink">Frente Amplio y Podemos.</strong> Ninguno tiene programa de 2026 publicado. En la columna de Frente Amplio se
          muestra el programa de la coalición Sumar de 2023 (de la que entonces formaba parte Podemos) como antecedente. En la de Podemos, su
          programa de generales de 2019 y su programa europeo de 2024, marcado «Ámbito UE».
        </p>
      </aside>
    </div>
  );
}
