import { Suspense } from "react";
import type { Metadata } from "next";
import { getTopics, getVotes } from "@/lib/data";
import { PageHead } from "@/components/page-head";
import { VotesList } from "@/components/votes-list";
import { VOTE_TYPE_LABELS } from "@/lib/votes-classify";
import { PARTY_GROUP_NOTE } from "@/lib/groups";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Votaciones del Congreso", description: "Todas las votaciones del Pleno de la XV Legislatura con el voto de cada diputado." };

export default function Page() {
  const { importedAt, votes } = getVotes();
  return (
    <div className="mx-auto max-w-[1320px] px-4 md:px-8">
      <PageHead
        kicker="Prioridad 4 · Votaciones"
        title="Lo que se votó en el Congreso"
        lede={`${votes.length.toLocaleString("es-ES")} votaciones del Pleno de la XV Legislatura (2023–2026), importadas de los datos abiertos del Congreso. Cada una indica su tipo de procedimiento: no es lo mismo aprobar una ley que una proposición no de ley.`}
      >
        <p className="mt-3 font-mono text-xs text-ink-3">Importado el {importedAt ? formatDate(importedAt) : "—"} · fuente: congreso.es/es/opendata/votaciones</p>
      </PageHead>

      <details className="mb-8 rounded border border-rule p-4 text-sm">
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
  );
}
