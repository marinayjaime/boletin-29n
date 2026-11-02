import Link from "next/link";
import type { Metadata } from "next";
import { getParties, getProposals, getCoalitions, sourceById } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { PageHead } from "@/components/page-head";
import { PartyMark } from "@/components/party-mark";

export const metadata: Metadata = { title: "Partidos" };

export default function Page() {
  const parties = alphabetical(getParties());
  const proposals = getProposals();
  const fa = getCoalitions()[0];
  return (
    <div className="mx-auto max-w-[1320px] px-4 md:px-8">
      <PageHead kicker="Fichas de las candidaturas" title="Cinco candidaturas, misma estructura" lede="Cada ficha sigue el mismo esquema y se apoya en documentos oficiales. No se reproducen eslóganes ni descripciones ideológicas sin atribuir." />
      <ul className="grid gap-px overflow-hidden rounded border border-rule bg-rule md:grid-cols-5">
        {parties.map((p) => (
          <li key={p.id} className="bg-paper">
            <Link href={`/partidos/${p.id}`} className="flex h-full flex-col gap-3 p-6 hover:bg-paper-2">
              <PartyMark monogram={p.monogram} size={56} />
              <p className="display text-2xl">{p.officialName}</p>
              <p className="font-mono text-xs text-ink-3">{p.acronym}</p>
              <p className="mt-auto text-sm text-ink-2">{proposals.filter((x) => x.partyId === p.id).length} propuestas documentadas</p>
            </Link>
          </li>
        ))}
      </ul>
      <section className="mt-12 max-w-3xl" aria-labelledby="fa">
        <h2 id="fa" className="display text-3xl">
          Frente Amplio, Sumar y Podemos
        </h2>
        <p className="mt-3 leading-relaxed text-ink-2">{fa.explanation}</p>
        <ul className="mt-4 space-y-1 text-sm">
          {fa.members.map((m) => (
            <li key={m.name}>
              <strong>{m.name}</strong> — <span className="text-ink-2">{m.note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-3">
          Fuentes: {fa.sources.map((s) => sourceById(s)?.title).join(" · ")}. Estado: verificación {fa.verification}.
        </p>
      </section>
    </div>
  );
}
