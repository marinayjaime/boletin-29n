import { Suspense } from "react";
import type { Metadata } from "next";
import { getParties, getSources } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { CYCLE_LABELS } from "@/lib/labels";
import { PageHead } from "@/components/page-head";
import { SearchResults } from "@/components/search-results";

export const metadata: Metadata = { title: "Buscar en los documentos" };

export default function Page() {
  const parties = alphabetical(getParties()).map((p) => ({ id: p.id, shortName: p.shortName, monogram: p.monogram }));
  const sources = getSources().map((s) => ({
    id: s.id,
    title: s.title,
    officialUrl: s.officialUrl,
    archiveUrl: s.archiveUrl,
    hostedByThirdParty: s.hostedByThirdParty,
    cycleLabel: (s.cycle && CYCLE_LABELS[s.cycle]) || s.author,
  }));
  return (
    <div className="mx-auto max-w-[1320px] px-4 md:px-8">
      <PageHead
        kicker="Buscador documental"
        title="Pregunta a los documentos"
        lede="El buscador recupera propuestas verificadas y pasajes literales de los programas, votaciones y definiciones. No redacta respuestas ni resume: lo que ves está en el documento citado. La búsqueda se hace en tu navegador."
      />
      <Suspense fallback={<p className="text-ink-3">Cargando…</p>}>
        <SearchResults parties={parties} sources={sources} />
      </Suspense>
    </div>
  );
}
