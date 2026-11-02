import type { Metadata } from "next";
import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import { getChangelog, getProposals, getQuiz, getSources, getVotes, getIndicators } from "@/lib/data";
import { PageHero } from "@/components/ui";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Metodología" };

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="display mt-14 scroll-mt-24 border-t border-rule pt-8 text-3xl">
      {children}
    </h2>
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
  return (
    <>
      <PageHero eyebrow="Cómo trabajamos" title="Metodología" sub="Qué fuentes se usan, cómo se seleccionan y resumen las propuestas, cómo se comprueban y qué límites tiene cada sección." />
      <div className="mx-auto max-w-[860px] px-4 md:px-8">
      <nav aria-label="Índice" className="flex flex-wrap gap-2 text-sm">
        {[
          ["principios", "Principios"],
          ["propuestas", "Propuestas"],
          ["test", "Test"],
          ["estadistica", "Estadística"],
          ["votaciones", "Votaciones"],
          ["promesas", "Promesas"],
          ["limites", "Límites"],
          ["registro", "Registro de cambios"],
        ].map(([id, l]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-rule px-3 py-1 hover:border-ink">
            {l}
          </a>
        ))}
      </nav>
      <div className="prose-civic mt-6 text-ink-2">
        <H id="principios">Principios</H>
        <p>
          <strong className="text-ink">Informar, no recomendar.</strong> La plataforma no indica qué votar, no ordena partidos por calidad y no calcula
          afinidades globales. Todas las candidaturas reciben la misma estructura, el mismo espacio y el mismo estilo visual; el orden inicial es alfabético.
        </p>
        <p>
          <strong className="text-ink">Toda afirmación política tiene fuente.</strong> Cada propuesta enlaza a su documento, con la página del PDF y una cita
          literal. Si no hay documento, se muestra «Sin posición documentada», que no equivale a oposición.
        </p>
        <p>
          <strong className="text-ink">Categorías separadas.</strong> Programa 2026, propuesta anunciada en 2026, programa anterior, declaración, iniciativa
          parlamentaria, votación, ley y medida aplicada se etiquetan por separado. En esta versión, ningún partido ha publicado su programa 2026 y todas las
          propuestas proceden de programas anteriores.
        </p>

        <H id="propuestas">Selección y verificación de propuestas</H>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Se descarga el documento original (o su copia archivada en Internet Archive, cuando el original ya no está disponible) y se calcula su huella SHA-256.</li>
          <li>Se extrae el texto de cada página con <code>pdftotext</code> y se normaliza (Unicode NFC, ligaduras tipográficas).</li>
          <li>Una persona selecciona pasajes por tema, copia la cita literal y redacta un resumen que no añade nada que no esté en la cita.</li>
          <li>
            Un test automático (<code>tests/quotes.test.ts</code>) comprueba que <strong className="text-ink">cada cita aparece literalmente en la página indicada</strong>{" "}
            del documento. Si no, el build falla.
          </li>
          <li>Las coincidencias entre partidos (modo «Solo diferencias») se marcan a mano con una clave común, nunca por similitud automática.</li>
          <li>
            El importador de candidatas (<code>scripts/extract-candidates.ts</code>) puede proponer pasajes de un documento nuevo, pero los guarda con estado{" "}
            <code>pendiente_revision</code>: no se publican hasta que una persona los revise.
          </li>
        </ol>
        <p>
          Hoy hay {getProposals().length} propuestas publicadas. Es preferible una base pequeña y verificada a una grande sin evidencia: muchos temas aún no tienen
          propuestas indexadas para todos los partidos.
        </p>
        {thirdParty.length > 0 && (
          <p>
            <strong className="text-ink">Copias de terceros.</strong> {thirdParty.map((s) => s.title).join("; ")}: el servidor oficial bloquea las descargas
            automatizadas y no hay copia archivada. Se usa una copia publicada por un medio, marcada como tal hasta cotejarla con el original.
          </p>
        )}

        <H id="test">Test a ciegas</H>
        <p>
          {getQuiz().length} afirmaciones redactadas para ser neutrales, sin premisas y con una sola idea cada una. Para cada partido se registra una postura
          (a favor, en contra, matizada, sin posición documentada o no comparable) que debe apoyarse en propuestas concretas. «Matizada» indica que la
          propuesta se relaciona con la afirmación pero no la responde directamente; la nota explica por qué. No se calcula ningún porcentaje de
          afinidad global.
        </p>

        <H id="estadistica">Datos estadísticos</H>
        <p>
          {getIndicators().filter((i) => !i.hidden).length} series de la API de Eurostat (formato JSON-stat 2.0), descargadas por <code>scripts/import-eurostat.ts</code>,
          que guarda la URL exacta de cada consulta y la fecha de descarga. No se interpolan ni se estiman valores. Las series derivadas (por ejemplo, el salario
          real) indican su fórmula. Se usa Eurostat por su comparabilidad entre países y comunidades; algunas cifras pueden diferir ligeramente de las
          publicadas por el INE (por ejemplo, IPCA frente a IPC).
        </p>
        <p>
          Los cambios de Gobierno se marcan como contexto, no como causa. Indicadores sin API estable (pensiones de la Seguridad Social, listas de espera,
          precio por metro cuadrado…) figuran como «pendientes de importación», con su fuente oficial.
        </p>

        <H id="votaciones">Votaciones parlamentarias</H>
        <p>
          {getVotes().votes.length.toLocaleString("es-ES")} votaciones del Pleno importadas por <code>scripts/import-congreso.ts</code> a partir de los ficheros oficiales
          (JSON por votación). El desglose por grupo se calcula sumando el voto de cada diputado. El tipo de votación se deduce del epígrafe oficial del orden del
          día; los temas se asignan por palabras clave y son orientativos.
        </p>
        <p>
          Frente Amplio no existía como grupo parlamentario: la actividad del G. P. Plurinacional SUMAR se presenta como antecedente, con su nombre, y no como
          actividad de Frente Amplio. Podemos no tuvo grupo propio; no se le atribuyen automáticamente los votos del Grupo Mixto.
        </p>

        <H id="promesas">Promesas frente a hechos</H>
        <p>
          Cada ficha incluye la cita del compromiso, un criterio de cumplimiento escrito antes de evaluar, las acciones oficiales con su enlace (BOE, Congreso),
          el resultado acreditable y los límites de la evaluación. Los estados se asignan en revisión humana. La muestra actual es pequeña y no sirve para
          comparar el grado de cumplimiento entre partidos.
        </p>

        <H id="limites">Límites conocidos</H>
        <ul className="list-disc space-y-1 pl-5">
          <li>No hay programas de 2026 publicados a fecha de la última comprobación.</li>
          <li>Podemos no tiene programa propio de generales desde 2019; su programa de 2024 es para el Parlamento Europeo.</li>
          <li>La composición exacta de la coalición Frente Amplio está pendiente de documento oficial.</li>
          <li>La copia del programa de Vox procede de un tercero.</li>
          <li>Las votaciones por llamamiento no tienen voto nominal en datos abiertos.</li>
          <li>La plataforma no ha sido auditada externamente ni certificada en accesibilidad o protección de datos.</li>
        </ul>

        <H id="registro">Registro de cambios e importaciones</H>
        <ul className="space-y-1 text-sm">
          {log.map((l, i) => (
            <li key={i} className="font-mono text-xs">
              {formatDate(l.date)} · {l.action} · {l.entity} {l.entityId} — {l.detail}
            </li>
          ))}
          {imports.slice(0, 6).map((l, i) => (
            <li key={`i${i}`} className="font-mono text-xs">
              {formatDate(l.date)} · importación {l.importer}: {l.ok} correctas{l.failures.length ? `, ${l.failures.length} fallos` : ""}
            </li>
          ))}
        </ul>
        <p className="text-sm">
          ¿Has visto un error? El código y los datos están en el repositorio del proyecto; consulta el README. También puedes ver la{" "}
          <Link href="/privacidad">política de privacidad</Link>.
        </p>
      </div>
    </div>
    </>
  );
}
