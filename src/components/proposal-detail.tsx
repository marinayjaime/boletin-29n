import type { Party, PolicyTopic, Proposal, SourceDocument } from "@/lib/schema";
import { CATEGORY_LABELS, CYCLE_LABELS, VERIFICATION_LABELS, pdfLink } from "@/lib/labels";
import { formatDate } from "@/lib/format";

export function SourceLinks({ source, page }: { source: SourceDocument; page?: number }) {
  const isPdf = /\.pdf($|\?)/i.test(source.officialUrl);
  const archive = source.archiveUrl ? (page ? pdfLink(source.archiveUrl, page) : source.archiveUrl) : null;
  const official = page && isPdf ? pdfLink(source.officialUrl, page) : source.officialUrl;
  return (
    <div className="flex flex-wrap gap-2">
      {source.originalUnavailable && archive ? (
        <>
          <a href={archive} target="_blank" rel="noreferrer" className="kicker rounded-full border border-ink px-3 py-1.5 text-ink hover:bg-ink hover:text-paper">
            Copia archivada del original ↗
          </a>
          <span className="kicker rounded-full border border-dashed border-rule px-3 py-1.5 text-ink-3" title={source.officialUrl}>
            Enlace original ya no disponible
          </span>
        </>
      ) : (
        <>
          <a href={official} target="_blank" rel="noreferrer" className="kicker rounded-full border border-ink px-3 py-1.5 text-ink hover:bg-ink hover:text-paper">
            {source.hostedByThirdParty ? "Página oficial" : "Documento original"} ↗
          </a>
          {archive && (
            <a href={archive} target="_blank" rel="noreferrer" className="kicker rounded-full border border-rule px-3 py-1.5 hover:border-ink">
              {source.hostedByThirdParty ? "Copia consultada (tercero)" : "Copia archivada"} ↗
            </a>
          )}
        </>
      )}
    </div>
  );
}

export function ProposalDetail({
  proposal,
  source,
  party,
  topic,
  related,
}: {
  proposal: Proposal;
  source: SourceDocument;
  party: Party;
  topic: PolicyTopic;
  related: Proposal[];
}) {
  const c = proposal.citations[0];
  const dim = topic.dimensions.find((d) => d.id === proposal.dimensionId);
  const printed = source.printedPageOffset ? c.pdfPage - source.printedPageOffset : null;
  return (
    <article className="space-y-7">
      <header>
        <p className="kicker">
          {party.shortName} · {topic.name} · {dim?.label}
        </p>
        <h2 className="display mt-2 text-3xl leading-tight md:text-[2.1rem]">{proposal.summary}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="cite-chip">{CATEGORY_LABELS[proposal.category]}</span>
          <span className="cite-chip">{CYCLE_LABELS[proposal.cycle] ?? proposal.cycle}</span>
          <span className="cite-chip">{VERIFICATION_LABELS[source.verification]}</span>
        </div>
      </header>

      <section aria-labelledby="txt">
        <h3 id="txt" className="kicker mb-2">
          Texto original
        </h3>
        <blockquote className="border-l-2 border-accent pl-4 font-display text-lg leading-relaxed text-ink-2 italic">
          «{c.quote}»
        </blockquote>
        <p className="mt-2 font-mono text-xs text-ink-3">
          Página {c.pdfPage} del PDF{printed ? ` (página impresa ${printed})` : ""}
          {c.section ? ` · ${c.section}` : ""}
        </p>
      </section>

      <section aria-labelledby="doc" className="rounded border border-rule p-4">
        <h3 id="doc" className="kicker mb-2">
          Documento de procedencia
        </h3>
        <p className="font-medium">{source.title}</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-3">Autor</dt>
          <dd>{source.author}</dd>
          <dt className="text-ink-3">Publicación</dt>
          <dd>{formatDate(source.published)}</dd>
          <dt className="text-ink-3">Convocatoria</dt>
          <dd>{CYCLE_LABELS[proposal.cycle] ?? proposal.cycle}</dd>
          <dt className="text-ink-3">Comprobado</dt>
          <dd>{formatDate(proposal.verification.checkedAt)} · cotejo con el PDF</dd>
          {source.sha256 && (
            <>
              <dt className="text-ink-3">SHA-256</dt>
              <dd className="break-all font-mono text-[0.7rem] text-ink-3">{source.sha256}</dd>
            </>
          )}
        </dl>
        {source.notes && <p className="mt-3 text-sm text-ink-2">{source.notes}</p>}
        <div className="mt-4">
          <SourceLinks source={source} page={c.pdfPage} />
        </div>
      </section>

      <section aria-labelledby="ctx" className="space-y-3">
        <h3 id="ctx" className="kicker">
          Contexto
        </h3>
        {proposal.cycle !== "generales-2026" && (
          <p className="rounded bg-accent-soft/60 p-3 text-sm">
            Esta propuesta procede de un documento anterior a la convocatoria de 2026. El programa electoral 2026 de {party.shortName} está
            pendiente de publicación; cuando se publique, la propuesta se revisará.
          </p>
        )}
        {proposal.context && <p className="text-sm text-ink-2">{proposal.context}</p>}
        <div>
          <p className="text-sm font-medium">Competencia administrativa</p>
          <p className="text-sm text-ink-2">{proposal.competence ?? topic.competence}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Condiciones de aplicación</p>
          <p className="text-sm text-ink-2">{proposal.conditions ?? "El documento no detalla condiciones, plazos ni coste en este punto."}</p>
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="rel">
          <h3 id="rel" className="kicker mb-2">
            Otras propuestas relacionadas del mismo documento
          </h3>
          <ul className="space-y-2">
            {related.map((r) => (
              <li key={r.id} className="border-t border-rule pt-2 text-sm">
                {r.summary} <span className="cite-chip ml-1">p. {r.citations[0].pdfPage}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
