import Link from "next/link";
import { lastDataUpdate } from "@/lib/data";
import { formatDate } from "@/lib/format";

export function SiteFooter() {
  const updated = lastDataUpdate();
  return (
    <footer className="mt-24 border-t border-rule bg-paper-2">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-12 md:grid-cols-12 md:px-8">
        <div className="md:col-span-5">
          <p className="display text-3xl leading-tight">Informa. No recomienda el voto.</p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-2">
            Plataforma independiente. No pertenece a ningún partido ni recibe financiación de candidaturas. Cada afirmación política
            enlaza a su documento original.
          </p>
          <p className="mt-4 text-sm text-ink-2" role="note">
            <strong className="font-semibold text-ink">Alcance:</strong> esta primera versión analiza cinco candidaturas de ámbito estatal.
            Hay muchas otras, incluidas candidaturas territoriales, que no se analizan aquí. La lista completa está en el{" "}
            <a className="link" href="https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-22607" target="_blank" rel="noreferrer">
              BOE de candidaturas presentadas
            </a>
            .
          </p>
        </div>
        <nav aria-label="Pie de página" className="grid grid-cols-2 gap-6 text-sm md:col-span-4">
          <ul className="space-y-2">
            <li><Link className="link" href="/comparador">Comparador</Link></li>
            <li><Link className="link" href="/test">Test a ciegas</Link></li>
            <li><Link className="link" href="/observatorio">Observatorio</Link></li>
            <li><Link className="link" href="/votaciones">Votaciones</Link></li>
            <li><Link className="link" href="/promesas">Promesas y hechos</Link></li>
          </ul>
          <ul className="space-y-2">
            <li><Link className="link" href="/partidos">Partidos</Link></li>
            <li><Link className="link" href="/fuentes">Biblioteca de fuentes</Link></li>
            <li><Link className="link" href="/metodologia">Metodología</Link></li>
            <li><Link className="link" href="/glosario">Glosario</Link></li>
            <li><Link className="link" href="/privacidad">Privacidad</Link></li>
          </ul>
        </nav>
        <div className="md:col-span-3">
          <p className="kicker">Última actualización de datos</p>
          <p className="mt-1 font-mono text-sm">{updated ? formatDate(updated) : "—"}</p>
          <p className="kicker mt-6">Privacidad</p>
          <p className="mt-1 text-sm text-ink-2">Sin registro, sin cookies de seguimiento, sin analítica. Tus respuestas del test no salen de tu navegador.</p>
        </div>
      </div>
    </footer>
  );
}
