import type { Metadata } from "next";
import { getGlossary } from "@/lib/data";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Glosario" };

export default function Page() {
  const g = [...getGlossary()].sort((a, b) => a.term.localeCompare(b.term, "es"));
  const letters = [...new Set(g.map((x) => x.term[0].toUpperCase()))];
  return (
    <div className="mx-auto max-w-[900px] px-4 md:px-8">
      <PageHead kicker="Glosario" title="Palabras que conviene entender" lede="Definiciones breves de conceptos económicos, estadísticos y parlamentarios que aparecen en la plataforma." />
      <nav aria-label="Letras" className="flex flex-wrap gap-1 font-mono text-sm">
        {letters.map((l) => (
          <a key={l} href={`#l-${l}`} className="rounded border border-rule px-2 py-1 hover:border-ink">
            {l}
          </a>
        ))}
      </nav>
      <dl className="mt-8">
        {g.map((x, i) => {
          const first = i === 0 || g[i - 1].term[0].toUpperCase() !== x.term[0].toUpperCase();
          return (
            <div key={x.slug} id={x.slug} className="scroll-mt-24 border-t border-rule py-5 target:bg-accent-soft/40">
              {first && <span id={`l-${x.term[0].toUpperCase()}`} className="display mb-2 block text-4xl text-accent" aria-hidden>{x.term[0].toUpperCase()}</span>}
              <dt className="text-xl font-semibold">{x.term}</dt>
              <dd className="mt-1 leading-relaxed text-ink-2">
                {x.definition}
                {x.sourceUrl && (
                  <>
                    {" "}
                    <a href={x.sourceUrl} target="_blank" rel="noreferrer" className="link text-sm">
                      Fuente ↗
                    </a>
                  </>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
