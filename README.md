# Boletín 29N

Plataforma de información electoral para las elecciones generales del **29 de noviembre de 2026** ([Real Decreto 806/2026](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20742)). Cubre cinco candidaturas: PP, PSOE, Vox, Frente Amplio y Podemos.

- **Web:** https://marinayjaime.github.io/boletin-29n/
- **Principios:** informa y no recomienda el voto. Toda afirmación política enlaza su documento original, con página y cita literal. Las candidaturas tienen el mismo espacio y estilo, en orden alfabético. Cada partido se identifica por su color, su nombre y la foto de su candidato o candidata, nunca solo por el color.

## Estado de los módulos (3 de noviembre de 2026)

| Módulo | Ruta | Estado |
|---|---|---|
| Portada | `/` | Cuenta atrás, candidaturas con foto, última encuesta verificada, accesos |
| Comparador | `/comparador` | 2–5 partidos, 135 propuestas con cita, modo «solo diferencias», URL compartible |
| Test a ciegas | `/test` | 28 preguntas. Resultado: **solo el partido con mayor coincidencia global** (empates juntos), detalle por pregunta plegado |
| Pactos y mayorías | `/pactos` | 16 encuestas contrastadas con el original; escenario propio con simulación de investidura |
| Promesas frente a hechos | `/promesas` | 45 fichas; 41 del PSOE 2023: programa (29) y anuncios de Sánchez en la investidura (12) |
| Puntos en común | `/puntos-en-comun` | 22 coincidencias revisadas a mano, red y matriz entre partidos |
| ¿Quién hace qué? | `/quien-hace-que` | Mapa de instituciones, organigrama del Gobierno (fotos de La Moncloa), órganos de partido |
| Observatorio | `/observatorio` | 33 series de Eurostat, mapa regional, tabla, CSV y PNG |
| Votaciones | `/votaciones` | 2.188 votaciones del Pleno (XV Legislatura) con voto por grupo y hemiciclo |
| Partidos | `/partidos/[slug]` | Ficha por candidatura: posturas, propuestas y votos del grupo |
| Fuentes | `/fuentes` | Biblioteca filtrable por tipo y partido, con huella SHA-256 |
| Buscador, glosario, metodología, privacidad | | Operativos |

### Cálculo del test

Para cada partido: **coincidencias ÷ respuestas comparables**, sumando todas las preguntas respondidas.

- Una respuesta es comparable si es «de acuerdo» o «en desacuerdo» y el partido tiene una postura documentada a favor o en contra.
- Hacen falta al menos 4 respuestas comparables.
- Solo se muestra el partido con la proporción más alta. Si hay un empate exacto, se muestran todos los empatados.
- Las respuestas se guardan en `sessionStorage` y no se envían a ningún sitio (lo comprueban los tests de navegador).

### Encuestas

Cada una de las 16 encuestas se ha contrastado con su publicación original. Resultado:

| Resultado | Encuestas |
|---|---|
| Verificadas | 3 |
| Corregidas con el original | 1 (Hamalgama) |
| Horquilla | 1 |
| Encargada por un partido (Vox), señalada | 1 |
| Reparto parcial | 8 |
| No verificables | 2 |

Solo las verificadas o corregidas que tienen los 350 escaños repartidos sirven de escenario principal (`isMainScenario`). Los repartos parciales no se completan y las horquillas no se convierten en cifras.

### Promesas

Cada ficha indica su **procedencia** y su **naturaleza**.

- **Procedencia:** programa electoral, declaración de Sánchez en la investidura (Diario de Sesiones, 15-11-2023) o acuerdo de Gobierno.
- **Naturaleza:** exige una ley, es una medida del Gobierno (decreto, plan o presupuesto), es un resultado medible o es una acción internacional.
- **Regla:** solo un compromiso que exige aprobar una ley puede marcarse «no cumplido» por ausencia de norma. Se contrasta con el registro completo del BOE de la legislatura: 384 normas con rango de ley y 3.938 reales decretos. Una medida ejecutiva sin pruebas queda como «no verificable».
- La regla la aplican `src/lib/validate.ts` y los tests.

## Limitaciones conocidas

- Ningún partido ha publicado aún su programa de 2026: las propuestas proceden de programas anteriores (PP, PSOE y Sumar 2023; Vox 2023 en copia de un medio; Podemos 2019 y europeas 2024).
- No se ha localizado el texto íntegro del acuerdo de coalición PSOE–Sumar en una fuente oficial, así que no hay fichas de esa procedencia.
- Algunas promesas siguen como «no verificables»: alivio hipotecario hasta 38.000 €, avales del 20 %, 183.000 viviendas, becas y pensiones mínimas. Faltan datos presupuestarios o estadísticos oficiales.
- Las webs de PSOE, Vox y Podemos bloquean el acceso automatizado. Sus colores se toman de Wikipedia y los cambios en ellas se revisan a mano.
- El rojo del PSOE se ha oscurecido levemente (#ef1c27 → #e01b26) para que el texto blanco cumpla un contraste de 4,5:1.
- Las votaciones por llamamiento no tienen voto nominal en los datos abiertos.
- No hay auditoría externa. La accesibilidad se ha comprobado con axe-core (WCAG 2 A/AA) en todas las páginas, sin una auditoría manual completa.

## Ejecutar en local

Requisitos: Node.js 20 o superior. Para incorporar PDF nuevos hace falta además `poppler-utils`.

```bash
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # producción (prebuild publica los datos en public/data)
```

No se usan claves de API ni servicios de pago.

## Pruebas

```bash
npm run validate      # validación de datos (Zod + reglas editoriales)
npm test              # 54 pruebas unitarias y de integridad en 7 ficheros (Vitest)
npm run build && npm run test:e2e   # 8 flujos × escritorio y móvil = 16 pruebas (Playwright)
npm run links         # enlaces rotos → data/link-report.json
```

Entre otras cosas, las pruebas comprueban:

- que cada cita aparece literalmente en la página indicada;
- que ninguna propuesta se atribuye a otro partido;
- las 26 combinaciones del comparador;
- que la suma del voto por grupo coincide con los totales oficiales;
- que las encuestas suman 350 escaños (contando los no publicados) y que solo las completas y verificadas sirven de escenario;
- el cálculo global del test y el tratamiento de los empates;
- que toda referencia al BOE de una promesa existe en el registro;
- el contraste y la unicidad de los colores de partido.

## Actualización de datos

### Automática: `.github/workflows/update-data.yml`, cada día a las 06:15 UTC

1. **Datos objetivos, que se publican solos:**
   - series de Eurostat (`npm run import:eurostat`);
   - registro del BOE en modo incremental (`npx tsx scripts/import-boe-leyes.ts --incremental`);
   - informe de enlaces.

   Solo se publican si pasan `validate` y `npm test`. Los cambios que afectan solo a marcas de tiempo se descartan. Cada cambio se anota en `data/changelog.json` (`scripts/log-changes.ts`) y después se lanza el despliegue (`pages.yml`).
2. **Datos que requieren interpretación, que nunca se publican solos:**
   - `scripts/check-polls.ts`: encuestas añadidas en Wikipedia desde la revisión de referencia;
   - `scripts/check-government.ts`: altas, bajas y cambios de cargo en La Moncloa;
   - `scripts/check-programs.ts`: posibles programas de 2026 en las webs de `data/watch.json`;
   - enlaces rotos.

   Los informes van a `data/review/` (ignorado por git), y `scripts/review-summary.ts` abre o actualiza una incidencia con la etiqueta `revision-datos`. Cuando no queda nada pendiente, la incidencia se cierra sola.

### Manual (revisión humana)

- **Encuesta nueva:** leer el original y añadirla a `data/polls.json` con `verification` (método y notas). Si el reparto no está completo, rellenar `unpublishedSeats`. Al aceptar los cambios de Wikipedia, actualizar `aggregator.revision`.
- **Cambio de Gobierno:** editar `data/government.json`, con foto y fecha.
- **Programa de 2026:**
  1. Registrarlo en `data/sources.json` (`kind: "programa_2026"`, con su SHA-256).
  2. Ejecutar `npm run corpus:add <id> <pdf>`.
  3. Ejecutar `npm run candidates <id> <tema> "<patrón>"`.
  4. Revisar a mano y pasar a `data/proposals.json`.
  5. Actualizar `data/cycle.json` y `data/quiz.json`.
- **Promesa:** añadirla a `data/promises.json` con `origin`, `nature`, criterio, acciones oficiales y límites. La cita debe estar en el corpus.
- Siempre: `npm run validate && npm test` antes de publicar.

## Estructura

```
data/            Datos (fuente de verdad): parties, sources (+ corpus/), proposals, quiz, promises,
                 polls, government, organization, commonalities, boe-leyes, indicators (+ stats/),
                 votes/, events, glossary, changelog, watch
scripts/         Importadores, vigilantes (check-*), registro de cambios, validación
src/lib/         Modelo (schema.ts) y lógica pura: seats, quiz, compare, common, series, validate…
src/components/  Interfaz (hemiciclo, comparador, test, pactos, promesas…)
src/app/         Rutas (App Router, exportación estática)
tests/ e2e/      Vitest y Playwright
```

## Despliegue

GitHub Pages con `.github/workflows/pages.yml`: se despliega con cada push a `main`, tras pasar los tests. Hace una exportación estática con `STATIC_EXPORT=1` y `NEXT_PUBLIC_BASE_PATH=/boletin-29n` (unas 2.200 páginas).

## Fuentes principales

- **BOE:** convocatoria (RD 806/2026), candidaturas (BOE-A-2026-22607) y registro de normas de la XV Legislatura (API de sumarios).
- **Congreso:** datos abiertos de votaciones y Diario de Sesiones DSCD-15-PL-7 (investidura).
- **Eurostat:** 33 series (JSON-stat), con geometría GISCO © EuroGeographics.
- **La Moncloa:** composición del Gobierno y fotografías.
- **Wikimedia Commons:** fotos de las candidaturas, con licencia indicada.
- **Encuestas:** publicaciones originales de cada empresa o medio; Wikipedia solo se usa para detectar encuestas nuevas.

Hecho por Jaime Borras.
