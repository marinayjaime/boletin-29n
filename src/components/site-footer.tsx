import Link from "next/link";
import { lastDataUpdate } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { PRIMARY, SECONDARY } from "@/lib/nav";

export function SiteFooter() {
  const updated = lastDataUpdate();
  return (
    <footer className="mt-24 bg-ink text-bg">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-14 md:grid-cols-12 md:px-8">
        <div className="md:col-span-5">
          <p className="display text-4xl md:text-5xl">
            Informa.
            <br />
            <span className="text-brand">No recomienda el voto.</span>
          </p>
          <p className="mt-5 max-w-md text-sm leading-relaxed opacity-70" role="note">
            Esta primera versión analiza cinco candidaturas estatales. Hay muchas más, incluidas las territoriales:{" "}
            <a className="underline decoration-brand decoration-2 underline-offset-4" href="https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-22607" target="_blank" rel="noreferrer">
              lista completa en el BOE
            </a>
            .
          </p>
        </div>
        <nav aria-label="Pie de página" className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm font-semibold md:col-span-4">
          {[...PRIMARY, ...SECONDARY, { href: "/privacidad", label: "Privacidad" }].map((n) => (
            <Link key={n.href} href={n.href} className="opacity-80 hover:text-brand hover:opacity-100">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-4 text-sm md:col-span-3">
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider opacity-60">Datos actualizados</p>
            <p className="num mt-1 text-2xl">{updated ? formatDate(updated) : "—"}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider opacity-60">Privacidad</p>
            <p className="mt-1 opacity-80">Sin registro ni analítica. El test no sale de tu navegador.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
