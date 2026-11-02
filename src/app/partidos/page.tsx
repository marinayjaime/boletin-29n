import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getCoalitions, getParties, getProposals, sourceById } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { partyVars } from "@/lib/party-theme";
import { Disclosure, PageHero, PartyAvatar } from "@/components/ui";

export const metadata: Metadata = { title: "Partidos" };

export default function Page() {
  const parties = alphabetical(getParties());
  const proposals = getProposals();
  const fa = getCoalitions()[0];
  return (
    <>
      <PageHero eyebrow="Partidos" title="Cinco candidaturas" sub="Misma estructura y mismo espacio para todas. Orden alfabético." />
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {parties.map((p) => {
            const v = partyVars(p.id);
            return (
              <li key={p.id}>
                <Link href={`/partidos/${p.id}`} className="lift flex h-full flex-col items-center rounded-[26px] p-6 text-center" style={{ background: v.primary, color: v.on }}>
                  <PartyAvatar party={p} size={120} ring={4} />
                  <p className="display mt-4 text-3xl">{p.shortName}</p>
                  <p className="mt-1 text-sm font-bold">{p.representative.name}</p>
                  <p className="mt-4 text-sm font-extrabold">
                    <span className="num text-2xl">{proposals.filter((x) => x.partyId === p.id).length}</span> propuestas
                  </p>
                  <span className="mt-4 grid h-10 w-10 place-items-center rounded-full bg-black/15">
                    <ArrowRight size={18} aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <section className="card mt-10 max-w-3xl p-6" aria-labelledby="fa">
          <h2 id="fa" className="display text-3xl">
            Frente Amplio, Sumar y Podemos
          </h2>
          <p className="mt-3 font-semibold text-ink-2">{fa.explanation}</p>
          <Disclosure summary="Formaciones de Frente Amplio" className="mt-4">
            <ul className="space-y-1">
              {fa.members.map((m) => (
                <li key={m.name}>
                  <strong className="text-ink">{m.name}</strong> — {m.note}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              Fuentes: {fa.sources.map((s) => sourceById(s)?.title).join(" · ")}. Verificación {fa.verification}.
            </p>
          </Disclosure>
        </section>
      </div>
    </>
  );
}
