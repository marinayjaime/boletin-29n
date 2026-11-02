import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCycle, getGroupMovers, getParties, getPromises, getProposals, getQuiz, getSources, getTopics, getVotes, sourceById } from "@/lib/data";
import { PartyMark } from "@/components/party-mark";
import { SourceLinks } from "@/components/proposal-detail";
import { CATEGORY_LABELS, CYCLE_LABELS, STANCE_LABELS, VERIFICATION_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { GROUP_LABELS, PARTY_GROUP_NOTE } from "@/lib/groups";
import { PROMISE_STATUS as STATUS } from "@/lib/labels";

export function generateStaticParams() {
  return getParties().map((p) => ({ slug: p.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: getParties().find((p) => p.id === slug)?.officialName ?? "Partido" };
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-rule py-10 md:grid-cols-[220px_1fr]" aria-labelledby={`s-${n}`}>
      <h2 id={`s-${n}`} className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-accent">{n}</span>
        <span className="display text-2xl">{title}</span>
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getParties().find((x) => x.id === slug);
  if (!p) notFound();
  const status = getCycle().programStatus.find((s) => s.partyId === p.id);
  const proposals = getProposals().filter((x) => x.partyId === p.id);
  const topics = getTopics();
  const quiz = getQuiz();
  const promises = getPromises().filter((x) => x.partyIds.includes(p.id));
  const docs = getSources().filter((s) => s.partyId === p.id);
  const relation = PARTY_GROUP_NOTE[p.id];
  const votes = getVotes().votes;
  const group = relation?.group;
  const groupVotes = group ? votes.filter((v) => v.groups.some((g) => g.group === group)) : [];
  const tally = { si: 0, no: 0, abst: 0, dividido: 0 };
  for (const v of groupVotes) {
    const g = v.groups.find((x) => x.group === group)!;
    const parts = [g.si, g.no, g.abst].filter((x) => x > 0).length;
    if (parts > 1) tally.dividido++;
    if (g.si > g.no && g.si > g.abst) tally.si++;
    else if (g.no > g.si && g.no > g.abst) tally.no++;
    else if (g.abst > g.si && g.abst > g.no) tally.abst++;
  }
  const authorRe: Record<string, RegExp> = {
    GP: /del Grupo Parlamentario Popular/,
    GS: /del Grupo Parlamentario Socialista/,
    GVOX: /del Grupo Parlamentario VOX/,
    GSUMAR: /del Grupo Parlamentario (Plurinacional )?SUMAR/,
  };
  const initiatives = group && authorRe[group] ? votes.filter((v) => ["toma_consideracion", "proposicion_no_ley", "mocion"].includes(v.type) && authorRe[group].test(v.title)) : [];
  const uniqInit = [...new Map(initiatives.map((v) => [v.expediente ?? v.title, v])).values()];
  const movers = p.id === "podemos" || p.id === "frente-amplio" ? getGroupMovers().filter((m) => m.groups.GSUMAR && m.groups.GMx) : [];

  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-8">
      <nav className="pt-8 text-sm">
        <Link href="/partidos" className="link">
          ← Partidos
        </Link>
      </nav>
      <header className="flex flex-wrap items-end gap-6 pb-10 pt-6">
        <PartyMark monogram={p.monogram} size={88} />
        <div>
          <p className="kicker">{p.kind === "coalicion" ? "Coalición electoral" : "Partido político"} · siglas {p.acronym}</p>
          <h1 className="display text-5xl md:text-6xl">{p.officialName}</h1>
        </div>
      </header>

      <Section n="01" title="Identificación">
        <p className="leading-relaxed text-ink-2">{p.summary}</p>
        <dl className="mt-5 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-ink-3">Nombre oficial</dt>
          <dd>{p.officialName}</dd>
          <dt className="text-ink-3">Denominaciones en las candidaturas de 2026</dt>
          <dd>
            <ul>
              {p.ballotNames2026.map((b) => (
                <li key={b} className="font-mono text-xs">
                  {b}
                </li>
              ))}
            </ul>
          </dd>
          <dt className="text-ink-3">Cabeza de lista por Madrid</dt>
          <dd>{p.madridListHead ?? "—"} <span className="text-ink-3">(la ley no prevé la figura de «candidato a presidente»)</span></dd>
          <dt className="text-ink-3">Identidad gráfica</dt>
          <dd className="text-ink-2">Esta plataforma no reproduce logotipos ni colores corporativos para tratar igual a todas las candidaturas. Consulta la identidad oficial en su web.</dd>
          <dt className="text-ink-3">Web oficial</dt>
          <dd>
            <a href={p.website} className="link" target="_blank" rel="noreferrer">
              {p.website.replace("https://", "")}
            </a>
            {p.id === "frente-amplio" && <span className="text-ink-3"> (web de Movimiento Sumar; no se ha localizado web propia de Frente Amplio)</span>}
          </dd>
        </dl>
        <p className="mt-3 text-xs text-ink-3">Fuente: {sourceById(p.ballotSource)?.title}.</p>
      </Section>

      <Section n="02" title="Trayectoria documentada">
        <ol className="relative ml-2 border-l border-ink">
          {p.history.map((h) => {
            const s = sourceById(h.sourceId);
            return (
              <li key={h.date + h.text} className="relative pb-5 pl-5">
                <span className="absolute -left-[5px] top-1.5 h-[9px] w-[9px] rounded-full bg-ink" aria-hidden />
                <p className="font-mono text-xs text-ink-3">{formatDate(h.date)}</p>
                <p>{h.text}</p>
                {s && (
                  <a className="text-xs underline underline-offset-2" href={s.officialUrl} target="_blank" rel="noreferrer">
                    {s.title.slice(0, 80)} ↗
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </Section>

      <Section n="03" title="Programa electoral vigente">
        <p className="rounded bg-accent-soft/60 p-3 font-medium">Programa electoral 2026 pendiente de publicación</p>
        <p className="mt-2 text-sm text-ink-2">{status?.note} Comprobado el {status ? formatDate(status.checkedAt) : "—"}.</p>
        <p className="mt-3 text-sm">Mientras tanto se usan estos documentos anteriores, identificados como tales:</p>
        <ul className="mt-3 space-y-4">
          {docs.map((d) => (
            <li key={d.id} className="rounded border border-rule p-4">
              <p className="font-medium">{d.title}</p>
              <p className="text-xs text-ink-3">
                {CATEGORY_LABELS[d.kind]} · {d.cycle ? CYCLE_LABELS[d.cycle] : ""} · {VERIFICATION_LABELS[d.verification]} · {d.pages ?? "?"} páginas
              </p>
              {d.notes && <p className="mt-2 text-sm text-ink-2">{d.notes}</p>}
              <div className="mt-3">
                <SourceLinks source={d} />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section n="04" title="Propuestas por categorías">
        {topics
          .filter((t) => proposals.some((x) => x.topicId === t.id))
          .map((t) => (
            <div key={t.id} className="mb-6">
              <h3 className="kicker mb-2">
                <Link href={`/comparador?t=${t.id}`} className="hover:underline">
                  {t.name} →
                </Link>
              </h3>
              <ul className="space-y-1.5 text-sm">
                {proposals
                  .filter((x) => x.topicId === t.id)
                  .map((x) => (
                    <li key={x.id} className="flex gap-2">
                      <span className="text-ink-3" aria-hidden>
                        —
                      </span>
                      <span>
                        {x.summary} <span className="cite-chip ml-1">{CYCLE_LABELS[x.cycle]} · p. {x.citations[0].pdfPage}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        <p className="text-xs text-ink-3">Temas sin propuestas en esta lista: sin posición documentada todavía en esta plataforma (no implica oposición).</p>
      </Section>

      <Section n="05" title="Posturas documentadas (test)">
        <ul className="divide-y divide-rule text-sm">
          {quiz.map((q) => {
            const pos = q.positions.find((x) => x.partyId === p.id)!;
            return (
              <li key={q.id} className="grid gap-1 py-2 sm:grid-cols-[1fr_180px]">
                <span>{q.statement}</span>
                <span className={pos.stance === "sin_posicion_documentada" ? "text-ink-3" : "font-medium"}>{STANCE_LABELS[pos.stance].label}</span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section n="06" title="Actividad parlamentaria (XV Legislatura)">
        <p className="text-sm text-ink-2">{relation?.note}</p>
        {group ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded border border-rule bg-rule sm:grid-cols-4">
              {[
                ["Votaciones con el grupo presente", groupVotes.length],
                ["Mayoría del grupo: sí", tally.si],
                ["Mayoría del grupo: no", tally.no],
                ["Con voto dividido", tally.dividido],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-paper p-3">
                  <p className="kicker">{k}</p>
                  <p className="display tabular text-3xl">{Number(v).toLocaleString("es-ES")}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-3">Calculado a partir del voto nominal de cada diputado en {GROUP_LABELS[group]}. Incluye votaciones de todo tipo (enmiendas, mociones, leyes…), por lo que no mide por sí solo apoyo o rechazo a políticas concretas.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Link className="kicker rounded-full border border-ink px-3 py-1.5" href={`/votaciones?grupo=${encodeURIComponent(group)}`}>
                Ver sus votaciones
              </Link>
              <Link className="kicker rounded-full border border-rule px-3 py-1.5" href={`/votaciones?grupo=${encodeURIComponent(group)}&voto=dividido`}>
                Ver votaciones con voto dividido
              </Link>
            </div>
            {uniqInit.length > 0 && (
              <details className="mt-5 text-sm">
                <summary className="cursor-pointer">Iniciativas del grupo votadas en Pleno ({uniqInit.length})</summary>
                <ul className="mt-2 space-y-1">
                  {uniqInit.slice(0, 60).map((v) => (
                    <li key={v.id}>
                      <Link href={`/votaciones/${v.id}`} className="hover:underline">
                        {formatDate(v.date)} — {v.title.slice(0, 140)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        ) : null}
        {movers.length > 0 && (
          <div className="mt-6 rounded border border-rule p-4 text-sm">
            <p className="font-medium">Diputados que votaron primero en el G. P. Plurinacional SUMAR y después en el Grupo Mixto</p>
            <p className="text-xs text-ink-3">Derivado del voto nominal. Los datos abiertos no indican la afiliación de partido de cada diputado.</p>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {movers.map((m) => (
                <li key={m.name}>
                  {m.name}{" "}
                  <span className="font-mono text-xs text-ink-3">
                    (SUMAR: {m.groups.GSUMAR} · Mixto: {m.groups.GMx} votaciones)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section n="07" title="Promesas históricas">
        {promises.length === 0 ? (
          <p className="text-sm text-ink-3">Sin fichas evaluadas todavía para esta candidatura.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {promises.map((x) => (
              <li key={x.id}>
                <Link href="/promesas" className="hover:underline">
                  {STATUS[x.assessment.status].glyph} {x.promise}
                </Link>{" "}
                <span className="text-ink-3">— {STATUS[x.assessment.status].label}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
