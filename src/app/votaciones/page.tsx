import { Suspense } from "react";
import type { Metadata } from "next";
import { getTopics, getVotes } from "@/lib/data";
import { PageHero } from "@/components/ui";
import { VotesList } from "@/components/votes-list";
import { VOTE_TYPE_LABELS } from "@/lib/votes-classify";
import { PARTY_GROUP_NOTE } from "@/lib/groups";
import { formatDate } from "@/lib/format";
import { DataStatus } from "@/components/data-status";

export const metadata: Metadata = { title: "Votaciones del Congreso", description: "Todas las votaciones del Pleno de la XV Legislatura con el voto de cada diputado." };

export default function Page() {
  const { importedAt, votes } = getVotes();
  return (
    <>
      <PageHero eyebrow="Congreso · XV Legislatura" title="Lo que se votó" sub={`${votes.length.toLocaleString("es-ES")} votaciones del Pleno con el voto de cada diputado. Importado el ${importedAt ? formatDate(importedAt) : "—"}.`} />

      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <DataStatus datasets={["congreso"]} editorial={[]} />
      <details className="card mb-8 p-5 text-sm">
        <summary className="cursor-pointer font-medium">Cómo leer las votaciones y su relación con los cinco partidos</summary>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <dl className="space-y-2">
            {Object.values(VOTE_TYPE_LABELS).map((t) => (
              <div key={t.label}>
                <dt className="font-medium">{t.label}</dt>
                <dd className="text-ink-2">{t.help}</dd>
              </div>
            ))}
          </dl>
          <div className="space-y-3">
            <p className="text-ink-2">
              El resultado se calcula con los totales oficiales: mayoría simple, salvo en las votaciones de carácter orgánico, que exigen 176 votos a favor.
              Las votaciones públicas por llamamiento (como las investiduras) no tienen voto nominal en formato abierto: se muestran sus totales y el
              enlace al Diario de Sesiones.
            </p>
            <ul className="space-y-2">
              {Object.entries(PARTY_GROUP_NOTE).map(([k, v]) => (
                <li key={k}>
                  <strong className="uppercase">{k.replace("-", " ")}</strong>: <span className="text-ink-2">{v.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>

      <Suspense fallback={<p className="text-ink-3">Cargando…</p>}>
        <VotesList topics={getTopics().map((t) => ({ id: t.id, short: t.short }))} />
      </Suspense>
      </div>
    </>
  );
}
