/**
 * Geometría del hemiciclo: reparte N escaños en filas semicirculares y los ordena
 * por ángulo, de modo que cada grupo ocupa una cuña contigua. Función pura (tests/hemicycle.test.ts).
 */
export type Seat = { x: number; y: number; angle: number; row: number };

export function hemicycleSeats(n: number, rows = Math.max(4, Math.round(Math.sqrt(n / 2.4)))): Seat[] {
  if (n <= 0) return [];
  const r0 = 0.38;
  const radii = Array.from({ length: rows }, (_, i) => r0 + ((1 - r0) * i) / Math.max(1, rows - 1));
  const total = radii.reduce((a, r) => a + r, 0);
  // escaños por fila proporcionales al radio; ajuste del redondeo para sumar exactamente n
  const perRow = radii.map((r) => Math.floor((n * r) / total));
  let rest = n - perRow.reduce((a, b) => a + b, 0);
  for (let i = rows - 1; rest > 0; i = (i - 1 + rows) % rows, rest--) perRow[i]++;
  const seats: Seat[] = [];
  radii.forEach((r, row) => {
    const k = perRow[row];
    for (let j = 0; j < k; j++) {
      const angle = k === 1 ? Math.PI / 2 : Math.PI - (Math.PI * j) / (k - 1);
      // redondeo: evita diferencias de coma flotante entre servidor y navegador
      seats.push({ x: Math.round(r * Math.cos(angle) * 1e4) / 1e4, y: Math.round(r * Math.sin(angle) * 1e4) / 1e4, angle, row });
    }
  });
  return seats.sort((a, b) => b.angle - a.angle || a.row - b.row);
}
