import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVotes, getTopics } from "@/lib/data";
import { VOTE_TYPE_LABELS } from "@/lib/votes-classify";
import { Hemicycle } from "@/components/hemicycle";
import { formatDate } from "@/lib/format";
import { GROUP_LABELS } from "@/lib/groups";

export function generateStaticParams() {
  return getVotes().votes.map((v) => ({ id: v.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const v = getVotes().votes.find((x) => x.id === id);
  return { title: v ? `Votación: ${(v.title || v.section).slice(0, 80)}` : "Votación" };
}

const RESULT: Record<string, string> = { aprobada: "Aprobada", rechazada: "Rechazada", empate: "Empate", asentimiento: "Aprobada por asentimiento", indeterminado: "Resultado no determinable" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = getVotes().votes;
  const v = all.find((x) => x.id === id);
  if (!v) notFound();
  const t = VOTE_TYPE_LABELS[v.type];
  const topics = getTopics().filter((x) => v.topicIds.includes(x.id));
  const related = v.expediente ? all.filter((x) => x.expediente === v.expediente && x.id !== v.id) : [];
  const [y, m, d] = v.date.split("-");
  const dayUrl = `https://www.congreso.es/es/opendata/votaciones?p_p_id=votaciones&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&targetLegislatura=XV&targetDate=${d}/${m}/${y}`;
  const initUrl = v.expediente
    ? `https://www.congreso.es/busqueda-de-iniciativas?p_p_id=iniciativas&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_iniciativas_mode=mostrarDetalle&_iniciativas_legislatura=XV&_iniciativas_id=${encodeURIComponent(v.expediente)}`
    : null;

  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-8">
      <nav aria-label="Ruta" className="pt-8 text-sm">
        <Link href="/votaciones" className="link">
          ← Votaciones
        </Link>
      </nav>
      <header className="pb-8 pt-6">
        <div className="flex flex-wrap gap-2">
          <span className="tag !bg-ink !text-bg" title={t.help}>
            {t.label}
          </span>
          {v.rollCall && <span className="cite-chip">Pública por llamamiento</span>}
          {v.absoluteMajority && <span className="cite-chip">Exige mayoría absoluta (176)</span>}
          {topics.map((x) => (
            <span key={x.id} className="cite-chip text-ink-3">
              Tema (orientativo): {x.short}
            </span>
          ))}
        </div>
        <h1 className="display mt-4 text-[2.2rem] md:text-6xl">{v.title || v.section}</h1>
        {v.subgroupText && <p className="mt-3 text-lg text-ink-2">{[v.subgroup, v.subgroupText].filter((s, i, a) => s && a.indexOf(s) === i).join(" — ")}</p>}
        <p className="mt-3 text-sm text-ink-3">{t.help}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Resumen">
        {[
          ["Resultado", RESULT[v.result]],
          ["Fecha", formatDate(v.date)],
          ["A favor", String(v.totals.si)],
          ["En contra", String(v.totals.no)],
          ["Abstenciones", String(v.totals.abst)],
          ["No votan", v.rollCall ? "n. d." : String(v.totals.noVota)],
        ].map(([k, val]) => (
          <div key={k} className="card p-4" style={k === "Resultado" ? { background: v.result === "rechazada" ? "var(--no)" : v.result === "aprobada" || v.result === "asentimiento" ? "var(--yes)" : undefined, color: v.result === "rechazada" || v.result === "aprobada" || v.result === "asentimiento" ? "#fff" : undefined } : undefined}>
            <p className="text-xs font-extrabold uppercase tracking-wider">{k}</p>
            <p className="num mt-1 text-3xl">{val}</p>
          </div>
        ))}
      </section>

      <dl className="mt-6 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-ink-3">Expediente</dt>
        <dd className="font-mono">{v.expediente ?? "no indicado en la página del día"}</dd>
        <dt className="text-ink-3">Fase / epígrafe</dt>
        <dd>{v.section}</dd>
        <dt className="text-ink-3">Sesión · votación</dt>
        <dd className="font-mono">
          XV Legislatura · sesión {v.session} · n.º {v.number}
        </dd>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={dayUrl} target="_blank" rel="noreferrer" className="btn btn-primary min-h-[42px] text-sm">
          Votaciones del día en el Congreso ↗
        </a>
        {initUrl && (
          <a href={initUrl} target="_blank" rel="noreferrer" className="btn btn-ghost min-h-[42px] text-sm">
            Ficha de la iniciativa ↗
          </a>
        )}
        {v.detailUrl && (
          <a href={v.detailUrl} target="_blank" rel="noreferrer" className="btn btn-ghost min-h-[42px] text-sm">
            Diario de Sesiones ↗
          </a>
        )}
        <a href={v.sourceZip} className="btn btn-ghost min-h-[42px] text-sm">
          Datos abiertos (ZIP) ↓
        </a>
      </div>

      <section className="mt-12" aria-labelledby="hemi">
        <h2 id="hemi" className="display text-4xl md:text-5xl">
          El hemiciclo
        </h2>
        <div className="mt-4">
          {v.hasDeputyDetail ? (
            <Hemicycle session={v.session} number={v.number} title={v.title || v.section} />
          ) : (
            <div className="hatch rounded border border-rule p-6 text-sm">
              <p className="font-medium">Sin voto nominal en datos abiertos</p>
              <p className="mt-1 text-ink-2">
                {v.rollCall
                  ? "Fue una votación pública por llamamiento: el Congreso publica sus totales, pero el voto de cada diputado solo consta en el Diario de Sesiones."
                  : "El fichero oficial de esta votación no incluye el voto de cada diputado."}
              </p>
            </div>
          )}
        </div>
        {!v.hasDeputyDetail && v.groups.length > 0 && (
          <ul className="mt-4 text-sm">
            {v.groups.map((g) => (
              <li key={g.group}>
                {GROUP_LABELS[g.group] ?? g.group}: {g.si} sí, {g.no} no, {g.abst} abst.
              </li>
            ))}
          </ul>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="rel">
          <h2 id="rel" className="kicker mb-3">
            Otras votaciones del mismo expediente ({v.expediente})
          </h2>
          <ul className="divide-y divide-rule border-y border-rule text-sm">
            {related.slice(0, 30).map((r) => (
              <li key={r.id} className="py-2">
                <Link href={`/votaciones/${r.id}`} className="hover:underline">
                  {formatDate(r.date)} · {VOTE_TYPE_LABELS[r.type].label} · {r.subgroupText ?? r.title.slice(0, 80)} — <strong>{RESULT[r.result]}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
