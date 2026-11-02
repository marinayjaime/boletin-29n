import type { Metadata } from "next";
import { getGovernment, getOrganization, getParties } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { PageHero } from "@/components/ui";
import { WhoDoesWhat } from "@/components/who-does-what";

export const metadata: Metadata = { title: "¿Quién hace qué?", description: "Instituciones del Estado, composición del Gobierno y organización de los partidos." };

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Organigrama" title="¿Quién hace qué en España?" sub="Pulsa una institución, una persona o un órgano para descubrir qué hace." tone="ink" />
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <WhoDoesWhat org={getOrganization()} government={getGovernment()} parties={alphabetical(getParties())} />
      </div>
    </>
  );
}
