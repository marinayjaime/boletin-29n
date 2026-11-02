import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Columns3, Landmark, ListChecks } from "lucide-react";
import { getCycle, getGroupMovers, getOrganization, getParties, getPhotos, getPromises, getProposals, getQuiz, getSources, getTopics, getVotes, sourceById } from "@/lib/data";
import { CATEGORY_LABELS, CYCLE_LABELS, STANCE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { GROUP_LABELS, PARTY_GROUP_NOTE } from "@/lib/groups";
import { partyVars, PARTY_THEME } from "@/lib/party-theme";
import { Disclosure, PartyAvatar, StatusBadge, TopicIcon } from "@/components/ui";
import { SourceLinks } from "@/components/proposal-detail";

export function generateStaticParams() {
  return getParties().map((p) => ({ slug: p.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: getParties().find((p) => p.id === slug)?.officialName ?? "Partido" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getParties().find((x) => x.id === slug);
  if (!p) notFound();
  const v = partyVars(p.id);
  const theme = PARTY_THEME[p.id];
  const photo = getPhotos()[p.representative.photo];
  const status = getCycle().programStatus.find((s) => s.partyId === p.id);
  const proposals = getProposals().filter((x) => x.partyId === p.id);
  const topics = getTopics().filter((t) => proposals.some((x) => x.topicId === t.id));
  const quiz = getQuiz();
  const promises = getPromises().filter((x) => x.partyIds.includes(p.id));
  const docs = getSources().filter((s) => s.partyId === p.id);
  const relation = PARTY_GROUP_NOTE[p.id];
  const group = relation?.group;
  const votes = getVotes().votes;
  const groupVotes = group ? votes.filter((x) => x.groups.some((g) => g.group === group)) : [];
  const tally = { si: 0, no: 0, abst: 0, dividido: 0 };
  for (const x of groupVotes) {
    const g = x.groups.find((y) => y.group === group)!;
    if ([g.si, g.no, g.abst].filter((n) => n > 0).length > 1) tally.dividido++;
    if (g.si > g.no && g.si > g.abst) tally.si++;
    else if (g.no > g.si && g.no > g.abst) tally.no++;
    else if (g.abst > g.si && g.abst > g.no) tally.abst++;
  }
  const movers = p.id === "podemos" || p.id === "frente-amplio" ? getGroupMovers().filter((m) => m.groups.GSUMAR && m.groups.GMx) : [];
  const porg = getOrganization().parties[p.id];
  const stances = quiz.map((q) => ({ q, pos: q.positions.find((x) => x.partyId === p.id)! }));
  const documented = stances.filter((s) => s.pos.stance !== "sin_posicion_documentada").length;

  return (
    <>
      <header style={{ background: v.primary, color: v.on }}>
        <div className="mx-auto grid max-w-[1320px] items-end gap-8 px-4 pb-14 pt-8 md:grid-cols-[1fr_auto] md:px-8 md:pt-12">
          <div>
            <Link href="/partidos" className="text-sm font-bold hover:opacity-100">
              ← Partidos
            </Link>
            <p className="mt-6 text-sm font-extrabold uppercase tracking-wider">{p.kind === "coalicion" ? "Coalición electoral" : "Partido político"}</p>
            <h1 className="display mt-2 text-[3.4rem] md:text-[6rem]">{p.shortName}</h1>
            <p className="mt-2 text-lg font-bold opacity-90">{p.officialName}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={`/comparador?p=${p.id},${p.id === "pp" ? "psoe" : "pp"}`} className="btn bg-black/20 text-current hover:bg-black/30">
                <Columns3 size={18} aria-hidden /> Comparar
              </Link>
              {group && (
                <Link href={`/votaciones?grupo=${encodeURIComponent(group)}`} className="btn bg-black/20 text-current hover:bg-black/30">
                  <Landmark size={18} aria-hidden /> Votaciones
                </Link>
              )}
              <Link href="/test" className="btn bg-black/20 text-current hover:bg-black/30">
                <ListChecks size={18} aria-hidden /> Test
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4 md:flex-col md:items-end md:text-right">
            <PartyAvatar party={p} size={168} ring={5} />
            <div>
              <p className="text-xl font-extrabold">{p.representative.name}</p>
              {p.representative.roles.map((r) => (
                <p key={r.label} className="text-sm font-bold">
                  {r.label}
                </p>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <ul className="-mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [proposals.length, "propuestas documentadas"],
            [topics.length, "temas con propuestas"],
            [documented, `posturas en el test (de ${quiz.length})`],
            [promises.length, "promesas evaluadas"],
          ].map(([n, l]) => (
            <li key={String(l)} className="card p-4">
              <p className="num text-5xl" style={{ color: v.strong }}>
                {n}
              </p>
              <p className="mt-1 text-sm font-bold text-ink-2">{l}</p>
            </li>
          ))}
        </ul>

        <section className="mt-10 grid gap-4 md:grid-cols-2" aria-labelledby="prog">
          <div className="rounded-[24px] p-6" style={{ background: v.soft }}>
            <h2 id="prog" className="display text-3xl" style={{ color: v.strong }}>
              Programa 2026
            </h2>
            <p className="mt-2 text-lg font-extrabold">Pendiente de publicación</p>
            <p className="mt-1 text-sm font-semibold text-ink-2">
              {status?.note} Comprobado el {status ? formatDate(status.checkedAt) : "—"}.
            </p>
          </div>
          <div className="card p-6">
            <p className="eyebrow">Documentos usados mientras tanto</p>
            <ul className="mt-3 space-y-4">
              {docs.map((d) => (
                <li key={d.id}>
                  <p className="font-extrabold">{d.title}</p>
                  <p className="text-xs font-bold text-ink-3">
                    {CATEGORY_LABELS[d.kind]} · {d.cycle ? CYCLE_LABELS[d.cycle] : ""} · {d.pages} págs.
                  </p>
                  <div className="mt-2">
                    <SourceLinks source={d} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-12" aria-labelledby="props">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 id="props" className="display text-4xl md:text-5xl">
              Qué propone
            </h2>
            <nav aria-label="Temas" className="lane flex max-w-full gap-2 overflow-x-auto">
              {topics.map((t) => (
                <a key={t.id} href={`#t-${t.id}`} className="chip shrink-0">
                  <TopicIcon id={t.id} size={15} /> {t.short}
                </a>
              ))}
            </nav>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topics.map((t) => (
              <article key={t.id} id={`t-${t.id}`} className="card scroll-mt-24 p-5">
                <h3 className="flex items-center gap-2 text-lg font-extrabold">
                  <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: v.soft, color: v.strong }}>
                    <TopicIcon id={t.id} size={18} />
                  </span>
                  {t.name}
                </h3>
                <ul className="mt-3 space-y-2">
                  {proposals
                    .filter((x) => x.topicId === t.id)
                    .map((x) => (
                      <li key={x.id} className="flex gap-2 text-[0.95rem] font-semibold">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: v.primary }} aria-hidden />
                        <span>
                          {x.summary} <span className="tag">p. {x.citations[0].pdfPage}</span>
                        </span>
                      </li>
                    ))}
                </ul>
                <Link href={`/comparador?t=${t.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold" style={{ color: v.strong }}>
                  Comparar este tema <ArrowRight size={14} aria-hidden />
                </Link>
              </article>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-ink-3">Los temas que no aparecen no tienen propuestas indexadas todavía (no implica oposición).</p>
        </section>

        <section className="mt-12" aria-labelledby="pos">
          <h2 id="pos" className="display mb-4 text-4xl md:text-5xl">
            Posturas documentadas
          </h2>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {stances.map(({ q, pos }) => (
              <li key={q.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-[var(--shadow)]">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black text-white"
                  style={{ background: pos.stance === "a_favor" ? "var(--yes)" : pos.stance === "en_contra" ? "var(--no)" : pos.stance === "matizada" ? "var(--partial)" : "var(--abs)" }}
                  aria-hidden
                >
                  {pos.stance === "a_favor" ? "✓" : pos.stance === "en_contra" ? "✕" : pos.stance === "matizada" ? "≈" : "·"}
                </span>
                <span className="flex-1 text-sm font-bold">{q.statement}</span>
                <span className="text-xs font-extrabold text-ink-3">{STANCE_LABELS[pos.stance].short}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <section className="card p-6" aria-labelledby="hist">
            <h2 id="hist" className="display text-3xl">
              Cronología
            </h2>
            <ol className="relative ml-3 mt-5 border-l-2 border-line">
              {p.history.map((h) => {
                const s = sourceById(h.sourceId);
                return (
                  <li key={h.date + h.text} className="relative pb-5 pl-6">
                    <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-bg" style={{ background: v.primary }} aria-hidden />
                    <p className="text-xs font-extrabold text-ink-3">{formatDate(h.date)}</p>
                    <p className="font-semibold">{h.text}</p>
                    {s && (
                      <a className="text-sm font-bold underline decoration-brand decoration-2 underline-offset-2" href={s.officialUrl} target="_blank" rel="noreferrer">
                        Fuente ↗
                      </a>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
          <section className="card p-6" aria-labelledby="parl">
            <h2 id="parl" className="display text-3xl">
              En el Congreso (2023–2026)
            </h2>
            <p className="mt-2 text-sm font-semibold text-ink-2">{relation?.note}</p>
            {group && (
              <>
                <p className="mt-4 font-extrabold">{GROUP_LABELS[group]}</p>
                <div className="mt-3 flex h-6 overflow-hidden rounded-full" role="img" aria-label={`Mayoría del grupo: ${tally.si} votaciones sí, ${tally.no} no, ${tally.abst} abstención`}>
                  <span style={{ flex: tally.si, background: "var(--yes)" }} />
                  <span style={{ flex: tally.no, background: "var(--no)" }} />
                  <span style={{ flex: tally.abst, background: "var(--abs)" }} />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  {[
                    [groupVotes.length, "votaciones"],
                    [tally.si, "mayoría sí"],
                    [tally.no, "mayoría no"],
                    [tally.dividido, "voto dividido"],
                  ].map(([n, l]) => (
                    <div key={String(l)}>
                      <p className="num text-3xl">{Number(n).toLocaleString("es-ES")}</p>
                      <p className="text-xs font-bold text-ink-3">{l}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs font-semibold text-ink-3">Incluye todo tipo de votaciones (enmiendas, mociones, leyes…): no mide por sí solo apoyo o rechazo a políticas concretas.</p>
              </>
            )}
            {movers.length > 0 && (
              <Disclosure summary={`Diputados que pasaron de SUMAR al Grupo Mixto (${movers.length})`} className="mt-4">
                <ul className="space-y-1">
                  {movers.map((m) => (
                    <li key={m.name}>
                      {m.name} <span className="text-xs">({m.groups.GSUMAR} votaciones en SUMAR · {m.groups.GMx} en el Mixto)</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">Derivado del voto nominal; los datos abiertos no indican la afiliación de partido.</p>
              </Disclosure>
            )}
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="card p-6" aria-labelledby="prom">
            <h2 id="prom" className="display text-3xl">
              Promesas evaluadas
            </h2>
            {promises.length === 0 ? (
              <p className="mt-3 font-semibold text-ink-3">Sin fichas evaluadas todavía.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {promises.slice(0, 8).map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold">{x.promise}</span>
                    <StatusBadge status={x.assessment.status} />
                  </li>
                ))}
              </ul>
            )}
            <Link href="/promesas" className="btn btn-ghost mt-4 text-sm">
              Ver todas <ArrowRight size={14} aria-hidden />
            </Link>
          </section>
          <section className="card p-6" aria-labelledby="org">
            <h2 id="org" className="display text-3xl">
              Organización interna
            </h2>
            {porg.organs.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {porg.organs.map((o) => (
                  <li key={o.id} className="rounded-full px-3 py-1.5 text-sm font-bold" style={{ background: v.soft, color: v.strong }}>
                    {o.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 font-semibold text-ink-3">Pendiente de documentar.</p>
            )}
            <Link href="/quien-hace-que" className="btn btn-ghost mt-4 text-sm">
              Ver organigrama <ArrowRight size={14} aria-hidden />
            </Link>
          </section>
        </div>

        <div className="mt-6 grid gap-2 md:grid-cols-2">
          <Disclosure summary="Denominaciones en las candidaturas de 2026 (BOE)">
            <ul>
              {p.ballotNames2026.map((b) => (
                <li key={b} className="font-mono text-xs">
                  {b}
                </li>
              ))}
            </ul>
          </Disclosure>
          <Disclosure summary="Créditos de imagen y color">
            {photo && (
              <p>
                Retrato: {photo.author} ({photo.date}), licencia {photo.license}.{" "}
                <a href={photo.commonsPage} className="link" target="_blank" rel="noreferrer">
                  Wikimedia Commons
                </a>
                .
              </p>
            )}
            <p className="mt-2">
              Color {theme.primary}: {theme.source.label}.
            </p>
            <p className="mt-2">No se reproducen logotipos oficiales: su uso requiere autorización de cada formación.</p>
          </Disclosure>
        </div>
      </div>
    </>
  );
}
