# Boletín 29N

Plataforma de información electoral para las elecciones generales del **29 de noviembre de 2026** ([Real Decreto 806/2026](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20742)). Cubre cinco candidaturas: PP, PSOE, Vox, Frente Amplio y Podemos.

- **Web:** https://marinayjaime.github.io/boletin-29n/
- **Autoría:** los datos y las evaluaciones los preparó un asistente de IA (Claude) a partir de fuentes oficiales. **Ninguna evaluación ha sido revisada todavía por una persona**; cada ficha y cada página lo indican.
- **Principios:** informa y no recomienda el voto. Toda afirmación política enlaza su documento original, con página y cita literal. Las candidaturas tienen el mismo espacio y estilo, en orden alfabético. Cada partido se identifica por su color, su nombre y la foto de su candidato o candidata, nunca solo por el color.

## Estado de los módulos (3 de noviembre de 2026)

| Módulo | Ruta | Estado |
|---|---|---|
| Portada | `/` | Cuenta atrás, candidaturas con foto, última encuesta verificada, accesos |
| Comparador | `/comparador` | 2–5 partidos, 135 propuestas con cita, modo «solo diferencias», URL compartible |
| Test a ciegas | `/test` | 28 preguntas. Resultado: **los cinco partidos por igual**, en orden alfabético, con coincidencias/comparables en total y por tema, y fuentes desplegables |
| Pactos y mayorías | `/pactos` | 16 encuestas contrastadas con el original; escenario propio con simulación de investidura |
| Promesas frente a hechos | `/promesas` | 65 fichas; 62 del PSOE de 2023 sin duplicados: programa (29), acuerdo PSOE–Sumar (43) e investidura de Sánchez (15) — una ficha puede estar en varios |
| Puntos en común | `/puntos-en-comun` | 22 coincidencias revisadas a mano, red y matriz entre partidos |
| ¿Quién hace qué? | `/quien-hace-que` | Mapa de instituciones, organigrama del Gobierno (fotos de La Moncloa), órganos de partido |
| Observatorio | `/observatorio` | 33 series de Eurostat, mapa regional, tabla, CSV y PNG |
| Votaciones | `/votaciones` | 2.188 votaciones del Pleno (XV Legislatura) con voto por grupo y hemiciclo |
| Partidos | `/partidos/[slug]` | Ficha por candidatura: posturas, propuestas y votos del grupo |
| Fuentes | `/fuentes` | Biblioteca filtrable por tipo y partido, con huella SHA-256 |
| Buscador, glosario, metodología, privacidad | | Operativos |

### Resultado del test

Para cada partido, en total y por tema: **coincidencias ÷ respuestas comparables**.

- Una respuesta es comparable si es «de acuerdo» o «en desacuerdo» y el partido tiene una postura documentada a favor o en contra.
- Se muestran los cinco partidos con el mismo formato y en orden alfabético. No hay ganador ni clasificación.
- Cada respuesta con opinión se dibuja como un cuadrado: coincide (relleno), difiere (contorno) o sin información suficiente (rayado). Así se ve cuántas respuestas sostienen cada porcentaje.
- Sin porcentaje global con menos de 4 comparables; aviso de «base pequeña» con menos de 8; por tema, porcentaje desde 2 comparables. Si las bases de los partidos difieren mucho, se avisa.
- Cada casilla de la matriz abre las preguntas, tu respuesta, la postura del partido y sus fuentes.
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

- **Tres documentos del PSOE de 2023:** programa electoral (julio), acuerdo de Gobierno PSOE–Sumar «España avanza» (octubre; `acuerdo-psoe-sumar-2023`, 48 págs., copia archivada del PDF de psoe.es) y discurso de investidura de Sánchez (Diario de Sesiones, 15-11-2023). Un compromiso repetido es una sola ficha con todas sus citas (`alsoIn`); la validación impide usar la misma cita en dos fichas.
- **Naturaleza:** exige una ley, medida del Gobierno, resultado medible o acción internacional.
- **Antes de declarar «no cumplido»** se busca en el **texto íntegro** de las normas estatales con rango de ley de la legislatura (`scripts/boe-fulltext.ts`), no solo en los títulos. Así aparecieron dos casos que cambiaron: las zonas de aceleración renovable del RDL 7/2026 (ahora «parcial») y la regulación de grupos de interés del RDL 21/2026 (sigue «no cumplido» porque el Congreso no lo convalidó).
- **El registro del BOE distingue ámbito:** de las normas no reglamentarias publicadas entre el 17-11-2023 y el 2-11-2026, 97 son estatales (92 hasta la disolución) (21 leyes, 13 orgánicas, 62 reales decretos-leyes, 1 reforma constitucional) y 288 son leyes autonómicas publicadas en el BOE.
- **Un real decreto-ley solo cuenta si se convalidó** (lo comprueba la validación con las votaciones del Pleno).
- Una medida ejecutiva o un resultado sin datos oficiales queda «no verificable». Cada ficha lista **qué se ha comprobado**.
- **Estado de revisión** (`assessment.review`): `pendiente` (preparada por IA), `revisada` o `corregida`. Para marcarla como revisada hacen falta `reviewedBy` (una persona identificada, distinta de quien la preparó y que no sea un sistema automático) y `reviewedAt`; la validación lo exige. Hoy las 65 están pendientes.
- La transformación editorial está en `scripts/editorial/2026-11-03-acuerdo-y-revision.py` (reproducible e idempotente).

## Limitaciones conocidas

- PP y Vox han publicado su programa de 2026 (registrados en `data/sources.json` y en el corpus; el de Vox, en copia de un medio), pero sus propuestas aún no están extraídas: las que se muestran proceden de programas anteriores (PP, PSOE y Sumar 2023; Vox 2023 en copia de un medio; Podemos 2019 y europeas 2024). PSOE, Frente Amplio y Podemos no tenían programa localizable el 13 de noviembre de 2026.
- Las evaluaciones, propuestas, posturas del test y puntos en común los preparó un asistente de IA y están pendientes de revisión humana.
- psoe.es bloquea las descargas automatizadas: el acuerdo PSOE–Sumar se toma de la copia del mismo PDF en Internet Archive.
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
npm test              # 70 pruebas unitarias y de integridad en 8 ficheros (Vitest)
npm run build && npm run test:e2e   # 8 flujos × escritorio y móvil = 16 pruebas (Playwright)
npm run links         # enlaces rotos → data/link-report.json
```

Entre otras cosas, las pruebas comprueban:

- que cada cita aparece literalmente en la página indicada;
- que ninguna propuesta se atribuye a otro partido;
- las 26 combinaciones del comparador;
- que la suma del voto por grupo coincide con los totales oficiales;
- que las encuestas suman 350 escaños (contando los no publicados) y que solo las completas y verificadas sirven de escenario;
- el resultado del test (cinco partidos, bases visibles, sin ganador);
- las reglas de revisión humana, la convalidación de los reales decretos-leyes y la ausencia de citas duplicadas;
- que toda referencia al BOE de una promesa existe en el registro;
- el contraste y la unicidad de los colores de partido.

## Actualización de datos

### Automática: `.github/workflows/update-data.yml`, cada día a las 06:15 UTC

1. **Datos objetivos, que se publican solos:**
   - series de Eurostat (`npm run import:eurostat`);
   - registro del BOE en modo incremental (`npx tsx scripts/import-boe-leyes.ts --incremental`);
   - informe de enlaces.

   Además se descarga el texto íntegro de las normas nuevas (`scripts/boe-fulltext.ts`, con caché) y se marca si son estatales o autonómicas.

   Solo se publican si pasan `validate` y `npm test`. Los cambios que afectan solo a marcas de tiempo se descartan. Cada cambio se anota en `data/changelog.json` (`scripts/log-changes.ts`) y después se lanza el despliegue (`pages.yml`).
2. **Datos que requieren interpretación, que nunca se publican solos:**
   - `scripts/check-polls.ts`: encuestas añadidas en Wikipedia desde la revisión de referencia;
   - `scripts/check-government.ts`: altas, bajas y cambios de cargo en La Moncloa;
   - `scripts/check-programs.ts`: posibles programas de 2026 en las webs de `data/watch.json`;
   - enlaces rotos.

   Los informes van a `data/review/` (ignorado por git), y `scripts/review-summary.ts` abre o actualiza una incidencia con la etiqueta `revision-datos`. Cuando no queda nada pendiente, la incidencia se cierra sola.

### Estado de los datos

`data/data-status.json` guarda, para cada conjunto, el último intento, la **última actualización correcta**, el **último error** (fecha y mensaje) y, aparte, la **última revisión editorial** (quién y si fue humana). Lo actualizan los importadores y los vigilantes (`scripts/lib/status.ts`) aunque fallen; si una importación falla, la web conserva los datos anteriores y el fallo se anota también en `data/import-log.json` y en el registro de cambios. Cada página muestra las dos fechas por separado, y la metodología, la tabla completa.

### Manual (revisión humana)

- **Revisar una evaluación:** comprobar la ficha contra sus fuentes y escribir en `assessment.review` `status: "revisada"` (o `"corregida"` si cambia), `reviewedBy` (nombre y cargo) y `reviewedAt`. Actualizar `editorial.promises` en `data/data-status.json` cuando corresponda.

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
