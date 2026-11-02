import Link from "next/link";
import { ArrowRight, Columns3, Compass, Link2, ListChecks, Network, PieChart } from "lucide-react";
import { getCycle, getIndicators, getParties, getPolls, getPromises, getProposals, getSeries, getVotes } from "@/lib/data";
import { alphabetical } from "@/lib/compare";
import { Countdown } from "@/components/countdown";
import { SearchBox } from "@/components/search-box";
import { PartyAvatar, STATUS_STYLE, TopicIcon } from "@/components/ui";
import { SeatChart } from "@/components/seat-chart";
import { CountUp, DrawSpark } from "@/components/anim";
import { POLL_PARTY, partyVars, type PollKey } from "@/lib/party-theme";
import { pointSeats } from "@/lib/seats";
import { formatDate, formatPeriod } from "@/lib/format";

const HEADLINE = [
  { id: "inflacion", color: "var(--c3)" },
  { id: "paro", color: "var(--c2)" },
  { id: "precio-vivienda", color: "var(--c5)" },
  { id: "salario-medio", color: "var(--c6)" },
  { id: "deuda-pib", color: "var(--c4)" },
  { id: "gasto-vejez", color: "var(--c2)" },
];

export default function Home() {
  const cycle = getCycle();
  const parties = alphabetical(getParties());
  const proposals = getProposals();
  const votes = getVotes().votes;
  const polls = getPolls();
  const latest = [...polls.polls].sort((a, b) => b.published.localeCompare(a.published)).find((p) => p.type === "puntual")!;
  const seats = pointSeats(latest.seats)!;
  const blocks = Object.entries(seats)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ key: k, name: POLL_PARTY[k as PollKey]?.name ?? k, color: POLL_PARTY[k as PollKey]?.color ?? "#999", seats: v }));
  const inds = getIndicators();
  const tiles = HEADLINE.map(({ id, color }) => {
    const ind = inds.find((i) => i.id === id)!;
    const es = (getSeries(id)?.observations ?? []).filter((o) => o.geo === "ES");
    return { ind, color, last: es.at(-1), values: es.slice(-24).map((o) => o.value) };
  });
  const promises = getPromises().filter((p) => p.series === "psoe-2023-legislativas");
  const byStatus = (s: string) => promises.filter((p) => p.assessment.status === s).length;
  const lastVotes = votes.filter((v) => v.date === "2026-10-02");

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink text-bg">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand/10 blur-3xl" aria-hidden />
        <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-4 pb-12 pt-10 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-20 lg:pt-16">
          <div>
            <Countdown date={cycle.electionDate} compact />
            <h1 className="display rise mt-6 text-[3.6rem] sm:text-[5.4rem] lg:text-[6.6rem]">
              Compara.
              <br />
              <span className="text-brand">Explora.</span>
              <br />
              Descubre.
            </h1>
            <p className="rise mt-5 max-w-md text-lg font-semibold opacity-80" style={{ animationDelay: "100ms" }}>
              Propuestas con su fuente, votaciones reales y datos de España. Tú sacas las conclusiones.
            </p>
            <div className="rise mt-7 flex flex-wrap gap-3" style={{ animationDelay: "160ms" }}>
              <Link href="/test" className="btn btn-brand">
                <ListChecks size={18} aria-hidden /> Hacer el test
              </Link>
              <Link href="/comparador" className="btn bg-white/10 text-bg hover:bg-white/20">
                <Columns3 size={18} aria-hidden /> Comparar partidos
              </Link>
            </div>
            <div className="rise mt-8 max-w-xl" style={{ animationDelay: "220ms" }}>
              <SearchBox placeholder="¿Qué propone cada partido sobre vivienda?" dark />
            </div>
          </div>

          <div className="rise rounded-[28px] bg-white/[.04] p-4 md:p-6" style={{ animationDelay: "200ms" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold uppercase tracking-wider text-brand">Encuesta más reciente</p>
              <Link href="/pactos" className="text-sm font-bold underline decoration-brand decoration-2 underline-offset-4">
                Simular pactos →
              </Link>
            </div>
            <div className="text-ink [&_text]:fill-[var(--bg)] [&_line]:stroke-[var(--bg)]">
              <SeatChart blocks={blocks} height={270} center={<p className="num text-5xl text-bg">350</p>} />
            </div>
            <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm font-bold">
              {blocks.slice(0, 6).map((b) => (
                <li key={b.key} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} aria-hidden />
                  {b.name} <span className="opacity-60">{b.seats}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-center text-xs font-semibold opacity-60">
              {latest.firm} para {latest.media} · publicado el {formatDate(latest.published)} ·{" "}
              <a href={latest.url} className="underline" target="_blank" rel="noreferrer">
                fuente
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* PARTIDOS */}
      <section className="mx-auto max-w-[1320px] px-4 pt-14 md:px-8" aria-labelledby="partidos">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 id="partidos" className="display text-[2.4rem] md:text-6xl">
            Cinco candidaturas
          </h2>
          <p className="max-w-xs text-sm font-semibold text-ink-3">Orden alfabético · mismo tamaño para todas · hay más candidaturas en el BOE</p>
        </div>
        <ul className="lane -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
          {parties.map((p, i) => {
            const v = partyVars(p.id);
            const n = proposals.filter((x) => x.partyId === p.id).length;
            return (
              <li key={p.id} className="w-[72vw] shrink-0 sm:w-[46vw] md:w-auto">
                <Link
                  href={`/partidos/${p.id}`}
                  className="lift rise group relative flex h-full flex-col overflow-hidden rounded-[26px]"
                  style={{ background: v.primary, color: v.on, animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between p-5 pb-0">
                    <span className="display text-3xl">{p.shortName}</span>
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-black/15 transition-transform group-hover:translate-x-1">
                      <ArrowRight size={18} aria-hidden />
                    </span>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <PartyAvatar party={p} size={132} ring={4} />
                  </div>
                  <div className="mt-auto space-y-1 p-5">
                    <p className="font-extrabold leading-tight">{p.representative.name}</p>
                    <p className="text-sm font-semibold opacity-80">Cabeza de lista por Madrid</p>
                    <p className="pt-2 text-sm font-bold">
                      <span className="num text-2xl">{n}</span> propuestas documentadas
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-1 text-xs font-semibold text-ink-3">Fotos: Wikimedia Commons (licencias libres, autor en cada ficha). Colores identificativos de cada formación; no implican valoración.</p>
      </section>

      {/* BENTO */}
      <section className="mx-auto max-w-[1320px] px-4 pt-14 md:px-8" aria-label="Herramientas">
        <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
          <Link href="/test" className="lift group relative overflow-hidden rounded-[28px] bg-brand p-7 text-brand-ink col-span-3 md:col-span-3 md:col-start-1 md:row-span-2 md:row-start-1">
            <ListChecks size={34} aria-hidden />
            <p className="display mt-6 text-5xl md:text-6xl">
              Test
              <br />a ciegas
            </p>
            <p className="mt-3 max-w-xs text-lg font-bold">28 preguntas sin etiquetas. Después ves quién dijo qué, tema a tema.</p>
            <span className="btn btn-primary mt-6">
              Empezar <ArrowRight size={18} aria-hidden />
            </span>
            <div className="pointer-events-none absolute -bottom-10 -right-6 flex gap-2 opacity-90" aria-hidden>
              {parties.map((p, i) => (
                <span key={p.id} className="h-28 w-10 rounded-full transition-transform duration-500 group-hover:-translate-y-4" style={{ background: partyVars(p.id).primary, transitionDelay: `${i * 50}ms` }} />
              ))}
            </div>
          </Link>
          <Link href="/pactos" className="lift card group col-span-3 p-6 md:col-span-3 md:col-start-4 md:row-start-1">
            <div className="flex items-center justify-between">
              <PieChart size={28} aria-hidden />
              <span className="tag">{polls.polls.length} encuestas</span>
            </div>
            <p className="display mt-4 text-4xl">Pactos y mayorías</p>
            <p className="mt-1 font-semibold text-ink-2">Reparte los 350 escaños y prueba alianzas. ¿Llegan a 176?</p>
          </Link>
          <Link href="/puntos-en-comun" className="lift card p-6 md:col-span-1 md:col-start-4 md:row-start-2">
            <Link2 size={26} aria-hidden />
            <p className="display mt-4 text-2xl leading-none">Puntos en común</p>
          </Link>
          <Link href="/quien-hace-que" className="lift card p-6 md:col-span-1 md:col-start-5 md:row-start-2">
            <Network size={26} aria-hidden />
            <p className="display mt-4 text-2xl leading-none">¿Quién hace qué?</p>
          </Link>
          <Link href="/promesas" className="lift card p-6 md:col-span-1 md:col-start-6 md:row-start-2">
            <Compass size={26} aria-hidden />
            <p className="display mt-4 text-2xl leading-none">Promesas 2023</p>
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full" aria-label={`${byStatus("cumplido")} cumplidas, ${byStatus("no_cumplido")} no cumplidas, ${byStatus("no_verificable")} no verificables`} role="img">
              {(["cumplido", "no_cumplido", "no_verificable"] as const).map((s) => (
                <span key={s} style={{ flex: byStatus(s), background: STATUS_STYLE[s].color }} />
              ))}
            </div>
          </Link>
        </div>
      </section>

      {/* DATOS */}
      <section className="mx-auto max-w-[1320px] px-4 pt-14 md:px-8" aria-labelledby="datos">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 id="datos" className="display text-[2.4rem] md:text-6xl">
            España en datos
          </h2>
          <Link href="/observatorio" className="btn btn-ghost">
            Abrir el observatorio <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
          {tiles.map(({ ind, last, values, color }) => (
            <li key={ind.id}>
              <Link href={`/observatorio?i=${ind.id}`} className="lift card flex h-full flex-col p-4 md:p-5">
                <p className="text-sm font-extrabold text-ink-2">{ind.short}</p>
                <p className="mt-2 flex items-baseline gap-1.5">
                  {last ? <CountUp value={last.value} decimals={ind.decimals} className="num text-[2.3rem] md:text-[3.4rem]" /> : "—"}
                  <span className="text-sm font-extrabold text-ink-3 md:text-lg">{ind.unitShort}</span>
                </p>
                <div className="mt-3 h-14">
                  <DrawSpark values={values} color={color} />
                </div>
                <p className="mt-3 text-xs font-semibold text-ink-3">
                  {last ? formatPeriod(last.period) : ""} · {ind.provider}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ÚLTIMAS VOTACIONES */}
      {lastVotes.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-4 pt-14 md:px-8" aria-labelledby="ultima">
          <h2 id="ultima" className="display mb-6 text-[2.4rem] md:text-6xl">
            Lo último en el Congreso
          </h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {lastVotes.map((v) => {
              const total = v.totals.si + v.totals.no + v.totals.abst || 1;
              return (
                <li key={v.id}>
                  <Link href={`/votaciones/${v.id}`} className="lift card block p-6">
                    <div className="flex items-center justify-between gap-2">
                      <span className="tag">
                        <TopicIcon id="vivienda" size={14} /> Decreto-ley · {formatDate(v.date)}
                      </span>
                      <span className="rounded-full px-3 py-1 text-sm font-extrabold text-white" style={{ background: v.result === "rechazada" ? "var(--no)" : "var(--yes)" }}>
                        {v.result === "rechazada" ? "Derogado" : "Convalidado"}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-lg font-bold leading-snug">{v.title.replace(/, por el que.*$/, "")}</p>
                    <div className="mt-4 flex h-4 overflow-hidden rounded-full" aria-hidden>
                      <span style={{ width: `${(v.totals.si / total) * 100}%`, background: "var(--yes)" }} />
                      <span style={{ width: `${(v.totals.no / total) * 100}%`, background: "var(--no)" }} />
                    </div>
                    <p className="mt-2 flex gap-4 text-sm font-bold">
                      <span>
                        <span className="num text-2xl">{v.totals.si}</span> sí
                      </span>
                      <span>
                        <span className="num text-2xl">{v.totals.no}</span> no
                      </span>
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
