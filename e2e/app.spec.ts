import { test, expect } from "@playwright/test";

test("portada: mensaje, cuenta atrás y accesos", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tu voto.");
  await expect(page.getByText("Faltan")).toBeVisible();
  for (const t of ["Comparar partidos", "Test a ciegas", "Datos de España", "Votaciones del Congreso", "Promesas y hechos"]) await expect(page.getByRole("link", { name: new RegExp(t) }).first()).toBeVisible();
});

test("comparador: mínimo dos partidos, URL compartible y ficha con fuente", async ({ page }) => {
  await page.goto("/comparador?p=pp,vox&t=vivienda");
  await expect(page.getByRole("heading", { name: "Vivienda", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: /^PP PP$/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "al menos dos" })).toBeVisible();
  await page.getByRole("button", { name: /PSOE/ }).first().click();
  await expect(page).toHaveURL(/p=pp%2Cvox%2Cpsoe|p=pp,vox,psoe/);
  await page.getByRole("radio", { name: "Solo diferencias" }).click();
  await expect(page).toHaveURL(/m=diferencias/);
  await page.getByRole("radio", { name: "Mostrar todo" }).click();
  await page.locator("button", { hasText: "Derogar la Ley 12/2023" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Texto original")).toBeVisible();
  await expect(dialog.getByText(/Página \d+ del PDF/)).toBeVisible();
});

test("test a ciegas: responder, revisar, ver posturas y borrar sin enviar datos", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (r) => r.method() !== "GET" && posts.push(r.url()));
  await page.goto("/test");
  await page.getByRole("button", { name: "Empezar el test" }).click();
  await page.getByRole("radio", { name: "Muy de acuerdo", exact: true }).click();
  await expect(page.getByText("2 / 28")).toBeVisible();
  await page.getByRole("radio", { name: "En desacuerdo", exact: true }).click();
  await expect(page.getByText("3 / 28")).toBeVisible();
  await page.getByRole("button", { name: "Saltar" }).click();
  await expect(page.getByText("4 / 28")).toBeVisible();
  await page.getByRole("button", { name: "← Anterior" }).click();
  await expect(page.getByText("3 / 28")).toBeVisible();
  const stored = await page.evaluate(() => sessionStorage.getItem("boletin29n.test.v1"));
  expect(stored).toContain("muy_acuerdo");
  for (let i = 0; i < 26; i++) await page.getByRole("button", { name: /Siguiente|Revisar/ }).click();
  await expect(page.getByRole("heading", { name: "Revisa tus respuestas" })).toBeVisible();
  await page.getByRole("button", { name: "Ver las posturas documentadas" }).click();
  await expect(page.getByRole("heading", { name: "Lo que dejaron escrito" })).toBeVisible();
  await expect(page.getByText(/ranking|ganador|voto ideal/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Borrar mis respuestas" }).click();
  expect(await page.evaluate(() => sessionStorage.getItem("boletin29n.test.v1"))).toBeNull();
  expect(posts).toEqual([]);
});

test("observatorio: serie, tabla y CSV", async ({ page }) => {
  await page.goto("/observatorio?i=inflacion");
  await expect(page.getByRole("heading", { name: /Inflación general/ })).toBeVisible();
  await page.getByRole("button", { name: "Tabla" }).click();
  await expect(page.locator("table tbody tr").first()).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar CSV" }).click()]);
  expect(dl.suggestedFilename()).toBe("inflacion.csv");
  await expect(page).toHaveURL(/vista=tabla/);
});

test("votaciones: filtro por tipo y ficha con hemiciclo", async ({ page }) => {
  await page.goto("/votaciones?tipo=investidura");
  await expect(page.getByText(/3 votaciones/)).toBeVisible();
  await page.goto("/votaciones/L15-S130-V010");
  await expect(page.getByText("Enmienda a la totalidad").first()).toBeVisible();
  await expect(page.getByRole("img", { name: /Hemiciclo de la votación/ })).toBeVisible();
  await expect(page.getByText("G. P. Popular")).toBeVisible();
});

test("buscador: devuelve pasajes reales con página", async ({ page }) => {
  await page.goto("/buscar?q=alquiler");
  await expect(page.getByText(/Propuestas verificadas, por partido/)).toBeVisible({ timeout: 20000 });
  await expect(page.locator("a.cite-chip").first()).toContainText("p.");
});

test("aviso de candidaturas no analizadas presente", async ({ page }) => {
  await page.goto("/partidos");
  await expect(page.getByRole("note")).toContainText("cinco candidaturas");
});
