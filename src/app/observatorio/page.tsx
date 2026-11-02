import { Suspense } from "react";
import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { getIndicators, getSeries } from "@/lib/data";
import { PageHero } from "@/components/ui";
import { Observatory, type Kpi } from "@/components/observatory";

export const metadata: Metadata = { title: "Datos de España", description: "Series oficiales de economía, trabajo, vivienda, pensiones, sanidad, educación y sociedad, con comparación europea y por comunidades." };

export default function Page() {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", f), "utf8"));
  const indicators = getIndicators().filter((i) => !i.hidden);
  const kpis: Record<string, Kpi> = {};
  for (const i of indicators) {
    const es = (getSeries(i.id)?.observations ?? []).filter((o) => o.geo === i.geos[0]);
    const last = es.at(-1);
    if (last) kpis[i.id] = { value: last.value, period: last.period, spark: es.slice(-20).map((o) => o.value) };
  }
  return (
    <>
      <PageHero eyebrow="Observatorio" title="España, en datos" sub={`${indicators.length} indicadores oficiales. Elige uno y juega con el periodo, los países y las comunidades.`} />
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <Suspense fallback={<p className="font-bold text-ink-3">Cargando…</p>}>
          <Observatory indicators={indicators} events={read("events.json")} pending={read("pending-indicators.json")} kpis={kpis} />
        </Suspense>
      </div>
    </>
  );
}
