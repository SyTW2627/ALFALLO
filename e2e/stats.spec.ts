import { test, expect, type Page } from "@playwright/test";
import { getTestUserEmail, iniciarSesion, irA } from "./helpers";

// Tarjeta de la página de estadísticas, buscada por su título
const tarjeta = (page: Page, titulo: string) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: titulo, exact: true }) });

test("Consulta de las estadísticas del usuario", async ({ page }) => {
  // El usuario compartido ya tiene el entrenamiento "Fuerza1" (newWorkout.spec.ts),
  // con un ejercicio de espalda y otro de dorsal
  await iniciarSesion(page, getTestUserEmail());
  await irA(page, "/estadisticas");

  await expect(page.getByRole("heading", { name: "Tu progreso" })).toBeVisible();
  await expect(page.getByText("Aún no hay nada que medir.")).toHaveCount(0);

  await expect(tarjeta(page, "Últimos entrenamientos")).toContainText("Fuerza1");
  await expect(tarjeta(page, "Récords personales")).not.toContainText("Todavía no hay récords con peso.");
  await expect(tarjeta(page, "Series por zona")).toContainText("Espalda");
  await expect(tarjeta(page, "Series por zona")).toContainText("Dorsal");

  // Cambiar el ejercicio de la gráfica de progresión
  const selector = tarjeta(page, "Progresión de peso").getByRole("combobox");
  await expect(selector.locator("option")).toHaveCount(2);
  const inicial = await selector.inputValue();
  await selector.selectOption({ index: 1 });
  await expect(selector).not.toHaveValue(inicial);
});