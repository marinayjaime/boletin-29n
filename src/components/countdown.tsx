"use client";

import { useEffect, useState } from "react";

/** Cuenta atrás hasta la jornada electoral (00:00 hora peninsular), calculada en el navegador. */
export function Countdown({ date, compact = false }: { date: string; compact?: boolean }) {
  const target = new Date(`${date}T00:00:00+01:00`).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const diff = now === null ? null : Math.max(0, target - now);
  const days = diff === null ? "—" : Math.floor(diff / 86_400_000);
  const hours = diff === null ? "—" : Math.floor((diff % 86_400_000) / 3_600_000);
  if (compact)
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1.5 text-sm font-extrabold text-brand-ink">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-ink opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-ink" />
        </span>
        Faltan {days} días · 29 de noviembre
      </span>
    );
  return (
    <div className="flex items-end gap-3">
      <div>
        <p className="num text-6xl md:text-7xl">{days}</p>
        <p className="text-sm font-bold">días</p>
      </div>
      <div>
        <p className="num text-4xl md:text-5xl">{hours}</p>
        <p className="text-sm font-bold">horas</p>
      </div>
    </div>
  );
}
