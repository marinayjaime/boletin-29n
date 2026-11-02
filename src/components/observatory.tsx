"use client";

import { asset } from "@/lib/asset";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { EChartsOption } from "echarts";
import type { SeriesFile, StatisticalIndicator } from "@/lib/schema";
import { byGeo, deflate, filterYears, periodKey, rebase, toCSV, yearOf, yearValue, type Obs } from "@/lib/series";
import { GEO_LABELS, NUTS2_ES } from "@/lib/jsonstat";
import { formatDate, formatNumber, formatPeriod } from "@/lib/format";
import { EChart, type EChartHandle } from "./echart";

export const AREAS = [
  { id: "economia", label: "Economía" },
  { id: "trabajo", label: "Trabajo y salarios" },
  { id: "vivienda", label: "Vivienda" },
  { id: "pensiones", label: "Pensiones" },
  { id: "sanidad-educacion", label: "Sanidad y educación" },
  { id: "sociedad", label: "Sociedad y demografía" },
] as const;

type Events = {
  governments: { start: string; label: string; party: string; note: string }[];
  governmentsSource: string;
  events: { date: string; label: string; topics: string[]; url: string }[];
};
type Pending = { area: string; name: string; source: string; url: string; reason: string };

type Mode = "abs" | "rel" | "real";
type View = "linea" | "mapa" | "tabla";

function useTokens() {
  const [t, setT] = useState({ ink: "#16140f", ink3: "#6d685d", rule: "#cfc6b3", accent: "#a8640b", paper: "#f4f0e7", soft: "#f0dcb8" });
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const g = (v: string) => s.getPropertyValue(v).trim();
      setT({ ink: g("--ink"), ink3: g("--ink-3"), rule: g("--rule"), accent: g("--accent"), paper: g("--paper"), soft: g("--accent-soft") });
    };
    read();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", read);
      mo.disconnect();
    };
  }, []);
  return t;
}

const DASH = ["solid", "dashed", "dotted", [8, 3, 2, 3], [2, 4]] as const;

export function Observatory({ indicators, events, pending }: { indicators: StatisticalIndicator[]; events: Events; pending: Pending[] }) {
  const sp = useSearchParams();
  const tok = useTokens();
  const chartRef = useRef<EChartHandle>(null);

  const initialInd = indicators.find((i) => i.id === sp.get("i")) ?? indicators.find((i) => i.area === (sp.get("a") ?? "economia")) ?? indicators[0];
  const [area, setArea] = useState<string>(initialInd.area);
  const [indId, setIndId] = useState<string>(initialInd.id);
  const ind = indicators.find((i) => i.id === indId)!;
  const [data, setData] = useState<SeriesFile | null>(null);
  const [deflator, setDeflator] = useState<SeriesFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geos, setGeos] = useState<string[]>(() => (sp.get("g") ? sp.get("g")!.split(",") : [initialInd.geos[0]]));
  const [from, setFrom] = useState<number>(Number(sp.get("desde")) || 0);
  const [to, setTo] = useState<number>(Number(sp.get("hasta")) || 0);
  const [mode, setMode] = useState<Mode>((sp.get("modo") as Mode) || "abs");
  const [view, setView] = useState<View>((sp.get("vista") as View) || "linea");
  const [showGov, setShowGov] = useState(sp.get("gob") !== "0");
  const [mapYear, setMapYear] = useState<number>(Number(sp.get("anio")) || 0);
  const [yA, setYA] = useState<number>(0);
  const [yB, setYB] = useState<number>(0);
  const [geo, setGeo] = useState<object | null>(null);
  const [copied, setCopied] = useState(false);

  // carga de la serie
  useEffect(() => {
    let cancel = false;
    setData(null);
    setError(null);
    fetch(asset(`/data/stats/${ind.id}.json`))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: SeriesFile) => {
        if (cancel) return;
        setData(d);
        const years = d.observations.map((o) => yearOf(o.period));
        const minY = Math.min(...years);
        const maxY = Math.max(...years);
        setFrom((f) => (f && f >= minY && f <= maxY ? f : Math.max(minY, maxY - (ind.frequency === "M" ? 10 : 20))));
        setTo((t) => (t && t <= maxY && t >= minY ? t : maxY));
        const ry = d.regional?.length ? Math.max(...d.regional.map((o) => yearOf(o.period))) : 0;
        setMapYear((y) => (y && d.regional?.some((o) => yearOf(o.period) === y) ? y : ry));
        setYA(maxY - 5 >= minY ? maxY - 5 : minY);
        setYB(maxY);
      })
      .catch((e) => !cancel && setError(`No se pudo cargar la serie (${e.message}).`));
    return () => {
      cancel = true;
    };
  }, [ind.id, ind.frequency]);

  useEffect(() => {
    if (mode !== "real" || deflator) return;
    fetch(asset("/data/stats/ipca-indice.json"))
      .then((r) => r.json())
      .then(setDeflator)
      .catch(() => setError("No se pudo cargar el deflactor (IPCA)."));
  }, [mode, deflator]);

  useEffect(() => {
    if (view !== "mapa" || geo) return;
    fetch(asset("/data/geo/es-nuts2.json"))
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setError("No se pudo cargar el mapa."));
  }, [view, geo]);

  // URL compartible
  useEffect(() => {
    const q = new URLSearchParams();
    q.set("i", ind.id);
    if (geos.join(",") !== ind.geos[0]) q.set("g", geos.join(","));
    if (from) q.set("desde", String(from));
    if (to) q.set("hasta", String(to));
    if (mode !== "abs") q.set("modo", mode);
    if (view !== "linea") q.set("vista", view);
    if (!showGov) q.set("gob", "0");
    if (view === "mapa" && mapYear) q.set("anio", String(mapYear));
    window.history.replaceState(null, "", `?${q.toString()}`);
  }, [ind.id, ind.geos, geos, from, to, mode, view, showGov, mapYear]);

  const selectIndicator = (id: string) => {
    const n = indicators.find((i) => i.id === id)!;
    setIndId(id);
    setGeos((g) => g.filter((x) => n.geos.includes(x)).length ? g.filter((x) => n.geos.includes(x)) : [n.geos[0]]);
    if (!n.regional && view === "mapa") setView("linea");
    if (mode === "real" && !n.derived) setMode("abs");
    setFrom(0);
    setTo(0);
  };

  const allYears = useMemo(() => {
    const ys = [...new Set((data?.observations ?? []).map((o) => yearOf(o.period)))].sort((a, b) => a - b);
    return ys;
  }, [data]);

  const visible = useMemo(() => {
    if (!data) return new Map<string, Obs[]>();
    let obs = filterYears(data.observations.filter((o) => geos.includes(o.geo)), from || -Infinity, to || Infinity);
    if (mode === "real" && deflator) obs = deflate(obs, deflator.observations);
    const m = byGeo(obs);
    if (mode === "rel") {
      for (const [k, v] of m) {
        const r = rebase(v);
        if (r) m.set(k, r);
        else m.delete(k);
      }
    }
    return m;
  }, [data, geos, from, to, mode, deflator]);

  const unitLabel = mode === "rel" ? "índice (primer periodo visible = 100)" : mode === "real" ? "euros constantes del último año" : ind.unit;
  const dec = mode === "rel" ? 1 : ind.decimals;

  const lineOption = useMemo<EChartsOption>(() => {
    const periods = [...new Set([...visible.values()].flat().map((o) => o.period))].sort((a, b) => periodKey(a) - periodKey(b));
    const govMarks = showGov
      ? events.governments
          .filter((g) => yearOf(g.start) >= (from || 0) && yearOf(g.start) <= (to || 9999))
          .map((g) => {
            const target = periodKey(g.start.slice(0, ind.frequency === "A" ? 4 : 7));
            const p = periods.find((x) => periodKey(x) >= target);
            return p ? { xAxis: p, label: { formatter: g.label }, gov: true } : null;
          })
          .filter(Boolean)
      : [];
    const evMarks = events.events
      .filter((e) => e.topics.includes(ind.area))
      .map((e) => {
        const target = periodKey(e.date.slice(0, ind.frequency === "A" ? 4 : 7));
        const p = periods.find((x) => periodKey(x) >= target);
        return p ? { xAxis: p, label: { formatter: e.label } } : null;
      })
      .filter(Boolean);
    const series = [...visible.entries()].map(([g, obs], k) => {
      const isMain = g === ind.geos[0];
      const map = new Map(obs.map((o) => [o.period, o.value]));
      return {
        name: GEO_LABELS[g] ?? g,
        type: "line" as const,
        showSymbol: periods.length < 40,
        symbolSize: 5,
        connectNulls: false,
        data: periods.map((p) => map.get(p) ?? null),
        lineStyle: { width: isMain ? 2.6 : 1.4, color: isMain ? tok.accent : tok.ink, type: isMain ? "solid" : (DASH[k % DASH.length] as never), opacity: isMain ? 1 : 0.75 },
        itemStyle: { color: isMain ? tok.accent : tok.ink },
        emphasis: { focus: "series" as const },
        z: isMain ? 10 : 2,
        markLine:
          k === 0
            ? {
                symbol: "none",
                silent: true,
                animation: false,
                data: [
                  ...govMarks.map((m) => ({ ...(m as object), lineStyle: { color: tok.ink3, type: "dashed" as const, width: 1 }, label: { ...(m as { label: object }).label, position: "insideEndTop" as const, color: tok.ink3, fontSize: 10, fontFamily: "monospace" } })),
                  ...evMarks.map((m) => ({ ...(m as object), lineStyle: { color: tok.accent, type: "dotted" as const, width: 1, opacity: 0.8 }, label: { ...(m as { label: object }).label, position: "insideStartTop" as const, color: tok.accent, fontSize: 10 } })),
                ],
              }
            : undefined,
      };
    });
    return {
      grid: { left: 8, right: 16, top: 40, bottom: 56, containLabel: true },
      textStyle: { fontFamily: "var(--font-instrument), system-ui", color: tok.ink },
      legend: { show: series.length > 1, top: 0, left: 0, icon: "roundRect", itemWidth: 18, itemHeight: 3, textStyle: { color: tok.ink } },
      tooltip: {
        trigger: "axis",
        backgroundColor: tok.paper,
        borderColor: tok.rule,
        textStyle: { color: tok.ink },
        valueFormatter: (v) => (v == null ? "sin dato" : `${formatNumber(Number(v), dec)} ${mode === "rel" ? "" : ind.unitShort}`),
      },
      xAxis: {
        type: "category",
        data: periods,
        boundaryGap: false,
        axisLine: { lineStyle: { color: tok.rule } },
        axisLabel: { color: tok.ink3, formatter: (v: string) => formatPeriod(v), hideOverlap: true },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        scale: ind.id !== "deuda-euros",
        splitLine: { lineStyle: { color: tok.rule, opacity: 0.6 } },
        axisLabel: { color: tok.ink3, formatter: (v: number) => formatNumber(v, Math.abs(v) >= 1000 ? 0 : dec > 1 ? 1 : dec) },
      },
      dataZoom: [{ type: "inside" }, { type: "slider", height: 18, bottom: 6, borderColor: tok.rule, fillerColor: tok.soft, textStyle: { color: tok.ink3 }, labelFormatter: (_: number, v: string) => formatPeriod(String(v)) }],
      series,
    } as EChartsOption;
  }, [visible, tok, ind, events, showGov, from, to, dec, mode]);

  const regionalYears = useMemo(() => [...new Set((data?.regional ?? []).map((o) => yearOf(o.period)))].sort((a, b) => a - b), [data]);
  const mapOption = useMemo<EChartsOption | null>(() => {
    if (!data?.regional || !geo) return null;
    const rows = data.regional.filter((o) => yearOf(o.period) === mapYear);
    const vals = data.regional.map((o) => o.value);
    return {
      tooltip: { trigger: "item", backgroundColor: tok.paper, borderColor: tok.rule, textStyle: { color: tok.ink }, formatter: (p: unknown) => {
        const x = p as { name: string; value: number };
        return `${GEO_LABELS[x.name] ?? x.name}<br/><b>${Number.isFinite(x.value) ? formatNumber(x.value, ind.decimals) + " " + ind.unitShort : "sin dato"}</b>`;
      } },
      visualMap: { min: Math.min(...vals), max: Math.max(...vals), left: 0, bottom: 10, calculable: true, orient: "horizontal", itemWidth: 12, itemHeight: 160, inRange: { color: [tok.soft, tok.accent, tok.ink] }, textStyle: { color: tok.ink3 }, formatter: (v: unknown) => formatNumber(Number(v), ind.decimals) },
      series: [{ type: "map", map: "es-nuts2", roam: false, aspectScale: 0.85, label: { show: false }, itemStyle: { borderColor: tok.paper, borderWidth: 0.8, areaColor: tok.rule }, emphasis: { label: { show: false }, itemStyle: { areaColor: tok.accent } }, select: { disabled: true }, data: rows.map((o) => ({ name: o.geo, value: o.value })) }],
    } as EChartsOption;
  }, [data, geo, mapYear, tok, ind]);

  const tableRows = useMemo(() => {
    const periods = [...new Set([...visible.values()].flat().map((o) => o.period))].sort((a, b) => periodKey(b) - periodKey(a));
    return periods.map((p) => ({ period: p, cells: [...visible.entries()].map(([g, obs]) => ({ g, v: obs.find((o) => o.period === p) })) }));
  }, [visible]);

  const downloadCSV = () => {
    if (!data) return;
    const rows = [...visible.values()].flat();
    const csv = toCSV(rows, { indicator: `${ind.name} (${unitLabel})`, unit: unitLabel, source: data.requestUrl, fetchedAt: data.fetchedAt });
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ind.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const downloadPNG = () => {
    const d = chartRef.current?.toPNG();
    if (!d) return;
    const a = document.createElement("a");
    a.href = d;
    a.download = `${ind.id}.png`;
    a.click();
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const mainSeries = data ? byGeo(data.observations).get(ind.geos[0]) ?? [] : [];
  const last = mainSeries.at(-1);
  const inArea = indicators.filter((i) => i.area === area);
  const pendingInArea = pending.filter((p) => p.area === area);
  const compA = yA ? yearValue(mainSeries, yA) : null;
  const compB = yB ? yearValue(mainSeries, yB) : null;

  return (
    <div>
      {/* áreas */}
      <div role="tablist" aria-label="Áreas" className="lane -mx-4 flex gap-1 overflow-x-auto border-b border-rule px-4 md:mx-0 md:px-0">
        {AREAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={area === a.id}
            onClick={() => {
              setArea(a.id);
              const first = indicators.find((i) => i.area === a.id);
              if (first) selectIndicator(first.id);
            }}
            className={`relative shrink-0 px-4 py-3 text-sm md:text-base ${area === a.id ? "text-ink" : "text-ink-3 hover:text-ink"}`}
          >
            {a.label}
            {area === a.id && <span className="absolute inset-x-3 bottom-0 h-[3px] bg-accent" aria-hidden />}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* indicadores */}
        <nav aria-label="Indicadores" className="min-w-0">
          <ul className="lane -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:block lg:space-y-1 lg:px-0">
            {inArea.map((i) => (
              <li key={i.id} className="shrink-0">
                <button
                  onClick={() => selectIndicator(i.id)}
                  aria-current={i.id === indId}
                  className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${i.id === indId ? "bg-ink text-paper" : "border border-rule hover:border-ink lg:border-transparent"}`}
                >
                  {i.name}
                </button>
              </li>
            ))}
          </ul>
          {pendingInArea.length > 0 && (
            <div className="mt-6 hidden lg:block">
              <p className="kicker mb-2">Pendientes de importación</p>
              <ul className="space-y-2 text-xs text-ink-3">
                {pendingInArea.map((p) => (
                  <li key={p.name}>
                    <a href={p.url} target="_blank" rel="noreferrer" className="link">
                      {p.name}
                    </a>{" "}
                    — {p.source}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <section aria-labelledby="ind-title" className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h2 id="ind-title" className="display text-3xl leading-tight md:text-4xl">
                {ind.name}
              </h2>
              <p className="mt-2 text-ink-2">{ind.description}</p>
            </div>
            {last && (
              <div className="text-right">
                <p className="display tabular text-5xl font-light leading-none">
                  {formatNumber(last.value, ind.decimals)}
                  <span className="ml-1 font-sans text-base text-ink-2">{ind.unitShort}</span>
                </p>
                <p className="mt-1 font-mono text-xs text-ink-3">
                  {GEO_LABELS[ind.geos[0]]} · {formatPeriod(last.period)}
                </p>
              </div>
            )}
          </div>

          {/* controles */}
          <div className="mt-6 grid gap-4 rounded border border-rule p-4 md:grid-cols-2 xl:grid-cols-4">
            <fieldset>
              <legend className="kicker mb-2">Vista</legend>
              <div className="flex flex-wrap gap-1 text-sm">
                {(["linea", "tabla", "mapa"] as View[]).map((v) => (
                  <button
                    key={v}
                    aria-pressed={view === v}
                    disabled={v === "mapa" && !ind.regional}
                    onClick={() => setView(v)}
                    title={v === "mapa" && !ind.regional ? "Este indicador no tiene datos por comunidad autónoma en esta versión" : undefined}
                    className={`rounded-full border px-3 py-1 disabled:opacity-30 ${view === v ? "border-ink bg-ink text-paper" : "border-rule"}`}
                  >
                    {v === "linea" ? "Evolución" : v === "tabla" ? "Tabla" : "Por comunidad"}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset disabled={view === "mapa"}>
              <legend className="kicker mb-2">Periodo</legend>
              <div className="flex items-center gap-2 text-sm">
                <label className="sr-only" htmlFor="desde">
                  Desde
                </label>
                <select id="desde" value={from} onChange={(e) => setFrom(Number(e.target.value))} className="rounded border border-rule bg-paper px-2 py-1">
                  {allYears.map((y) => (
                    <option key={y} value={y} disabled={y > to}>
                      {y}
                    </option>
                  ))}
                </select>
                <span aria-hidden>—</span>
                <label className="sr-only" htmlFor="hasta">
                  Hasta
                </label>
                <select id="hasta" value={to} onChange={(e) => setTo(Number(e.target.value))} className="rounded border border-rule bg-paper px-2 py-1">
                  {allYears.map((y) => (
                    <option key={y} value={y} disabled={y < from}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>
            <fieldset disabled={view === "mapa"}>
              <legend className="kicker mb-2">Cifras</legend>
              <div className="flex flex-wrap gap-1 text-sm">
                <button aria-pressed={mode === "abs"} onClick={() => setMode("abs")} className={`rounded-full border px-3 py-1 ${mode === "abs" ? "border-ink bg-ink text-paper" : "border-rule"}`}>
                  Absolutas
                </button>
                <button aria-pressed={mode === "rel"} onClick={() => setMode("rel")} className={`rounded-full border px-3 py-1 ${mode === "rel" ? "border-ink bg-ink text-paper" : "border-rule"}`} title="Índice 100 en el primer periodo visible">
                  Relativas (base 100)
                </button>
                {ind.derived && (
                  <button aria-pressed={mode === "real"} onClick={() => setMode("real")} className={`rounded-full border px-3 py-1 ${mode === "real" ? "border-ink bg-ink text-paper" : "border-rule"}`}>
                    Reales
                  </button>
                )}
              </div>
            </fieldset>
            <fieldset disabled={view === "mapa" || ind.geos.length < 2}>
              <legend className="kicker mb-2">Comparar con</legend>
              <div className="flex flex-wrap gap-1 text-sm">
                {ind.geos.map((g) => {
                  const on = geos.includes(g);
                  return (
                    <button
                      key={g}
                      aria-pressed={on}
                      onClick={() => setGeos((cur) => (on ? (cur.length > 1 ? cur.filter((x) => x !== g) : cur) : [...cur, g]))}
                      className={`rounded-full border px-2.5 py-1 disabled:opacity-40 ${on ? "border-ink" : "border-rule text-ink-3"}`}
                    >
                      {GEO_LABELS[g] ?? g}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {view === "linea" && (
              <label className="mr-auto flex items-center gap-2">
                <input type="checkbox" checked={showGov} onChange={(e) => setShowGov(e.target.checked)} className="accent-[var(--accent)]" />
                Mostrar cambios de Gobierno y acontecimientos
              </label>
            )}
            <button onClick={downloadCSV} disabled={!data} className="rounded-full border border-rule px-3 py-1 hover:border-ink">
              Descargar CSV
            </button>
            <button onClick={downloadPNG} disabled={!data || view === "tabla"} className="rounded-full border border-rule px-3 py-1 hover:border-ink disabled:opacity-40">
              Exportar imagen
            </button>
            <button onClick={share} className="rounded-full border border-rule px-3 py-1 hover:border-ink">
              {copied ? "Enlace copiado ✓" : "Copiar enlace con filtros"}
            </button>
          </div>

          {/* gráfico */}
          <div className="mt-4 border-y border-rule py-4">
            {error && <p className="rounded border border-no p-3 text-sm">{error}</p>}
            {!data && !error && (
              <p role="status" className="py-24 text-center text-sm text-ink-3">
                Cargando datos de {ind.provider}…
              </p>
            )}
            {data && view === "linea" && (
              <EChart ref={chartRef} option={lineOption} height={420} ariaLabel={`Gráfico de líneas: ${ind.name}, ${unitLabel}. Los valores exactos están en la vista Tabla.`} />
            )}
            {data && view === "mapa" && mapOption && geo && (
              <div>
                <div className="mb-2 flex items-center gap-3 text-sm">
                  <label htmlFor="anio" className="kicker">
                    Año
                  </label>
                  <input id="anio" type="range" min={regionalYears[0]} max={regionalYears.at(-1)} value={mapYear} onChange={(e) => setMapYear(Number(e.target.value))} className="w-48 accent-[var(--accent)]" />
                  <span className="font-mono">{mapYear}</span>
                </div>
                <EChart ref={chartRef} option={mapOption} height={460} ariaLabel={`Mapa por comunidades autónomas: ${ind.name}, ${mapYear}. Los valores están en la tabla inferior.`} map={{ name: "es-nuts2", geo }} />
                <p className="text-xs text-ink-3">Canarias desplazada para su representación. Geometría: GISCO, © EuroGeographics.</p>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer">Valores por comunidad ({mapYear})</summary>
                  <table className="mt-2 w-full max-w-md text-sm">
                    <tbody>
                      {NUTS2_ES.map((r) => {
                        const o = data.regional!.find((x) => x.geo === r.code && yearOf(x.period) === mapYear);
                        return (
                          <tr key={r.code} className="border-t border-rule">
                            <th scope="row" className="py-1 text-left font-normal">
                              {r.name}
                            </th>
                            <td className="text-right font-mono">{o ? formatNumber(o.value, ind.decimals) : "sin dato"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </details>
              </div>
            )}
            {data && view === "tabla" && (
              <div className="max-h-[460px] overflow-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    {ind.name}, {unitLabel}
                  </caption>
                  <thead className="sticky top-0 bg-paper">
                    <tr>
                      <th scope="col" className="py-2 text-left font-normal text-ink-3">
                        Periodo
                      </th>
                      {[...visible.keys()].map((g) => (
                        <th key={g} scope="col" className="py-2 text-right font-normal text-ink-3">
                          {GEO_LABELS[g] ?? g}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r) => (
                      <tr key={r.period} className="border-t border-rule">
                        <th scope="row" className="py-1 text-left font-normal">
                          {formatPeriod(r.period)}
                        </th>
                        {r.cells.map((c) => (
                          <td key={c.g} className="text-right font-mono">
                            {c.v ? formatNumber(c.v.value, dec) : "—"}
                            {c.v?.flag && <sup title={`Marca de Eurostat: ${c.v.flag}`}> {c.v.flag}</sup>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* comparar años */}
          {data && view !== "mapa" && allYears.length > 1 && (
            <div className="mt-6 grid gap-4 rounded bg-paper-2 p-4 md:grid-cols-[auto_1fr]">
              <div className="flex items-center gap-2 text-sm">
                <span className="kicker">Comparar años · {GEO_LABELS[ind.geos[0]]}</span>
                <select aria-label="Primer año" value={yA} onChange={(e) => setYA(Number(e.target.value))} className="rounded border border-rule bg-paper px-2 py-1">
                  {allYears.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
                <span aria-hidden>→</span>
                <select aria-label="Segundo año" value={yB} onChange={(e) => setYB(Number(e.target.value))} className="rounded border border-rule bg-paper px-2 py-1">
                  {allYears.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>
              <p className="text-sm">
                {compA && compB ? (
                  <>
                    <span className="font-mono">{formatNumber(compA.value, ind.decimals)}</span> → <span className="font-mono">{formatNumber(compB.value, ind.decimals)}</span> {ind.unitShort}
                    <span aria-hidden> · </span>diferencia <strong className="font-mono">{formatNumber(compB.value - compA.value, ind.decimals)}</strong>
                    {ind.unitShort.includes("%") ? " puntos" : ` ${ind.unitShort}`}
                    {compA.value > 0 && !ind.unitShort.includes("%") && <> ({formatNumber(((compB.value - compA.value) / compA.value) * 100, 1)} %)</>}
                    {(compA.n > 1 || compB.n > 1) && <span className="block text-xs text-ink-3">Serie infraanual: se compara la media simple de los periodos disponibles de cada año.</span>}
                  </>
                ) : (
                  <span className="text-ink-3">Falta el dato de alguno de los años elegidos.</span>
                )}
              </p>
            </div>
          )}

          {/* ficha técnica */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="kicker mb-2">Cómo leer este dato</h3>
              <p className="text-sm leading-relaxed text-ink-2">{ind.methodology}</p>
              {ind.caveats.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {ind.caveats.map((c) => (
                    <li key={c} className="flex gap-2">
                      <span className="text-accent" aria-hidden>
                        !
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>
              )}
              {mode === "real" && ind.derived && <p className="mt-3 rounded border border-rule p-2 text-xs">Serie derivada: {ind.derived}</p>}
              {showGov && view === "linea" && (
                <p className="mt-3 text-xs text-ink-3">
                  Las líneas discontinuas marcan la toma de posesión de cada presidente del Gobierno (
                  <a className="link" href={events.governmentsSource} target="_blank" rel="noreferrer">
                    La Moncloa
                  </a>
                  ). Se muestran como contexto: no prueban que un Gobierno cause la evolución de un indicador, que depende también del ciclo económico, de
                  decisiones anteriores, de las comunidades autónomas y del contexto internacional.
                </p>
              )}
            </div>
            <div className="text-sm">
              <h3 className="kicker mb-2">Fuente</h3>
              {data && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <dt className="text-ink-3">Organismo</dt>
                  <dd>{ind.provider}</dd>
                  <dt className="text-ink-3">Conjunto</dt>
                  <dd className="font-mono text-xs">
                    {ind.dataset} — {data.datasetLabel}
                  </dd>
                  <dt className="text-ink-3">Unidad</dt>
                  <dd>{unitLabel}</dd>
                  <dt className="text-ink-3">Actualizado por la fuente</dt>
                  <dd>{data.datasetUpdated ? formatDate(data.datasetUpdated) : "—"}</dd>
                  <dt className="text-ink-3">Descargado</dt>
                  <dd>{formatDate(data.fetchedAt)}</dd>
                </dl>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={ind.sourceUrl} target="_blank" rel="noreferrer" className="kicker rounded-full border border-ink px-3 py-1.5">
                  Abrir la fuente ↗
                </a>
                {data && (
                  <a href={data.requestUrl} target="_blank" rel="noreferrer" className="kicker rounded-full border border-rule px-3 py-1.5">
                    Consulta exacta (API) ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {pendingInArea.length > 0 && (
            <div className="mt-8 lg:hidden">
              <p className="kicker mb-2">Pendientes de importación en esta área</p>
              <ul className="space-y-2 text-sm text-ink-2">
                {pendingInArea.map((p) => (
                  <li key={p.name}>
                    <a href={p.url} target="_blank" rel="noreferrer" className="link">
                      {p.name}
                    </a>{" "}
                    — {p.source}. {p.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
