import Link from "next/link";
import { getCycle, getIndicators, getParties, getProposals, getSeries, getVotes, getQuiz, lastDataUpdate } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { Countdown } from "@/components/countdown";
import { PartyMark } from "@/components/party-mark";
import { Sparkline } from "@/components/sparkline";
import { formatDate, formatNumber, formatPeriod } from "@/lib/format";
import { SearchBox } from "@/components/search-box";

const HEADLINE_INDICATORS = ["inflacion", "paro", "salario-medio", "precio-vivienda", "gasto-vejez", "deuda-pib"];

export default function Home() {
  const cycle = getCycle();
  const parties = alphabetical(getParties());
  const proposals = getProposals();
  const votes = getVotes();
  const updated = lastDataUpdate();
  const inds = getIndicators();
  const tiles = HEADLINE_INDICATORS.map((id) => {
    const ind = inds.find((i) => i.id === id)!;
    const s = getSeries(id);
    const es = (s?.observations ?? []).filter((o) => o.geo === "ES");
    const last = es.at(-1);
    return { ind, last, values: es.slice(-24).map((o) => o.value), fetchedAt: s?.fetchedAt };
  });
  const dissolution = votes.votes.filter((v) => v.date === "2026-10-02");

  const doors = [
    { href: "/comparador", n: "01", title: "Comparar partidos", text: "De dos a cinco formaciones, tema a tema, con la cita original de cada propuesta." },
    { href: "/test", n: "02", title: "Test a ciegas", text: `${getQuiz().length} afirmaciones sin saber quién las defiende. Al final, las posturas documentadas.` },
    { href: "/observatorio", n: "03", title: "Datos de España", text: "Inflación, empleo, vivienda, pensiones y más, con series oficiales y comparación europea." },
    { href: "/votaciones", n: "04", title: "Votaciones del Congreso", text: `${votes.votes.length.toLocaleString("es-ES")} votaciones de la XV Legislatura, con el voto de cada diputado.` },
    { href: "/promesas", n: "05", title: "Promesas y hechos", text: "Compromisos anteriores contrastados con decisiones oficiales y un criterio explícito." },
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-rule">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-4 pb-14 pt-10 md:grid-cols-12 md:px-8 md:pb-20 md:pt-16">
          <div className="md:col-span-8">
            <p className="kicker rise">Elecciones generales · 29 de noviembre de 2026</p>
            <h1 className="display rise mt-4 text-[3.3rem] font-medium leading-[0.92] sm:text-[4.8rem] lg:text-[7.2rem]" style={{ animationDelay: "60ms" }}>
              Tu voto.
              <br />
              <span className="italic text-ink-2" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1' }}>
                Tus preguntas.
              </span>
              <br />
              Los datos.
            </h1>
            <p className="rise mt-6 max-w-xl text-lg leading-relaxed text-ink-2 md:text-xl" style={{ animationDelay: "140ms" }}>
              Compara propuestas, consulta decisiones reales y entiende los principales indicadores de España antes de las elecciones.
            </p>
            <div className="rise mt-8 max-w-2xl" style={{ animationDelay: "200ms" }}>
              <SearchBox placeholder="¿Qué propone cada partido para facilitar la compra de una vivienda?" />
              <p className="mt-2 text-xs text-ink-3">
                Busca en {proposals.length} propuestas verificadas y en el texto completo de los programas indexados. Solo devuelve pasajes reales, con su página.
              </p>
            </div>
          </div>
          <aside className="flex flex-col justify-between gap-8 md:col-span-4 md:border-l md:border-rule md:pl-8">
            <Countdown date={cycle.electionDate} />
            <div className="space-y-3 text-sm">
              <div className="hairline" />
              <p>
                <span className="kicker block">Convocatoria</span>
                <a href={cycle.decree.url} className="link" target="_blank" rel="noreferrer">
                  Real Decreto 806/2026
                </a>{" "}
                · BOE {formatDate(cycle.decree.published)}
              </p>
              <p>
                <span className="kicker block">Campaña</span>
                Del 13 al 27 de noviembre · {cycle.seats} escaños
              </p>
              <p>
                <span className="kicker block">Datos actualizados</span>
                <span className="font-mono">{formatDate(updated)}</span>
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* PUERTAS */}
      <nav aria-label="Qué puedes hacer" className="border-b border-rule">
        <ul className="mx-auto grid max-w-[1320px] md:grid-cols-5">
          {doors.map((d, i) => (
            <li key={d.href} className="border-b border-rule md:border-b-0 md:border-r last:border-r-0">
              <Link href={d.href} className="group flex h-full flex-col gap-3 px-4 py-6 transition-colors hover:bg-paper-2 md:px-6 md:py-8 rise" style={{ animationDelay: `${240 + i * 50}ms` }}>
                <span className="font-mono text-xs text-accent">{d.n}</span>
                <span className="display text-2xl leading-tight">{d.title}</span>
                <span className="text-sm leading-relaxed text-ink-2">{d.text}</span>
                <span className="mt-auto text-sm text-ink transition-transform group-hover:translate-x-1" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* PARTIDOS */}
      <section className="mx-auto max-w-[1320px] px-4 py-16 md:px-8" aria-labelledby="partidos">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker">Las cinco candidaturas de esta primera versión</p>
            <h2 id="partidos" className="display mt-2 text-4xl md:text-5xl">
              Mismo espacio, mismo trato
            </h2>
          </div>
          <p className="max-w-md text-sm text-ink-2">
            Orden alfabético. Sin logotipos ni colores corporativos. Hay más candidaturas, incluidas las territoriales, que{" "}
            <a className="link" href="https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-22607" target="_blank" rel="noreferrer">
              figuran en el BOE
            </a>{" "}
            y no se analizan aquí.
          </p>
        </div>
        <ul className="mt-8 grid gap-px overflow-hidden rounded border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-5">
          {parties.map((p) => {
            const n = proposals.filter((x) => x.partyId === p.id).length;
            return (
              <li key={p.id} className="bg-paper">
                <Link href={`/partidos/${p.id}`} className="group flex h-full flex-col gap-4 p-5 transition-colors hover:bg-paper-2">
                  <PartyMark monogram={p.monogram} size={52} />
                  <div>
                    <p className="display text-2xl leading-tight">{p.shortName}</p>
                    <p className="text-sm text-ink-3">{p.kind === "coalicion" ? "Coalición electoral" : "Partido político"}</p>
                  </div>
                  <dl className="mt-auto space-y-1 text-sm">
                    <dt className="kicker">Cabeza de lista por Madrid (BOE)</dt>
                    <dd>{p.madridListHead}</dd>
                    <dt className="kicker pt-2">Propuestas indexadas</dt>
                    <dd className="font-mono">{n}</dd>
                  </dl>
                  <span className="text-xs text-ink-3">Programa 2026 pendiente de publicación</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* DATOS */}
      <section className="border-y border-rule bg-paper-2" aria-labelledby="datos">
        <div className="mx-auto max-w-[1320px] px-4 py-16 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker">Situación real · datos oficiales</p>
              <h2 id="datos" className="display mt-2 text-4xl md:text-5xl">
                España en seis cifras
              </h2>
            </div>
            <Link href="/observatorio" className="link text-sm">
              Abrir el Observatorio →
            </Link>
          </div>
          <ul className="mt-8 grid gap-px overflow-hidden rounded border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {tiles.map(({ ind, last, values }) => (
              <li key={ind.id} className="bg-paper">
                <Link href={`/observatorio?i=${ind.id}`} className="flex h-full flex-col gap-3 p-5 hover:bg-paper-3/40">
                  <p className="kicker">{ind.short}</p>
                  <p className="display tabular text-5xl font-light leading-none">
                    {last ? formatNumber(last.value, ind.decimals) : "—"}
                    <span className="ml-1 font-sans text-base text-ink-2">{ind.unitShort}</span>
                  </p>
                  <div className="h-10">
                    <Sparkline values={values} />
                  </div>
                  <p className="text-xs text-ink-3">
                    {ind.unit} · {last ? formatPeriod(last.period) : ""} · {ind.provider} ({ind.dataset})
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">
            Datos de Eurostat descargados en la fecha indicada en cada gráfico. Una variación no implica por sí sola que se deba a un Gobierno concreto.
          </p>
        </div>
      </section>

      {/* ÚLTIMA DECISIÓN */}
      {dissolution.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-4 py-16 md:px-8" aria-labelledby="ultima">
          <p className="kicker">Decisión parlamentaria · 2 de octubre de 2026</p>
          <h2 id="ultima" className="display mt-2 max-w-3xl text-4xl md:text-5xl">
            Las últimas votaciones de la legislatura
          </h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {dissolution.map((v) => {
              const total = v.totals.si + v.totals.no + v.totals.abst || 1;
              return (
                <li key={v.id} className="border-t-2 border-ink pt-4">
                  <p className="text-sm text-ink-3">Convalidación o derogación de real decreto-ley · votación pública por llamamiento</p>
                  <Link href={`/votaciones/${v.id}`} className="mt-2 block text-lg leading-snug hover:underline">
                    {v.title}
                  </Link>
                  <div className="mt-4 flex h-3 overflow-hidden rounded-sm" aria-hidden>
                    <span style={{ width: `${(v.totals.si / total) * 100}%`, background: "var(--yes)" }} />
                    <span style={{ width: `${(v.totals.no / total) * 100}%`, background: "var(--no)" }} />
                    <span style={{ width: `${(v.totals.abst / total) * 100}%`, background: "var(--abs)" }} />
                  </div>
                  <p className="mt-2 font-mono text-sm">
                    Sí {v.totals.si} · No {v.totals.no} · Abst. {v.totals.abst} — <strong>{v.result === "rechazada" ? "Derogado" : "Convalidado"}</strong>
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 max-w-2xl text-sm text-ink-2">
            Al no convalidarse, ambos decretos-leyes quedaron derogados. El 6 de octubre el BOE publicó el Real Decreto 806/2026 de disolución de las
            Cortes. Aquí solo se muestran los resultados oficiales, sin atribuir causas.
          </p>
        </section>
      )}

      {/* CÓMO LEER */}
      <section className="mx-auto max-w-[1320px] px-4 pb-8 md:px-8" aria-labelledby="leer">
        <div className="double-rule pt-8">
          <h2 id="leer" className="display text-3xl">
            Cuatro tipos de información, siempre separados
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Situación real", "Estadísticas oficiales con unidad, periodo y fuente."],
              ["Decisiones históricas", "Leyes, decretos y votaciones registradas en el Congreso y el BOE."],
              ["Propuestas", "Lo que plantea cada partido, con cita literal, documento y página."],
              ["Estimaciones", "Escenarios hipotéticos. Esta versión no incluye ninguno: no se publican cálculos sin una metodología completa."],
            ].map(([t, d], i) => (
              <li key={t}>
                <p className="font-mono text-xs text-accent">0{i + 1}</p>
                <p className="mt-1 text-lg font-semibold">{t}</p>
                <p className="mt-1 text-sm text-ink-2">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
