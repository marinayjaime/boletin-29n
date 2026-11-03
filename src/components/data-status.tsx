import { CircleAlert, CircleCheck, RefreshCw, UserCheck, UserX } from "lucide-react";
import { getDataStatus } from "@/lib/data";
import { formatDate, formatShortDate } from "@/lib/format";
import { isFailing } from "@/lib/review";

/**
 * Dos fechas separadas: la última actualización automática satisfactoria y la última revisión editorial.
 * Un conjunto pendiente de revisión humana nunca se presenta solo como «actualizado».
 */
export function DataStatus({ datasets = [], editorial = [] }: { datasets?: string[]; editorial?: string[] }) {
  const st = getDataStatus();
  const items = [
    ...datasets.map((id) => {
      const d = st.datasets[id];
      if (!d) return null;
      const failedLast = isFailing(d);
      return (
        <li key={id} className="chip !cursor-default" title={failedLast ? `Último intento fallido: ${d.lastError!.message}` : d.lastAttempt?.detail}>
          {failedLast ? <CircleAlert size={14} className="text-no-ink" aria-hidden /> : <RefreshCw size={14} className="text-yes-ink" aria-hidden />}
          <span>
            {d.label} · {d.lastSuccess ? `actualizado ${formatShortDate(d.lastSuccess.slice(0, 10))}` : "sin actualización correcta"}
            {failedLast ? ` · falló el ${formatShortDate(d.lastError!.at.slice(0, 10))}` : ""}
          </span>
        </li>
      );
    }),
    ...editorial.map((id) => {
      const e = st.editorial[id];
      if (!e) return null;
      return (
        <li key={`e-${id}`} className="chip !cursor-default" title={e.scope}>
          {e.human ? <UserCheck size={14} className="text-yes-ink" aria-hidden /> : <UserX size={14} className="text-partial-ink" aria-hidden />}
          <span>
            {e.label} · {e.human ? `revisado por ${e.by} (${formatShortDate(e.date)})` : `IA, sin revisión humana (${formatShortDate(e.date)})`}
          </span>
        </li>
      );
    }),
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <ul className="mb-6 flex flex-wrap gap-2 text-xs font-bold" aria-label="Estado de los datos">
      {items}
    </ul>
  );
}

/** Tabla completa para la metodología. */
export function DataStatusTable() {
  const st = getDataStatus();
  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Object.entries(st.datasets).map(([id, d]) => {
          const failedLast = isFailing(d);
          return (
            <li key={id} className="rounded-2xl bg-surface p-3 text-sm">
              <p className="flex items-center gap-2 font-extrabold text-ink">
                {failedLast ? <CircleAlert size={15} className="text-no-ink" aria-hidden /> : <CircleCheck size={15} className="text-yes-ink" aria-hidden />} {d.label}
              </p>
              <p className="mt-1 font-semibold">Última actualización correcta: {d.lastSuccess ? formatDate(d.lastSuccess.slice(0, 10)) : "ninguna registrada"}</p>
              {d.lastError && (
                <p className="mt-0.5 font-semibold text-no-ink">
                  Último error ({formatDate(d.lastError.at.slice(0, 10))}): {d.lastError.message}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Object.entries(st.editorial).map(([id, e]) => (
          <li key={id} className="rounded-2xl bg-surface p-3 text-sm">
            <p className="flex items-center gap-2 font-extrabold text-ink">
              {e.human ? <UserCheck size={15} className="text-yes-ink" aria-hidden /> : <UserX size={15} className="text-partial-ink" aria-hidden />} {e.label}
            </p>
            <p className="mt-1 font-semibold">
              {e.human ? "Revisión humana" : "Preparado por IA, sin revisión humana"} · {formatDate(e.date)}
            </p>
            <p className="mt-0.5 text-ink-3">{e.scope}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
