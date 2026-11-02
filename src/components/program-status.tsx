import type { ElectoralCycle, Party } from "@/lib/schema";
import { formatDate } from "@/lib/format";

export function ProgramStatusStrip({ cycle, parties }: { cycle: ElectoralCycle; parties: Party[] }) {
  const pending = cycle.programStatus.filter((s) => s.status === "pendiente");
  return (
    <div className="mb-6 grid gap-px overflow-hidden rounded border border-rule bg-rule sm:grid-cols-5" role="list" aria-label="Estado de los programas 2026">
      {parties.map((p) => {
        const s = cycle.programStatus.find((x) => x.partyId === p.id);
        return (
          <div key={p.id} role="listitem" className="bg-paper p-3">
            <p className="text-sm font-semibold">{p.shortName}</p>
            <p className={`mt-1 text-xs ${s?.status === "publicado" ? "text-yes" : "text-ink-2"}`}>
              {s?.status === "publicado" ? "Programa 2026 publicado" : "Programa electoral 2026 pendiente de publicación"}
            </p>
          </div>
        );
      })}
      <p className="col-span-full bg-paper-2 px-3 py-2 font-mono text-[0.68rem] text-ink-3">
        {pending.length} de {parties.length} programas pendientes · comprobado el {formatDate(cycle.programStatus[0]?.checkedAt ?? "")}. Mientras
        tanto se muestran documentos anteriores, identificados como tales.
      </p>
    </div>
  );
}
