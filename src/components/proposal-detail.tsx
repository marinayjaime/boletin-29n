import { ExternalLink, FileText } from "lucide-react";
import type { Party, PolicyTopic, Proposal, SourceDocument } from "@/lib/schema";
import { CATEGORY_LABELS, CYCLE_LABELS, VERIFICATION_LABELS, pdfLink } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { partyVars } from "@/lib/party-theme";
import { Disclosure, TopicIcon } from "./ui";

export function SourceLinks({ source, page }: { source: SourceDocument; page?: number }) {
  const isPdf = /\.pdf($|\?)/i.test(source.officialUrl);
  const archive = source.archiveUrl ? (page ? pdfLink(source.archiveUrl, page) : source.archiveUrl) : null;
  const official = page && isPdf ? pdfLink(source.officialUrl, page) : source.officialUrl;
  const primary = source.originalUnavailable && archive ? archive : official;
  return (
    <div className="flex flex-wrap gap-2">
      <a href={primary} target="_blank" rel="noreferrer" className="btn btn-primary min-h-[44px] text-sm">
        <FileText size={16} aria-hidden />
        {source.originalUnavailable ? "Copia archivada del original" : source.hostedByThirdParty ? "Página oficial" : "Documento original"}
        {page ? ` · pág. ${page}` : ""}
      </a>
      {!source.originalUnavailable && archive && (
        <a href={archive} target="_blank" rel="noreferrer" className="btn btn-ghost min-h-[44px] text-sm">
          <ExternalLink size={16} aria-hidden />
          {source.hostedByThirdParty ? "Copia consultada (tercero)" : "Copia archivada"}
        </a>
      )}
      {source.originalUnavailable && <span className="tag self-center">El enlace original ya no está disponible</span>}
    </div>
  );
}

export function ProposalDetail({ proposal, source, party, topic, related }: { proposal: Proposal; source: SourceDocument; party: Party; topic: PolicyTopic; related: Proposal[] }) {
  const c = proposal.citations[0];
  const v = partyVars(party.id);
  const dim = topic.dimensions.find((d) => d.id === proposal.dimensionId);
  const printed = source.printedPageOffset ? c.pdfPage - source.printedPageOffset : null;
  return (
    <article className="space-y-6">
      <header className="rounded-[24px] p-5" style={{ background: v.primary, color: v.on }}>
        <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
          <TopicIcon id={topic.id} size={16} /> {topic.short} · {party.shortName}
        </p>
        <h2 className="display mt-3 text-[2rem] md:text-4xl">{proposal.summary}</h2>
        <p className="mt-3 text-sm font-bold">{dim?.label}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <span className="tag">{CATEGORY_LABELS[proposal.category]}</span>
        <span className="tag">{CYCLE_LABELS[proposal.cycle] ?? proposal.cycle}</span>
        <span className="tag">{VERIFICATION_LABELS[source.verification]}</span>
        <span className="tag">Pág. {c.pdfPage}</span>
      </div>

      <section aria-labelledby="txt">
        <h3 id="txt" className="eyebrow mb-2">
          Lo que dice el documento
        </h3>
        <blockquote className="rounded-2xl bg-surface p-5 text-[1.05rem] font-semibold leading-relaxed" style={{ boxShadow: `inset 4px 0 0 ${v.primary}` }}>
          «{c.quote}»
        </blockquote>
        <p className="mt-2 text-sm font-semibold text-ink-3">
          Página {c.pdfPage} del PDF{printed ? ` (impresa: ${printed})` : ""}
        </p>
      </section>

      <SourceLinks source={source} page={c.pdfPage} />

      {proposal.cycle !== "generales-2026" && (
        <p className="rounded-2xl bg-brand-soft p-4 text-sm font-bold">
          Documento anterior a 2026: no es el programa de {party.shortName} para el 29-N.
        </p>
      )}

      <div className="space-y-2">
        <Disclosure summary="¿Quién podría aplicarla?">{proposal.competence ?? topic.competence}</Disclosure>
        <Disclosure summary="Condiciones y contexto">
          <p>{proposal.conditions ?? "El documento no detalla condiciones, plazos ni coste en este punto."}</p>
          {proposal.context && <p className="mt-2">{proposal.context}</p>}
        </Disclosure>
        <Disclosure summary="Ficha del documento">
          <p className="font-bold text-ink">{source.title}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-3">Autor</dt>
            <dd>{source.author}</dd>
            <dt className="text-ink-3">Publicación</dt>
            <dd>{formatDate(source.published)}</dd>
            <dt className="text-ink-3">Comprobado</dt>
            <dd>{formatDate(proposal.verification.checkedAt)}</dd>
            {source.sha256 && (
              <>
                <dt className="text-ink-3">SHA-256</dt>
                <dd className="break-all font-mono text-[0.7rem]">{source.sha256}</dd>
              </>
            )}
          </dl>
          {source.notes && <p className="mt-2 text-sm">{source.notes}</p>}
        </Disclosure>
        {related.length > 0 && (
          <Disclosure summary={`Más de ${party.shortName} sobre ${topic.short.toLowerCase()} (${related.length})`}>
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.id} className="flex gap-2">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: v.primary }} aria-hidden />
                  <span>
                    {r.summary} <span className="tag">pág. {r.citations[0].pdfPage}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Disclosure>
        )}
      </div>
    </article>
  );
}
