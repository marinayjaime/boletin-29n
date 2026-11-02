import { Suspense } from "react";
import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { getIndicators } from "@/lib/data";
import { PageHead } from "@/components/page-head";
import { Observatory } from "@/components/observatory";

export const metadata: Metadata = {
  title: "Observatorio de España",
  description: "Series oficiales de economía, trabajo, vivienda, pensiones, sanidad, educación y sociedad, con comparación europea y por comunidades.",
};

export default function Page() {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", f), "utf8"));
  const indicators = getIndicators().filter((i) => !i.hidden);
  return (
    <div className="mx-auto max-w-[1320px] px-4 md:px-8">
      <PageHead
        kicker="Prioridad 3 · Observatorio"
        title="España, en series oficiales"
        lede={`${indicators.length} indicadores de Eurostat con unidad, periodo y fuente. Compara con otros países y comunidades, cambia el periodo, pasa a cifras relativas o reales y descarga los datos.`}
      />
      <Suspense fallback={<p className="text-ink-3">Cargando…</p>}>
        <Observatory indicators={indicators} events={read("events.json")} pending={read("pending-indicators.json")} />
      </Suspense>
    </div>
  );
}
