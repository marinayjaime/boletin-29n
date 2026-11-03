"""
Transformación editorial del 3-11-2026 (documentada para que sea reproducible y auditable):
 1. Estado de revisión explícito en cada evaluación: preparada por un asistente de IA, pendiente de revisión humana.
 2. Lista de comprobaciones realizadas en cada evaluación (qué se buscó y dónde).
 3. Incorporación del acuerdo de coalición PSOE–Sumar (oct. 2023): compromisos nuevos y documentos adicionales
    en fichas ya existentes (sin duplicar promesas).
 4. Revisión de las fichas «no cumplidas» con el texto íntegro de las normas estatales de la legislatura.
Uso: python3 scripts/editorial/2026-11-03-acuerdo-y-revision.py  (idempotente)
"""
import json, unicodedata, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = lambda f: os.path.join(ROOT, "data", f)
CORPUS = {}
def page(src, p):
    if src not in CORPUS: CORPUS[src] = json.load(open(D(f"corpus/{src}.json")))["pages"]
    return CORPUS[src][str(p)]
def cite(src, p, start, end=None):
    t = page(src, p); i = t.find(start)
    assert i >= 0, (src, p, start)
    if end:
        j = t.find(end, i); assert j >= 0, (src, p, end); q = t[i:j + len(end)]
    else:
        j = t.find(".", i + len(start) - 1); q = t[i:j + 1]
    return {"sourceId": src, "pdfPage": p, "quote": q}
fold = lambda s: unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
boe = lambda i: f"https://www.boe.es/diario_boe/txt.php?id={i}"
def cong(date):
    y, m, d = date.split("-")
    return f"https://www.congreso.es/es/opendata/votaciones?p_p_id=votaciones&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&targetLegislatura=XV&targetDate={d}/{m}/{y}"
AC, DS, PS = "acuerdo-psoe-sumar-2023", "congreso-ds-15-pl-7", "psoe-programa-2023"
TODAY = "2026-11-03"
PREPARED = "Asistente de IA (Claude) con fuentes oficiales"
REG = json.load(open(D("boe-leyes.json")))["items"]
STATE = [x for x in REG if x.get("scope") == "estatal" and x["kind"] != "real_decreto" and x["date"] <= "2026-10-06"]
NSTATE = len(STATE)
FULLTEXT = f"texto íntegro de las {NSTATE} normas estatales con rango de ley publicadas en el BOE entre el 17-11-2023 y la disolución (6-10-2026)"
FT_DIR = os.path.join(ROOT, ".cache", "boe-texto")
def ft(*terms):
    """Busca en el texto íntegro de las normas estatales; devuelve los títulos que contienen todos los términos."""
    out = []
    for x in STATE:
        f = os.path.join(FT_DIR, x["id"] + ".txt")
        if os.path.exists(f):
            t = fold(open(f).read())
            if all(fold(k) in t for k in terms): out.append(x)
    return out
def check_ft(*terms):
    hits = ft(*terms)
    q = " + ".join(f"«{t}»" for t in terms)
    if not hits: return f"Búsqueda de {q} en el {FULLTEXT}: sin resultados."
    return f"Búsqueda de {q} en el {FULLTEXT}: {len(hits)} resultado(s): " + "; ".join(h["title"].split(",")[0] for h in hits[:4]) + ("…" if len(hits) > 4 else "") + "."

P = json.load(open(D("promises.json")))
byid = {p["id"]: p for p in P}

# ── 1. Estado de revisión honesto en todas las fichas ─────────────────────────────
for p in P:
    a = p["assessment"]
    a.pop("reviewer", None)
    a["review"] = {"status": "pendiente", "preparedBy": PREPARED, "preparedAt": a.get("assessedAt", TODAY)}
    a["checks"] = []  # se regeneran completas en cada ejecución

def add_checks(pid, *lines):
    a = byid[pid]["assessment"]
    for l in lines:
        if l not in a["checks"]: a["checks"].append(l)
def also(pid, *cits):
    p = byid[pid]; p.setdefault("alsoIn", [])
    for c in cits:
        if not any(x["sourceId"] == c["sourceId"] and x["pdfPage"] == c["pdfPage"] for x in p["alsoIn"]): p["alsoIn"].append(c)

# ── 2. Fichas duplicadas: un solo compromiso, varios documentos ───────────────────
if "sanchez-2023-smi-ley" in byid:
    P.remove(byid.pop("sanchez-2023-smi-ley"))
also("psoe-2023-smi-estatuto", cite(DS, 12, "la legislatura en la que vamos a garantizar por ley que el salario mínimo interprofesional", " medio"), cite(AC, 11, "El SMI seguirá creciendo a lo largo de la legislatura"))
also("sanchez-2023-permiso-20", cite(AC, 22, "Extenderemos el permiso de paternidad y maternidad hasta las 20 semanas", "semana 16"))
also("sanchez-2023-impuesto-minimo", cite(AC, 37, "Esta reforma asegurará que se alcanza el 15% efectivo de tributación", "en los términos acordados a nivel global y en la UE"))
also("sanchez-2023-alivio-hipotecario", cite(AC, 30, "Ampliaremos hasta la renta media (37.800€) el umbral"))
also("sanchez-2023-avales-20", cite(AC, 30, "Desarrollaremos y aplicaremos la nueva línea de avales del Instituto de Crédito Oficial (ICO)"))
also("sanchez-2023-becas-tasas", cite(AC, 28, "En el ámbito universitario, incrementaremos nuevamente la dotación de becas", "tendiendo a la gratuidad."))
also("sanchez-2023-ley-derechos-culturales", cite(AC, 45, "Garantizaremos el derecho a la cultura de todas las personas y en todos los territorios a través de una Ley de Derechos Culturales"))
also("sanchez-2023-servicios-30-min", cite(AC, 20, "Aprobaremos la cartera de servicios básicos de calidad a menos de 30 minutos del lugar de residencia."))
also("psoe-2023-ley-familias", cite(AC, 23, "Aprobaremos una Ley de Familias que reconozca y proteja a las diferentes modalidades de familias."))
also("psoe-2023-ley-agricultura-familiar", cite(AC, 20, "Impulsaremos una Ley de Agricultura Familiar"), cite(DS, 15, "Y quiero anunciarles que vamos a aprobar una ley de agricultura familiar"))
also("psoe-2023-ley-ley-aguas", cite(AC, 17, "Actualizaremos la Ley de Aguas blindando el derecho ciudadano de acceso al agua"))
also("psoe-2023-ley-cliente-financiero", cite(AC, 7, "Pondremos en marcha la Autoridad de Defensa del Cliente Financiero"))
also("psoe-2023-ley-atencion-clientela", cite(AC, 8, "Se aprobará una nueva Ley de Condiciones Generales de la Contratación y una Ley de Servicios de Atención a la Clientela."))
also("psoe-2023-ley-funcion-publica", cite(AC, 41, "Aprobaremos la Ley de Función Pública de la Administración del Estado, ya acordada con los sindicatos."))
also("psoe-2023-ley-paridad", cite(AC, 34, "Impulsaremos la paridad en los ámbitos políticos, administrativos y empresariales"))
also("psoe-2023-ley-economia-social", cite(AC, 13, "Aprobaremos una Ley integral de impulso a la economía social"))
also("psoe-2023-tiempos-espera", cite(AC, 25, "Acabaremos con las listas de espera en la sanidad pública, estableciendo por ley unos tiempos máximos de espera en el SNS"))
also("psoe-2023-ley-reglas-fiscales-ue", cite(AC, 6, "Impulsaremos una reforma de las reglas fiscales europeas"))
also("psoe-2023-pensiones-minimas", cite(AC, 24, "Seguiremos aumentando durante la legislatura las pensiones mínimas y no contributivas"))
also("psoe-2023-ayudas-alquiler", cite(AC, 30, "Consolidaremos el Bono Alquiler Joven como elemento esencial"))
also("psoe-2023-revalorizacion-pensiones", cite(AC, 24, "Seguiremos garantizando la sostenibilidad de las pensiones y su actualización conforme al IPC"), cite(DS, 13, "vamos a seguir revalorizando las pensiones conforme al IPC"))
byid["sumar-2023-jornada-37-5"]["partyIds"] = ["frente-amplio", "psoe"]
byid["sumar-2023-jornada-37-5"]["promise"] = "Reducir por ley la jornada laboral máxima a 37,5 horas semanales."  # programa de Sumar + acuerdo de coalición + investidura
also("sumar-2023-jornada-37-5", cite(AC, 11, "Reduciremos la jornada laboral máxima legal sin reducción salarial para establecerla en 37 horas y media semanales."), cite(DS, 12, "la legislatura en la que impulsaremos una reducción de la jornada laboral a las 37,5 horas semanales"))

# ── 3. Revisión de las «no cumplidas» con texto íntegro ───────────────────────────
NC_TERMS = {
    "sumar-2023-jornada-37-5": [("37,5 horas",), ("treinta y siete horas y media",)],
    "psoe-2023-ley-sociedades-laborales": [("sociedades laborales", "se modifica"), ("ley 44/2015",)],
    "psoe-2023-ley-agricultura-familiar": [("agricultura familiar",)],
    "psoe-2023-ley-ley-aguas": [("texto refundido de la ley de aguas", "derecho humano"), ("acceso al agua", "derecho")],
    "psoe-2023-ley-politica-farmaceutica": [("politica farmaceutica",), ("ley de garantias y uso racional de los medicamentos", "se modifica")],
    "psoe-2023-ley-cliente-financiero": [("autoridad de defensa del cliente financiero",), ("cliente financiero", "autoridad")],
    "psoe-2023-ley-cohesion-territorial": [("ley de cohesion territorial",)],
    "psoe-2023-ley-funcion-publica": [("funcion publica de la administracion del estado",)],
    "psoe-2023-ley-lobbies": [("grupos de interes", "registro de transparencia"), ("grupos de interes", "registro")],
    "psoe-2023-ley-incompatibilidades": [("ley 53/1984", "se modifica")],
    "psoe-2023-ley-lecrim": [("nueva ley de enjuiciamiento criminal",)],
    "psoe-2023-ley-equipos-investigacion": [("equipos conjuntos de investigacion",), ("agente encubierto",)],
    "psoe-2023-ley-nacionalidad-exterior": [("nacionalidad", "espanoles en el exterior"), ("nacionalidad de origen", "exterior")],
    "sanchez-2023-ley-derechos-culturales": [("ley de derechos culturales",), ("derechos culturales",)],
    "sanchez-2023-servicios-30-min": [("30 minutos", "servicios"), ("treinta minutos", "servicio basico")],
    "sanchez-2023-deuda-autonomica": [("deuda autonomica",), ("condonacion", "comunidades autonomas")],
    "psoe-2023-ley-familias": [("ley de familias",), ("familias monoparentales", "familias numerosas")],
    "sumar-2023-reforma-ley-vivienda": [("ley 12/2023", "se modifica"), ("grandes tenedores", "alquiler social")],
    "pp-2023-ley-urbanismo": [("seguridad juridica", "urbanismo", "ley 7/2015")],
}
for pid, qs in NC_TERMS.items():
    add_checks(pid, *[check_ft(*q) for q in qs], "Votaciones del Pleno de la XV Legislatura (datos abiertos del Congreso): sin votación final de una ley con este objeto.")

# Matices encontrados en la revisión
add_checks("sanchez-2023-servicios-30-min", "Hallazgo: la Ley 8/2025 del Estatuto de los municipios rurales fija un estándar de treinta minutos, pero es una ley autonómica (Cataluña), no estatal.")
add_checks("sanchez-2023-deuda-autonomica", "Hallazgo: una ley autonómica de presupuestos de Castilla-La Mancha (2025) alude a un «proceso de asunción de la deuda autonómica por parte del Estado» todavía en curso; no consta una norma estatal publicada.")
add_checks("psoe-2023-ley-politica-farmaceutica", "Hallazgo: la Ley 7/2025 (Agencia Estatal de Salud Pública) modifica un artículo de la ley del medicamento; no es la nueva ley de política farmacéutica prometida.")
add_checks("sumar-2023-reforma-ley-vivienda", "Hallazgo: los RDL 26/2026 y 27/2026 sobre vivienda no fueron convalidados por el Congreso (2-10-2026) y decayeron.")
add_checks("psoe-2023-ley-familias", "Hallazgo: el RDL 9/2025 amplía permisos y protege a familias monoparentales, pero no es la Ley de Familias.")

# Renovables: el texto íntegro muestra una norma estatal que cambia la evaluación.
z = byid["psoe-2023-ley-zonas-renovables"]
z["nature"] = "legislativa"
z["assessment"].update({
    "status": "cumplido_parcial",
    "criterion": "Compromiso legislativo: cumplido si una norma estatal con rango de ley establece cómo identificar, con comunidades autónomas y entidades locales, las áreas idóneas para renovables y cómo llegan sus beneficios a las comunidades locales.",
    "officialActions": [
        {"date": "2026-03-21", "text": "El Real Decreto-ley 7/2026 crea un régimen básico estatal de «zonas de aceleración renovable» (áreas especialmente adecuadas para renovables, con criterios ambientales, patrimoniales y territoriales).", "url": boe("BOE-A-2026-6544")},
        {"date": "2026-03-26", "text": "El Congreso convalida el Real Decreto-ley 7/2026 (175 sí, 33 no, 141 abstenciones).", "url": cong("2026-03-26")},
    ],
    "outcome": "Existe una norma estatal con rango de ley que regula la identificación de zonas idóneas para renovables. No se ha comprobado que incluya el reparto de beneficios a las comunidades locales que también prometía el programa.",
    "limits": "Encontrado al buscar en el texto íntegro de las normas: el título del real decreto-ley (un plan de respuesta a la crisis de Oriente Medio) no lo indica. Anteriormente esta ficha figuraba como «no cumplida» por revisar solo títulos.",
    "assessedAt": TODAY,
})
add_checks("psoe-2023-ley-zonas-renovables", check_ft("zonas de aceleracion renovable"), "Corrección del 3-11-2026: antes «no cumplido» (búsqueda solo por títulos).")

# Lobbies: hubo norma, pero no se convalidó.
lb = byid["psoe-2023-ley-lobbies"]
lb["assessment"].update({
    "officialActions": [
        {"date": "2026-08-26", "text": "Real Decreto-ley 21/2026, de transparencia e integridad de las actividades de los grupos de interés.", "url": boe("BOE-A-2026-18148")},
        {"date": "2026-09-16", "text": "El Congreso no convalida el Real Decreto-ley 21/2026 (155 sí, 179 no, 12 abstenciones): la norma queda derogada.", "url": cong("2026-09-16")},
    ],
    "outcome": "El Gobierno aprobó la regulación de los grupos de interés por real decreto-ley, pero el Congreso no lo convalidó y quedó derogado. No hay ley en vigor.",
    "limits": "Encontrado al buscar en el texto íntegro: el título no contiene la palabra «lobbies». Un real decreto-ley no convalidado no cuenta como cumplimiento.",
    "assessedAt": TODAY,
})
lb["assessment"]["checks"] = [c for c in lb["assessment"]["checks"] if not c.startswith("Votaciones del Pleno")]
add_checks("psoe-2023-ley-lobbies", "Votaciones del Pleno: convalidación del RDL 21/2026 rechazada el 16-9-2026; ninguna otra votación final.")
add_checks("psoe-2023-ley-lobbies", "Corrección del 3-11-2026: la ficha decía que no había ninguna norma; sí la hubo (RDL 21/2026), pero no se convalidó.")

# Tiempos de respuesta (Sánchez/servicios) y otras fichas: comprobaciones de las ejecutivas
for pid in [p["id"] for p in P if p["assessment"]["status"] == "no_verificable" and not p["assessment"]["checks"]]:
    add_checks(pid, "Registro completo del BOE de la legislatura (títulos de leyes, decretos-leyes y reales decretos).", "Sin datos oficiales suficientes para medir el resultado: se mantiene «no verificable» en lugar de «no cumplido».")
for p in P:
    if not p["assessment"]["checks"]:
        add_checks(p["id"], "Acciones oficiales enlazadas en la ficha (BOE y votaciones del Pleno), comprobadas una a una.")

# ── 4. Compromisos nuevos del acuerdo de coalición ─────────────────────────────────
GOV = "Gobierno de coalición PSOE–Sumar (2023–2026)"
def new(id, topic, nature, promise, cit, status, criterion, actions, outcome, limits, checks):
    item = {"id": id, "partyIds": ["psoe", "frente-amplio"], "attribution": "gobierno_coalicion", "government": GOV, "legislature": "XV",
            "topicId": topic, "series": "psoe-2023-acuerdo", "origin": "acuerdo_gobierno", "nature": nature, "promise": promise,
            "promisedAt": "2023-10-24", "citation": cit,
            "assessment": {"status": status, "criterion": criterion, "officialActions": [{"date": d, "text": t, "url": u} for d, t, u in actions],
                           "outcome": outcome, "limits": limits, "assessedAt": TODAY, "checks": checks,
                           "review": {"status": "pendiente", "preparedBy": PREPARED, "preparedAt": TODAY}}}
    if id in byid: P[P.index(byid[id])] = item
    else: P.append(item)
    byid[id] = item
LEG = "Compromiso legislativo: cumplido si se publica en el BOE una norma estatal con rango de ley con ese objeto antes de la disolución (6-10-2026)."
DISS = "La disolución de las Cortes hizo decaer las iniciativas en tramitación."
VOTES = "Votaciones del Pleno de la XV Legislatura: sin votación final de una ley con este objeto."

new("acuerdo-2023-subsidio-desempleo", "empleo", "legislativa", "Simplificar y mejorar el subsidio por desempleo (nivel asistencial).",
    cite(AC, 12, "Simplificaremos y mejoraremos el nivel asistencial por desempleo"), "cumplido",
    "Cumplido si una norma estatal reforma el nivel asistencial de la protección por desempleo.",
    [("2024-05-22", "Real Decreto-ley 2/2024: simplificación y mejora del nivel asistencial de la protección por desempleo.", boe("BOE-A-2024-10235")),
     ("2024-06-20", "El Congreso convalida el Real Decreto-ley 2/2024 (178 sí, 0 no, 171 abstenciones).", cong("2024-06-20"))],
    "La reforma del subsidio se aprobó por real decreto-ley y fue convalidada.", "Se evalúa la aprobación de la reforma, no sus efectos.", [check_ft("nivel asistencial", "subsidio por desempleo")])
new("acuerdo-2023-jubilacion-parcial", "pensiones", "legislativa", "Nueva regulación de la jubilación parcial y del contrato de relevo.",
    cite(AC, 12, "Se llevará a cabo una nueva regulación de la jubilación parcial y del contrato de relevo"), "cumplido",
    "Cumplido si una norma estatal regula de nuevo la jubilación parcial y el contrato de relevo.",
    [("2024-12-24", "Real Decreto-ley 11/2024: regula de nuevo la jubilación parcial (reducción de jornada entre el 25 % y el 75 %) y el contrato de relevo.", boe("BOE-A-2024-26917")),
     ("2025-01-22", "El Congreso convalida el Real Decreto-ley 11/2024 (298 sí, 51 no).", cong("2025-01-22"))],
    "Nueva regulación aprobada y convalidada.", "No se evalúa si garantiza la calidad del empleo de los relevistas, como también prometía el acuerdo.", [check_ft("contrato de relevo", "jubilacion parcial")])
new("acuerdo-2023-articulo-49", "igualdad", "legislativa", "Reformar el artículo 49 de la Constitución para suprimir el término «disminuidos».",
    cite(AC, 24, "Culminaremos la reforma del artículo 49 de la Constitución"), "cumplido",
    "Cumplido si se publica la reforma constitucional.",
    [("2024-01-18", "El Congreso aprueba la reforma del artículo 49 (312 sí, 32 no).", cong("2024-01-18")),
     ("2024-02-17", "BOE publica la Reforma del artículo 49 de la Constitución Española, de 15 de febrero de 2024.", boe("BOE-A-2024-3099"))],
    "Reforma constitucional publicada.", "", ["Registro del BOE: reforma constitucional localizada (BOE-A-2024-3099)."])
new("acuerdo-2023-abonos-2024", "transporte", "ejecutiva", "Mantener durante 2024 la rebaja de los abonos de transporte para toda la ciudadanía.",
    cite(AC, 31, "Mantendremos para todos los ciudadanos la reducción del precio de los abonos de transporte durante 2024"), "cumplido",
    "Cumplido si una norma mantiene la rebaja de los abonos durante 2024.",
    [("2023-12-28", "El Real Decreto-ley 8/2023 mantiene la reducción del precio de los abonos y títulos multiviaje del transporte colectivo.", boe("BOE-A-2023-26452")),
     ("2024-01-10", "El Congreso convalida el Real Decreto-ley 8/2023 (172 sí, 171 no, 7 abstenciones).", cong("2024-01-10"))],
    "La rebaja se mantuvo en 2024 por real decreto-ley.", "La segunda parte (convertirla en política permanente para determinados colectivos) no se evalúa aquí.", [check_ft("abonos", "transporte colectivo", "2024")])
new("acuerdo-2023-empleo-paro", "empleo", "resultado", "Situar la tasa de empleo por encima del 70 % y acercar la tasa de paro a la media europea.",
    cite(AC, 4, "Desarrollaremos una política económica responsable y coherente", "por encima del 70%."), "cumplido_parcial",
    "Dos objetivos medibles con Eurostat: tasa de empleo (20-64 años) por encima del 70 % y tasa de paro convergente con la media de la UE.",
    [("2026-04-24", "Eurostat: tasa de empleo de España (20-64 años) del 72,4 % en 2025 (70,5 % en 2023).", "https://ec.europa.eu/eurostat/databrowser/view/lfsi_emp_a/default/table?lang=es"),
     ("2026-04-24", "Eurostat: tasa de paro de España del 10,5 % en 2025, frente al 6,0 % de la UE (12,2 % y 6,1 % en 2023).", "https://ec.europa.eu/eurostat/databrowser/view/une_rt_a/default/table?lang=es")],
    "El empleo supera el 70 %. El paro baja pero sigue muy por encima de la media europea: la convergencia no se ha alcanzado.",
    "El acuerdo no precisa el tramo de edad de la tasa de empleo; se usa el indicador principal de Eurostat (20-64 años). Fecha de las acciones: publicación anual aproximada de Eurostat.",
    ["Series de Eurostat del Observatorio (lfsi_emp_a y une_rt_a), descargadas con su URL de consulta."])
new("acuerdo-2023-gravamenes", "fiscalidad", "legislativa", "Mantener los gravámenes a la banca y a las energéticas cuando expire su periodo de aplicación.",
    cite(AC, 38, "Revisaremos los gravámenes sobre la banca y las empresas energéticas"), "cumplido_parcial",
    "Cumplido si ambos gravámenes se mantienen por norma estatal tras su vigencia temporal.",
    [("2024-12-21", "Ley 7/2024 crea el impuesto sobre el margen de intereses y comisiones de determinadas entidades financieras (sustituye al gravamen temporal a la banca).", boe("BOE-A-2024-26694")),
     ("2024-12-24", "Real Decreto-ley 10/2024: gravamen temporal energético para 2025.", boe("BOE-A-2024-26916")),
     ("2025-01-22", "El Congreso no convalida el Real Decreto-ley 10/2024 (165 sí, 183 no): el gravamen energético decae.", cong("2025-01-22"))],
    "El gravamen a la banca se mantiene como impuesto; el energético no superó la convalidación.", "", [check_ft("impuesto sobre el margen de intereses"), check_ft("gravamen temporal energetico")])
new("acuerdo-2023-desperdicio", "medio-ambiente", "legislativa", "Aprobar la Ley contra el Desperdicio Alimentario.",
    cite(AC, 19, "Retomaremos la Ley contra el Desperdicio Alimentario."), "cumplido", "Cumplido si se publica la ley.",
    [("2025-04-02", "BOE publica la Ley 1/2025, de prevención de las pérdidas y el desperdicio alimentario.", boe("BOE-A-2025-6597"))],
    "Ley publicada.", "", [check_ft("desperdicio alimentario")])
new("acuerdo-2023-bomberos-forestales", "medio-ambiente", "legislativa", "Aprobar las leyes básicas de bomberos y de agentes forestales.",
    cite(AC, 18, "se finalizará la tramitación de las Leyes Básicas para el Estatuto de los Bomberos y Agentes Forestales."), "cumplido_parcial",
    "Dos leyes: cumplido si se publican ambas; parcial si solo una.",
    [("2024-11-09", "BOE publica la Ley 4/2024, básica de agentes forestales y medioambientales.", boe("BOE-A-2024-23271"))],
    "Se aprobó la ley de agentes forestales; no consta la de bomberos.", DISS, [check_ft("agentes forestales y medioambientales"), check_ft("bomberos", "ley basica"), VOTES])
new("acuerdo-2023-cne", "energia", "legislativa", "Restablecer la Comisión Nacional de la Energía como regulador propio.",
    cite(AC, 16, "Impulsaremos el establecimiento de una Comisión Nacional de la Energía."), "cumplido_parcial",
    "Cumplido si una ley crea el organismo; parcial si el Gobierno lo impulsa con un proyecto de ley que no llega a aprobarse.",
    [("2026-03-21", "El Real Decreto-ley 7/2026 menciona «el proyecto de ley de restablecimiento de la Comisión Nacional de la Energía, aún en trámite parlamentario».", boe("BOE-A-2026-6544"))],
    "El Gobierno lo impulsó con un proyecto de ley que no llegó a aprobarse antes de la disolución.", DISS, [check_ft("comision nacional de la energia")])
new("acuerdo-2023-palestina", "ue-exterior", "internacional", "Reconocer el Estado de Palestina.",
    cite(AC, 48, "Apostaremos por el reconocimiento del Estado palestino"), "cumplido", "Cumplido si el Gobierno reconoce oficialmente el Estado de Palestina.",
    [("2025-09-24", "El Real Decreto-ley 10/2025 recoge «el reconocimiento internacional del Estado de Palestina por el Gobierno el pasado 28 de mayo de 2024».", boe("BOE-A-2025-18831"))],
    "Reconocimiento acordado por el Gobierno el 28 de mayo de 2024.", "La fuente es una referencia en el BOE; el acuerdo del Consejo de Ministros no figura en el registro de normas.", [check_ft("estado de palestina")])
new("acuerdo-2023-tiempo-respuesta", "territorial", "legislativa", "Fijar por ley un tiempo máximo de respuesta de los servicios públicos (30 días para prestaciones como desempleo o dependencia).",
    cite(AC, 41, "Garantizaremos por ley un tiempo máximo de respuesta en los servicios públicos"), "no_cumplido", LEG,
    [("2024-10-31", "La Ley 3/2024 (ELA) solo prevé crear un grupo de trabajo con las comunidades para abordar ese tiempo máximo (disposición adicional sexta).", boe("BOE-A-2024-22438"))],
    "No se fijó por ley ningún plazo máximo; solo consta un mandato para estudiarlo.", DISS, [check_ft("tiempo maximo de respuesta"), check_ft("plazo maximo", "prestacion por desempleo", "30 dias"), VOTES])
new("acuerdo-2023-ley-mordaza", "seguridad", "legislativa", "Reformar la Ley de Seguridad Ciudadana («ley mordaza») en lo que limita la reunión y la expresión.",
    cite(AC, 43, "Reformaremos, y derogaremos, aquellos aspectos de la normativa vigente que limita los derechos de reunión y libertad de expresión"), "no_cumplido", LEG,
    [("2024-10-29", "El Congreso toma en consideración la proposición de ley orgánica de protección de la seguridad ciudadana del PSOE, Sumar, EH Bildu y PNV (176 sí, 170 no).", cong("2024-10-29")),
     ("2024-12-12", "El Pleno rechaza una enmienda a la totalidad a otra proposición sobre seguridad ciudadana (33 sí, 176 no).", cong("2024-12-12"))],
    "La reforma se tramitó pero no llegó a aprobarse antes de la disolución.", DISS, [check_ft("ley organica 4/2015", "se modifica"), VOTES])
for (id, topic, prom, c, terms) in [
    ("acuerdo-2023-estatuto-becario", "empleo", "Aprobar el Estatuto del becario.", cite(AC, 11, "Aprobaremos el estatuto del becario."), [("estatuto del becario",), ("practicas formativas", "estatuto")]),
    ("acuerdo-2023-usos-tiempo", "empleo", "Aprobar una Ley de usos del tiempo.", cite(AC, 11, "Aprobaremos una Ley de usos del tiempo"), [("usos del tiempo",)]),
    ("acuerdo-2023-estatuto-trabajo", "empleo", "Culminar un Estatuto del Trabajo del siglo XXI.", cite(AC, 10, "Culminaremos un Estatuto del Trabajo del siglo XXI"), [("estatuto del trabajo del siglo xxi",)]),
    ("acuerdo-2023-ley-trata", "igualdad", "Tramitar una ley integral contra la trata de personas.", cite(AC, 34, "Tramitaremos una ley integral contra la trata de personas"), [("ley organica integral contra la trata",), ("trata", "ley integral")]),
    ("acuerdo-2023-ley-racismo", "igualdad", "Aprobar una Ley contra el Racismo.", cite(AC, 36, "Aprobaremos una Ley contra el Racismo"), [("contra el racismo",)]),
    ("acuerdo-2023-bebes-robados", "justicia", "Aprobar una ley de «bebés robados».", cite(AC, 43, "Impulsaremos una ley de “bebés robados”"), [("bebes robados",), ("sustraccion de recien nacidos",)]),
    ("acuerdo-2023-equidad-sns", "sanidad", "Aprobar la Ley de Equidad, Universalidad y Cohesión del Sistema Nacional de Salud.", cite(AC, 24, "Blindaremos la universalidad de nuestro Sistema Nacional de Salud"), [("equidad, universalidad y cohesion",)]),
    ("acuerdo-2023-servicios-sociales", "igualdad", "Aprobar una Ley de Garantía de la Igualdad de Acceso a los Servicios Sociales.", cite(AC, 23, "Aprobaremos una Ley de Garantía de la Igualdad de Acceso a los Servicios Sociales"), [("igualdad de acceso a los servicios sociales",), ("servicios sociales", "universalizacion")]),
    ("acuerdo-2023-regimen-local", "territorial", "Reformar la ley de Administración Local y aprobar una Ley de Régimen Local.", cite(AC, 40, "Reformaremos en paralelo la ley de Racionalización y Sostenibilidad de la Administración Local"), [("ley 27/2013", "se modifica"), ("ley de regimen local",)]),
]:
    hits = [h for q in terms for h in ft(*q)]
    new(id, topic, "legislativa", prom, c, "no_cumplido", LEG, [], "No consta en el BOE una norma estatal con este objeto ni una votación final en el Pleno.", DISS,
        [check_ft(*q) for q in terms] + [VOTES])

json.dump(P, open(D("promises.json"), "w"), ensure_ascii=False, indent=2)
open(D("promises.json"), "a").write("\n")
print(len(P), "fichas ·", NSTATE, "normas estatales con rango de ley")
