"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { EChartsOption, ECharts } from "echarts";

export type EChartHandle = { toPNG: () => string | null };

/** Envoltorio mínimo de ECharts con carga diferida, redimensionado y respeto a reduced-motion. */
export const EChart = forwardRef<EChartHandle, { option: EChartsOption; height: number; ariaLabel: string; map?: { name: string; geo: object } }>(
  function EChart({ option, height, ariaLabel, map }, ref) {
    const el = useRef<HTMLDivElement>(null);
    const chart = useRef<ECharts | null>(null);
    const [ready, setReady] = useState(false);
    const [visible, setVisible] = useState(false);

    useImperativeHandle(ref, () => ({
      toPNG: () => chart.current?.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: getComputedStyle(document.body).backgroundColor }) ?? null,
    }));

    useEffect(() => {
      if (!el.current) return;
      const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: "100px" });
      io.observe(el.current);
      return () => io.disconnect();
    }, []);

    useEffect(() => {
      if (!visible || !el.current) return;
      let disposed = false;
      let ro: ResizeObserver | null = null;
      import("echarts").then((echarts) => {
        if (disposed || !el.current) return;
        if (map) echarts.registerMap(map.name, map.geo as never);
        chart.current = echarts.init(el.current, undefined, { renderer: "svg" });
        ro = new ResizeObserver(() => chart.current?.resize());
        ro.observe(el.current);
        setReady(true);
      });
      return () => {
        disposed = true;
        ro?.disconnect();
        chart.current?.dispose();
        chart.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, map?.name]);

    useEffect(() => {
      if (!ready || !chart.current) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      chart.current.setOption({ animation: !reduce, ...option }, { notMerge: true });
    }, [option, ready]);

    return (
      <div className="relative w-full" style={{ height }}>
        <div ref={el} role="img" aria-label={ariaLabel} className="absolute inset-0" />
        {!ready && <div className="absolute inset-0 grid place-items-center text-sm text-ink-3">Cargando gráfico…</div>}
      </div>
    );
  },
);
