/**
 * Marca tipográfica neutral para cada candidatura. Todas usan el mismo estilo,
 * tamaño y color: no se reproducen logotipos ni colores corporativos para no
 * introducir diferencias visuales entre partidos.
 */
export function PartyMark({ monogram, size = 40, label }: { monogram: string; size?: number; label?: string }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="inline-grid shrink-0 place-items-center rounded-full border border-ink font-mono font-medium tracking-tight text-ink"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {monogram}
    </span>
  );
}
