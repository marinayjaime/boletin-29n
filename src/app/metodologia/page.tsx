import type { Metadata } from "next";
import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import { BadgeCheck, FileSearch, Scale } from "lucide-react";
import { getChangelog, getIndicators, getPolls, getPromises, getProposals, getQuiz, getSources, getVotes } from "@/lib/data";
import { Disclosure, PageHero } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { MIN_COMPARABLE, MIN_OVERALL, SMALL_BASE } from "@/lib/quiz";
import { isMainScenario } from "@/lib/seats";
import { DataStatusTable } from "@/components/data-status";

export const metadata: Metadata = { title: "Metodología" };

function Section({ id, title, stat, children }: { id: string; title: string; stat?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24">
      <Disclosure
        summary={
          <span className="flex flex-1 items-baseline justify-between gap-3">
            <span className="text-lg font-extrabold text-ink">{title}</span>
            {stat && <span className="text-sm font-extrabold text-ink-3">{stat}</span>}
          </span>
        }
      >
        <div className="prose-civic space-y-3">{children}</div>
      </Disclosure>
    </div>
  );
}

export default function Page() {
  const log = getChangelog();
  const imports = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "import-log.json"), "utf8")) as { date: string; importer: string; ok: number; failures: string[] }[];
    } catch {
      return [];
    }
  })();
  const thirdParty = getSources().filter((s) => s.hostedByThirdParty);
  const { polls } = getPolls();
  const promises = getPromises();
  const PRINCIPLES = [
    { icon: Scale, title: "Informa, no recomienda", text: "Mismo espacio y estilo para todas las candidaturas. Orden alfabético. Ninguna recomendación de voto." },
    { icon: FileSearch, title: "Todo tiene fuente", text: "Cada propuesta enlaza su documento, con página y cita literal comprobada automáticamente." },
    { icon: BadgeCheck, title: "Autoría a la vista", text: "Los datos los preparó un asistente de IA. Cada evaluación dice si una persona la ha revisado; hoy, ninguna." },
  ];
  return (
    <>
      <PageHero eyebrow="Cómo trabajamos" title="Metodología" sub="Qué fuentes se usan, cómo se comprueban y qué límites tiene cada sección." />
      <div className="mx-auto max-w-[960px] px-4 md:px-8">
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <li key={p.title} className="card p-6">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-brand">
                <p.icon size={24} aria-hidden />
              </span>
              <p className="display mt-4 text-2xl">{p.title}</p>
              <p className="mt-2 font-semibold text-ink-2">{p.text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 space-y-2">
          <Section id="propuestas" title="Propuestas" stat={`${getProposals().length} con cita`}>
            <p>
              Se descarga el documento (o su copia en Internet Archive), se calcula su huella SHA-256 y se extrae el texto de cada página. Un asistente de IA (Claude) selecciona la cita literal y redacta un resumen que no añade nada; ninguna persona lo ha revisado aún. Un test comprueba que <strong>cada cita aparece en la página indicada</strong>; si no, el build falla.
            </p>
            <p>Si no hay documento se muestra «Sin posición documentada», que no equivale a oposición. PP y Vox han publicado su programa de 2026, pero sus propuestas aún no están extraídas: las que se muestran proceden de programas anteriores.</p>
            {thirdParty.length > 0 && <p>Copias de terceros: {thirdParty.map((s) => s.title).join("; ")}. Marcadas como tales hasta cotejarlas con el original.</p>}
          </Section>

          <Section id="test" title="Test a ciegas" stat={`${getQuiz().length} preguntas`}>
            <p>
              Cada afirmación tiene, por partido, una postura documentada (a favor, en contra, matizada o sin datos) apoyada en propuestas concretas. Al terminar se muestran los cinco partidos por igual, en orden
              alfabético, con <strong>coincidencias ÷ respuestas comparables</strong> en total y por tema. No se destaca a ningún partido.
            </p>
            <p>
              Comparables: tu respuesta es de acuerdo o en desacuerdo y el partido tiene postura a favor o en contra. El porcentaje global exige al menos {MIN_OVERALL} comparables y por tema {MIN_COMPARABLE}; con menos de {SMALL_BASE} se avisa de base pequeña. Cada respuesta se dibuja como un cuadrado para que se vea cuántas sostienen cada cifra. Las respuestas no salen del navegador.
            </p>
          </Section>

          <Section id="encuestas" title="Encuestas y pactos" stat={`${polls.filter(isMainScenario).length} de ${polls.length} aptas como escenario`}>
            <p>
              Cada encuesta se contrasta con su publicación original (fecha, empresa, escaños, horquillas y coaliciones). Solo las verificadas o corregidas y con reparto completo de los 350 escaños sirven
              de escenario principal. Los repartos parciales no se completan y las horquillas no se convierten en cifras. Las encuestas encargadas por un partido se señalan.
            </p>
            <p>Investidura: mayoría absoluta (176) en primera votación; más síes que noes en la segunda (art. 99 CE).</p>
          </Section>

          <Section id="promesas" title="Promesas frente a hechos" stat={`${promises.length} fichas`}>
            <p>
              Para el PSOE de 2023 se distinguen tres documentos: el programa electoral (julio), el acuerdo de Gobierno con Sumar (octubre) y el discurso de investidura de Pedro Sánchez (noviembre). Si un compromiso
              aparece en varios, es una sola ficha con todas sus citas. Cada ficha indica si exige una ley, una medida del Gobierno o un resultado medible.
            </p>
            <p>
              Antes de declarar un compromiso «no cumplido» se busca en el <strong>texto íntegro</strong> de las normas estatales con rango de ley de la legislatura (no solo en sus títulos), para encontrar reformas
              incluidas en otras normas. Un real decreto-ley solo cuenta si el Congreso lo convalidó. Una medida del Gobierno o un resultado sin datos oficiales queda «no verificable», con la lista de lo comprobado.
            </p>
            <p>
              Las evaluaciones las preparó un asistente de IA (Claude) y están <strong>pendientes de revisión humana</strong>. Cuando una persona revise una ficha, constarán su nombre y la fecha; la validación de
              datos impide marcar como revisada una ficha sin revisor identificado o revisada por un sistema automático.
            </p>
          </Section>

          <Section id="estadistica" title="Datos estadísticos" stat={`${getIndicators().filter((i) => !i.hidden).length} series`}>
            <p>
              Series de Eurostat (JSON-stat), con la URL exacta de cada consulta y su fecha de descarga. No se interpolan ni se estiman valores. Pueden diferir ligeramente del INE (IPCA frente a IPC). Los cambios de
              Gobierno se marcan como contexto, no como causa.
            </p>
          </Section>

          <Section id="votaciones" title="Votaciones del Congreso" stat={`${getVotes().votes.length.toLocaleString("es-ES")} votaciones`}>
            <p>
              Ficheros oficiales del Congreso, una votación por fichero. El voto por grupo se calcula sumando el de cada diputado; los temas se asignan por palabras clave y son orientativos. La actividad del grupo
              SUMAR se presenta como antecedente de Frente Amplio, no como suya. A Podemos no se le atribuyen los votos del Grupo Mixto.
            </p>
          </Section>

          <Section id="actualizacion" title="Actualizaciones automáticas" stat="cada día">
            <p>
              Un proceso diario de GitHub Actions importa las series de Eurostat y el registro del BOE y comprueba los enlaces. Esos cambios solo se publican si pasan la validación de datos y los tests, y quedan anotados en el registro de cambios.
            </p>
            <p>Encuestas nuevas, cambios en el Gobierno, programas de 2026 y enlaces rotos se detectan, pero no se publican: abren una incidencia para revisión humana.</p>
            <p>
              Si una importación falla, la web conserva los últimos datos correctos y el fallo queda registrado con su fecha y su mensaje. Cada página muestra por separado la última actualización correcta y la
              última revisión editorial: un dato pendiente de revisión nunca aparece solo como «actualizado».
            </p>
          </Section>

          <Section id="estado" title="Estado de los datos" stat="actualización y revisión">
            <DataStatusTable />
          </Section>

          <Section id="limites" title="Límites conocidos">
            <ul className="list-disc space-y-1 pl-5">
              <li>Los programas de 2026 ya publicados (PP y Vox) están registrados como documento, pero sus propuestas aún no están incorporadas; PSOE, Frente Amplio y Podemos no tenían programa localizable en la última comprobación.</li>
              <li>Podemos no tiene programa propio de generales desde 2019; su programa de 2024 es europeo.</li>
              <li>No se ha localizado el texto íntegro del acuerdo de coalición PSOE–Sumar en una fuente oficial.</li>
              <li>Las votaciones por llamamiento no tienen voto nominal en datos abiertos.</li>
              <li>Varias webs de partidos bloquean el acceso automatizado: sus cambios se revisan a mano.</li>
              <li>La plataforma no ha sido auditada externamente.</li>
            </ul>
          </Section>

          <Section id="registro" title="Registro de cambios" stat={`${log.length} entradas`}>
            <ul className="space-y-2 text-sm">
              {log.slice(0, 30).map((l, i) => (
                <li key={i}>
                  <span className="font-extrabold text-ink">{formatDate(l.date)}</span> · {l.entityId} — {l.detail}
                </li>
              ))}
              {imports.slice(0, 6).map((l, i) => (
                <li key={`i${i}`}>
                  <span className="font-extrabold text-ink">{formatDate(l.date)}</span> · importación {l.importer}: {l.ok} correctas{l.failures.length ? `, ${l.failures.length} fallos` : ""}
                </li>
              ))}
            </ul>
          </Section>
        </div>
        <p className="mt-6 text-sm font-semibold text-ink-3">
          Código y datos en el repositorio del proyecto. <Link href="/privacidad" className="underline">Privacidad</Link>.
        </p>
      </div>
    </>
  );
}
