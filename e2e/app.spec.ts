import { test, expect } from "@playwright/test";

test("portada: mensaje, partidos con foto, encuesta y accesos", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Compara.");
  await expect(page.getByText(/Faltan \d+ días/)).toBeVisible();
  for (const n of ["Emilio Delgado Orgaz", "Irene Montero Gil", "Alberto Núñez Feijóo", "Pedro Sánchez Pérez-Castejón", "Santiago Abascal Conde"]) await expect(page.getByText(n).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /Hemiciclo de 350 escaños/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Hacer el test/ })).toBeVisible();
});

test("comparador: mínimo dos partidos, URL compartible y ficha con fuente", async ({ page, isMobile }) => {
  await page.goto("/comparador?p=pp,vox&t=vivienda");
  await expect(page.getByRole("heading", { name: "Vivienda", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: /^PP Comparando/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "al menos dos" })).toBeVisible();
  await page.getByRole("button", { name: /^PSOE Añadir/ }).click();
  await expect(page).toHaveURL(/p=pp%2Cvox%2Cpsoe|p=pp,vox,psoe/);
  await page.getByRole("radio", { name: "Solo diferencias" }).click();
  await expect(page).toHaveURL(/m=diferencias/);
  await page.getByRole("radio", { name: "Mostrar todo" }).click();
  await page.locator("button:visible", { hasText: "Derogar la Ley 12/2023" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Lo que dice el documento")).toBeVisible();
  await expect(dialog.getByText(/Página \d+ del PDF/)).toBeVisible();
  void isMobile;
});

test("test: temas, responder, revisar, porcentajes y borrar sin enviar datos", async ({ page }) => {
  test.setTimeout(150_000);
  const posts: string[] = [];
  page.on("request", (r) => r.method() !== "GET" && posts.push(r.url()));
  await page.goto("/test");
  await page.getByRole("button", { name: "Empezar el test" }).click();
  await page.getByRole("radio", { name: "Muy de acuerdo", exact: true }).click();
  await expect(page.getByText(/^2\s*\/\s*28$/)).toBeVisible();
  await page.getByRole("radio", { name: "En desacuerdo", exact: true }).click();
  await expect(page.getByText(/^3\s*\/\s*28$/)).toBeVisible();
  await page.getByRole("button", { name: "Saltar" }).click();
  await expect(page.getByText(/^4\s*\/\s*28$/)).toBeVisible();
  await page.getByRole("button", { name: "Anterior" }).click();
  await expect(page.getByText(/^3\s*\/\s*28$/)).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("boletin29n.test.v1"))).toContain("muy_acuerdo");
  for (const [k, a] of ["Muy de acuerdo", "En desacuerdo", "De acuerdo", "Muy en desacuerdo"].entries()) {
    await page.getByRole("radio", { name: a, exact: true }).click();
    await expect(page.getByText(new RegExp(`^${4 + k}\\s*/\\s*28$`))).toBeVisible();
  }
  for (let i = 0; i < 22; i++) await page.getByRole("button", { name: /Siguiente|Revisar/ }).click();
  await expect(page.getByRole("heading", { name: "Revisa tus respuestas" })).toBeVisible();
  await page.getByRole("button", { name: "Ver mi resultado" }).click();
  await expect(page.getByRole("heading", { name: "Tu resultado" })).toBeVisible();
  const winner = page.getByRole("region", { name: "Partido con mayor coincidencia" });
  await expect(winner.getByText(/Partido con el que más coincides|Empate/)).toBeVisible();
  await expect(winner.getByText(/^\d+ %$/).first()).toBeVisible();
  await expect(page.getByText("¿Cómo se calcula?")).toBeVisible();
  await expect(page.getByText(/ranking personal|partido ideal|deberías votar/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Borrar mis respuestas" }).click();
  expect(await page.evaluate(() => sessionStorage.getItem("boletin29n.test.v1"))).toBeNull();
  expect(posts).toEqual([]);
});

test("pactos: alianza hipotética y escenario propio con investidura", async ({ page }) => {
  await page.goto("/pactos");
  await page.getByRole("option", { name: /Hamalgama/ }).click();
  await page.getByRole("button", { name: /^PP 137/ }).click();
  await page.getByRole("button", { name: /^Vox 70/ }).click();
  await expect(page.getByText(/Supera la mayoría absoluta en 31/)).toBeVisible();
  await page.getByRole("button", { name: "Usar esta encuesta en mi escenario" }).click();
  await expect(page.getByText("350 escaños asignados")).toBeVisible();
  await page.getByRole("radiogroup", { name: "Voto de PP" }).getByRole("radio", { name: "Sí" }).click();
  await page.getByRole("radiogroup", { name: "Voto de Vox" }).getByRole("radio", { name: "Sí" }).click();
  await expect(page.getByText("207 sí · necesita 176")).toBeVisible();
});

test("puntos en común, organigrama y promesas 2023", async ({ page }) => {
  await page.goto("/puntos-en-comun");
  await expect(page.getByText(/puntos en común$/)).toBeVisible();
  await page.goto("/quien-hace-que");
  await page.getByRole("tab", { name: "Gobierno" }).click();
  await expect(page.getByText("Carlos Cuerpo Caballero")).toBeVisible();
  await page.goto("/promesas");
  await expect(page.getByText("frases de compromiso identificadas")).toBeVisible();
  await page.getByRole("button", { name: /Aprobar la Ley de Derecho de Defensa/ }).click();
  await expect(page.getByRole("dialog").getByText(/Ley Orgánica 5\/2024/).first()).toBeVisible();
});

test("observatorio: serie, tabla y CSV", async ({ page }) => {
  await page.goto("/observatorio?i=inflacion");
  await expect(page.getByRole("heading", { name: /Inflación general/ })).toBeVisible();
  await page.getByRole("button", { name: "Tabla" }).click();
  await expect(page.locator("table tbody tr").first()).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar CSV" }).click()]);
  expect(dl.suggestedFilename()).toBe("inflacion.csv");
});

test("votaciones: filtro por tipo y ficha con hemiciclo", async ({ page }) => {
  await page.goto("/votaciones?tipo=investidura");
  await expect(page.getByText(/3 votaciones/)).toBeVisible();
  await page.goto("/votaciones/L15-S130-V010");
  await expect(page.getByRole("img", { name: /Hemiciclo de la votación/ })).toBeVisible();
  await page.getByRole("radio", { name: "Por grupo" }).click();
  await expect(page.getByText("G. P. Popular").first()).toBeVisible();
});

test("buscador y aviso de candidaturas no analizadas", async ({ page }) => {
  await page.goto("/buscar?q=alquiler");
  await expect(page.getByText(/Propuestas verificadas, por partido/)).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("contentinfo")).toHaveText("Hecho por Jaime Borras");
});
