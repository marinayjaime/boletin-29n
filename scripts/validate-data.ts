/**
 * Validación integral de los datos antes de publicar.
 * Uso: npx tsx scripts/validate-data.ts  (también se ejecuta en `npm test`)
 */
import { validateAll } from "../src/lib/validate";

const { errors, warnings, stats } = validateAll();
for (const w of warnings) console.warn(`⚠ ${w}`);
for (const e of errors) console.error(`✗ ${e}`);
console.log(stats);
if (errors.length) {
  console.error(`\n${errors.length} errores`);
  process.exit(1);
}
console.log("✓ Datos válidos");
