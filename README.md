# Boletín 29N

Plataforma web independiente para que cualquier persona pueda comparar propuestas documentadas, consultar votaciones del Congreso y explorar datos públicos de España antes de las **elecciones generales del 29 de noviembre de 2026** ([Real Decreto 806/2026](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20742)).

**Informa, no recomienda el voto.** No hay rankings, puntuaciones de afinidad ni colores de partido. Cada afirmación política enlaza a su documento original, con la página y una cita literal.

---


## Versión 2 — rediseño y nuevas funciones (noviembre de 2026)

**Diseño.** Sistema visual «Señal»: Bricolage Grotesque (titulares y cifras) + Manrope (interfaz), superficies claras y frías, tinta profunda y amarillo como color de marca. Modo claro y oscuro. Navegación inferior tipo app en móvil. Información progresiva: tarjetas breves y paneles de detalle con la cita, la fuente y el contexto.

**Colores de partido** (fuente única: `src/lib/party-theme.ts`, replicada en `globals.css` y comprobada por tests): PP `#21599E` (web oficial), PSOE `#EF1C27`, Vox `#63BE21`, Podemos `#5A205A` (color de partido en Wikipedia; sus webs bloquean el acceso automatizado) y Frente Amplio `#E51C55` (color de movimientosumar.es; no hay manual de marca propio de la coalición). Los estados de voto y cumplimiento usan una gama independiente (verde azulado, naranja, gris y ocre).

**Fotografías.** Representantes: Wikimedia Commons con licencia libre (`data/photos.json`, con autor y licencia). Gobierno: retratos oficiales de La Moncloa, cuyo aviso legal autoriza la reproducción citando la fuente (`data/government.json`). No se usan logotipos de partidos.

**Nuevos módulos**
- `/pactos`: encuestas con escaños (`data/polls.json`, recopiladas de Wikipedia con enlace al medio original y revisión fijada) y escenario propio con investidura en 1.ª y 2.ª votación (art. 99 CE), escenarios guardados en `localStorage`. Las horquillas no se convierten en cifras.
- `/promesas` → «Las promesas de 2023: ¿qué se cumplió?»: los 21 compromisos legislativos del programa del PSOE de 2023, contrastados con el registro completo de leyes del BOE de la legislatura (`npm run import:boe` → `data/boe-leyes.json`, 384 normas). Cobertura: 23 de 1.078 frases de compromiso identificadas.
- Test: selección de temas y porcentajes descriptivos por tema (coinciden ÷ comparables, mínimo 2), sin agregación entre temas.
- `/quien-hace-que`: instituciones (Constitución), Gobierno (La Moncloa) y órganos de los partidos según estatutos (PP 2025 y Movimiento Sumar 2023; PSOE, Vox y Podemos pendientes).
- `/puntos-en-comun`: 22 grupos de coincidencias revisados a mano (equivalente / objetivo compartido / parcial), matriz y diagrama.

**Limitaciones de la versión 2**
- Los anuncios personales de Pedro Sánchez no se incluyen todavía (requieren fuentes primarias verificadas).
- Estructura orgánica de PSOE, Vox y Podemos: pendiente (estatutos no accesibles automáticamente).
- Frente Amplio: sin web ni identidad gráfica propia localizada; se usa la de Movimiento Sumar.
- Las encuestas se toman de una recopilación secundaria (Wikipedia) con enlace a cada medio; no se han verificado una a una en el medio original.

## Ejecutar en local

Requisitos: Node.js 20 o superior y npm. Para incorporar documentos PDF nuevos hace falta además `poppler-utils` (`pdftotext`, `pdfinfo`).

```bash
npm install
npm run dev          # http://localhost:3000
# o en modo producción:
npm run build        # ejecuta antes scripts/publish-data.ts (prebuild)
npm start
```

**Variables de entorno:** ninguna es obligatoria. Opcional: `NEXT_PUBLIC_SITE_URL` (URL pública, para los metadatos). No se usan claves de API, servicios de pago ni modelos de IA.

## Pruebas

```bash
npm test                      # 28 pruebas unitarias e integridad de datos (Vitest)
npm run validate              # validación completa de datos
npx playwright install chromium
npm run build && npm run test:e2e   # 7 flujos × escritorio y móvil (Playwright)
npm run links                 # detector de enlaces rotos → data/link-report.json
```

Las pruebas de datos comprueban, entre otras cosas:

- que **cada cita aparece literalmente** en la página indicada del documento (sobre el texto extraído del PDF);
- que **ninguna propuesta se atribuye a un partido distinto** del autor del documento (y que el programa de Sumar 2023 nunca aparece en la columna de Podemos);
- que el comparador funciona con las **26 combinaciones de 2 a 5 partidos** sin mover propuestas de columna;
- que las posturas del test se apoyan en propuestas existentes del mismo partido y que las afirmaciones no nombran partidos;
- que la suma del voto nominal por grupo coincide con los totales oficiales en las 2.188 votaciones.

## Estructura

```
data/                     Datos verificables (fuente de verdad, validados con Zod)
  parties.json            Cinco candidaturas (denominaciones según el BOE de candidaturas)
  coalitions.json         Relación Frente Amplio / Sumar / Podemos
  cycle.json              Convocatoria y estado de los programas 2026
  sources.json            Registro de documentos: URL oficial, copia archivada, SHA-256, verificación
  corpus/                 Texto por página de cada programa (para citas y buscador)
  topics.json             Taxonomía extensible (18 temas, filas comparables)
  proposals.json          Propuestas con cita literal, página y verificación
  quiz.json               Afirmaciones del test y posturas documentadas
  promises.json           Promesas frente a hechos (criterio, acciones oficiales, límites)
  indicators.json         Configuración de las series estadísticas
  stats/                  Series descargadas (generadas por el importador)
  votes/index.json        Votaciones del Congreso (generado)
  events.json             Cambios de Gobierno y acontecimientos (con fuente)
  pending-indicators.json Indicadores sin API estable, pendientes de importador
  glossary.json, changelog.json, import-log.json, link-report.json
public/data/              Ficheros que el navegador carga bajo demanda (generados)
scripts/                  Importadores y mantenimiento
src/lib/                  Modelo (schema.ts), acceso a datos, lógica pura (compare, quiz, series,
                          hemicycle, votes-classify, search, validate)
src/components/           Componentes de interfaz
src/app/                  Rutas (App Router)
tests/  e2e/              Pruebas unitarias y de extremo a extremo
```

## Modelo de datos

Definido y validado en [`src/lib/schema.ts`](src/lib/schema.ts): `Party`, `Coalition`, `ElectoralCycle`, `SourceDocument`, `PolicyTopic`, `Proposal`, `Citation`, `QuizStatement`, `StatisticalIndicator`, `StatisticalObservation` / `SeriesFile`, `ParliamentaryVote`, `ParliamentaryPosition`, `HistoricalPromise` (con `assessment`, que es el *PromiseAssessment*), `VerificationRecord` y `GlossaryEntry`. `ElectoralProgram` se representa como `SourceDocument` de tipo `programa_2026` o `programa_anterior`.

Categorías de procedencia separadas: programa 2026, propuesta anunciada en 2026, programa anterior, declaración, iniciativa parlamentaria, votación, ley, BOE, estadística y fuente periodística.

## Importadores y mantenimiento

| Comando | Qué hace |
|---|---|
| `npm run import:eurostat [id…]` | Descarga las series de Eurostat (API JSON-stat) y guarda la URL exacta y la fecha |
| `npm run import:congreso [AAAAMMDD…]` | Importa las votaciones del Pleno (ZIP/JSON oficiales, con caché en `.cache/`) y el voto nominal |
| `npm run corpus:add <sourceId> <pdf>` | Extrae el texto por página de un PDF nuevo y comprueba su SHA-256 |
| `npm run candidates <sourceId> <tema> "<regex>"` | Propone pasajes **pendientes de revisión** (no se publican) en `data/candidates/` |
| `npm run links` | Detecta enlaces rotos o bloqueados |
| `npm run validate` | Valida todo el conjunto de datos |

### Cuando se publique un programa electoral 2026

1. Registrar el documento en `data/sources.json` con `kind: "programa_2026"`, `cycle: "generales-2026"` y su SHA-256.
2. `npm run corpus:add <id> <ruta.pdf>`.
3. `npm run candidates <id> <tema> "<patrón>"` para obtener pasajes candidatos.
4. Revisar a mano, redactar el resumen, elegir la dimensión y pasar a `data/proposals.json` con `status: "publicado"`.
5. Actualizar `programStatus` en `data/cycle.json` y las posturas afectadas en `data/quiz.json`.
6. `npm test` (falla si alguna cita no está literalmente en su página).

## Fuentes utilizadas

- **BOE**: RD 806/2026 (convocatoria); candidaturas presentadas (BOE-A-2026-22607, 28-10-2026); RDL 8/2023, RDL 1/2025, RDL 3/2026, Ley 21/2021, Ley 12/2023, RDL 32/2021 y RD 463/2020.
- **Congreso de los Diputados**: datos abiertos de votaciones de la XV Legislatura (2.188 votaciones, 411 diputados).
- **Eurostat**: 33 series (PIB, IPCA, deuda, déficit, paro, empleo, temporalidad, salario mínimo, salario medio, vivienda, euríbor, gasto COFOG, demografía, AROPE, Gini, homicidios), con datos regionales NUTS 2 para PIB per cápita, paro y AROPE. Geometría GISCO (© EuroGeographics).
- **Programas** (ver `data/sources.json`): PP 2023, PSOE 2023 y Sumar 2023 (copias del dominio oficial archivadas por Internet Archive); Vox 2023 (copia publicada por The Objective: voxespana.es bloquea las descargas automatizadas); Podemos 2019 (generales) y 2024 (europeas).

## Despliegue (Vercel u otro)

- **Vercel**: importar el repositorio; *build command* `npm run build`; sin variables obligatorias. Genera ~2.200 páginas estáticas.
- **Cualquier servidor Node**: `npm run build && npm start`.
- La actualización de datos se puede programar (por ejemplo, con una tarea diaria de CI) con `npm run import:all && npm test && npm run build`.

## Funcionalidades

**Completadas y verificadas**

- Portada con hero, cuenta atrás, fecha de actualización, buscador, cinco candidaturas en orden alfabético, seis indicadores y aviso de candidaturas no analizadas.
- Comparador de 2 a 5 partidos y 18 temas: reordenación de columnas, modos «Mostrar todo» y «Solo diferencias», URL compartible, panel de fuente (cita, página, documento, competencia, contexto) y carriles horizontales sincronizados en móvil.
- Test a ciegas de 28 afirmaciones y 6 respuestas: saltar, retroceder, revisar, revelar posturas tema a tema sin puntuación global, consultar la fuente y borrar. Respuestas solo en `sessionStorage`, sin peticiones de red (verificado en e2e).
- Observatorio con 32 indicadores en 6 áreas: periodo, comparación de países, cifras absolutas, relativas (base 100) o reales (salario), comparación de años, mapa por comunidad autónoma, tabla, CSV, PNG, URL con filtros, marcas de Gobierno con advertencia de no causalidad, acontecimientos con fuente y ficha metodológica.
- Votaciones: 2.188 votaciones con filtros (texto, tipo, fecha, resultado, tema, grupo y sentido del grupo, grupo dividido), ficha con expediente, enlaces oficiales, hemiciclo interactivo con vista inclinada 3D, desglose por grupo y voto nominal.
- Promesas frente a hechos: 6 fichas con criterio, línea temporal de acciones oficiales, resultado, límites y filtros.
- Fichas de partido con estructura idéntica; biblioteca de fuentes filtrable; buscador documental en el navegador; metodología, privacidad, glosario y página 404.
- Tema claro/oscuro, `prefers-reduced-motion`, navegación por teclado, enlace para saltar al contenido.

**Pendientes / limitaciones**

- Ningún programa 2026 publicado a 2 de noviembre de 2026: todas las propuestas proceden de programas anteriores, identificados como tales.
- 135 propuestas: varios temas no tienen todavía posiciones de todos los partidos («Sin posición documentada»).
- Composición de Frente Amplio: pendiente del documento oficial de la coalición (ahora se apoya en el BOE y en prensa).
- Programa de Vox: copia de un tercero, pendiente de cotejo con el PDF oficial.
- Indicadores sin API (pensiones de la Seguridad Social, listas de espera, precio por m², etc.): listados como pendientes, con su fuente.
- Votaciones por llamamiento (investiduras, RDL 26 y 27/2026): solo totales; el voto nominal está en el Diario de Sesiones.
- Los temas de las votaciones se asignan por palabras clave (orientativos).
- Fase 2 no implementada (por diseño): simuladores, mapa por circunscripción, preguntas con IA, verificador de afirmaciones, exportación a PDF y partidos territoriales. La taxonomía y el modelo admiten nuevos partidos, temas y convocatorias.
- Accesibilidad: objetivo WCAG 2.2 AA, sin auditoría externa. No hay certificación de cumplimiento legal.
