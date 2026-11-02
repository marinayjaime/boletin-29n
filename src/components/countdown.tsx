"use client";

import { useEffect, useState } from "react";

/** Cuenta atrás hasta la jornada electoral (00:00 hora peninsular). Se calcula en el navegador. */
export function Countdown({ date }: { date: string }) {
  const target = new Date(`${date}T00:00:00+01:00`).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const diff = now === null ? null : Math.max(0, target - now);
  const days = diff === null ? null : Math.floor(diff / 86_400_000);
  const hours = diff === null ? null : Math.floor((diff % 86_400_000) / 3_600_000);
  return (
    <div aria-live="off">
      <p className="kicker">Faltan</p>
      <p className="display tabular mt-1 flex items-baseline gap-3 text-[4.5rem] font-light leading-none md:text-[6.5rem]">
        <span>{days ?? "—"}</span>
        <span className="font-sans text-base font-normal text-ink-2">días</span>
        <span className="text-[2.2rem] md:text-[3rem]">{hours ?? "—"}</span>
        <span className="font-sans text-base font-normal text-ink-2">h</span>
      </p>
      <p className="mt-2 text-sm text-ink-2">
        para la jornada electoral del <strong className="text-ink">domingo 29 de noviembre de 2026</strong>
      </p>
    </div>
  );
}
