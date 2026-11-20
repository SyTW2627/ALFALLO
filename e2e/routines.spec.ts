import { test, expect } from "@playwright/test";
import { anadirEjercicio, getTestUserEmail, iniciarSesion, irA } from "./helpers";

test("Creación, edición y borrado de una rutina", async ({ page }) => {
  const nombre = `Rutina E2E ${Date.now()}`;

  await iniciarSesion(page, getTestUserEmail());
  await irA(page, "/rutinas");
  await expect(page.getByRole("heading", { name: "Tus rutinas" })).toBeVisible();

  // Si el usuario no tiene rutinas sale "Crear mi primera rutina"; si tiene, "Nueva rutina"
  await page.getByRole("button", { name: /Crear mi primera rutina|Nueva rutina/ }).click();
  await page.getByRole("textbox", { name: "Nombre de la rutina" }).fill(nombre);

  // Día 1: resistencia, con dos ejercicios
  await page.getByRole("button", { name: /^Resistencia/ }).first().click();
  const ejercicio1 = await anadirEjercicio(page, "Espalda", page.getByRole("button", { name: "Añadir ejercicio" }).first());
  const ejercicio2 = await anadirEjercicio(page, "Hombro lateral", page.getByRole("button", { name: "Añadir ejercicio" }).first());

  // Los contadores respetan el rango del objetivo: subir las series cambia el valor
  const fila2 = page.getByRole("listitem").filter({ hasText: ejercicio2 });
  const seriesAntes = await fila2.getByLabel("Series", { exact: true }).textContent();
  await fila2.getByRole("button", { name: "Subir series" }).click();
  await expect(fila2.getByLabel("Series", { exact: true })).not.toHaveText(seriesAntes ?? "");

  // Día 2, con un ejercicio
  await page.getByRole("button", { name: /^\+ Añadir día/ }).click();
  const ejercicio3 = await anadirEjercicio(page, "Dorsal", page.getByRole("button", { name: "Añadir ejercicio" }).nth(1));

  await page.getByRole("button", { name: "Crear rutina" }).click();

  // En el listado, cada rutina es un elemento de la lista con su nombre como título
  const tarjeta = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: nombre, exact: true }) });
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta).toContainText(`${ejercicio1} · ${ejercicio2}`);
  await expect(tarjeta).toContainText(ejercicio3);

  // Editar: subir el descanso del primer ejercicio y guardar
  await tarjeta.getByRole("button", { name: "Editar" }).click();
  const fila1 = page.getByRole("listitem").filter({ hasText: ejercicio1 });
  const descansoAntes = await fila1.getByLabel("Descanso", { exact: true }).textContent();
  await fila1.getByRole("button", { name: "Subir descanso" }).click();
  await expect(fila1.getByLabel("Descanso", { exact: true })).not.toHaveText(descansoAntes ?? "");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(tarjeta).toBeVisible();

  // Los cambios se han guardado en la API: siguen ahí tras recargar
  await irA(page, "/rutinas");
  await expect(tarjeta).toBeVisible();

  // Borrar la rutina
  await tarjeta.getByRole("button", { name: "Eliminar", exact: true }).click();
  await tarjeta.getByRole("button", { name: "Sí, eliminar" }).click();
  await expect(page.getByRole("heading", { name: nombre, exact: true })).toHaveCount(0);
});