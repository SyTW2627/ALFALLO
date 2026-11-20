import { test, expect } from "@playwright/test";
import {
  anadirEjercicio,
  empezarEntrenamiento,
  getTestUserEmail,
  iniciarSesion,
  publicarEntrenamiento,
  registrarSeries,
  tarjetaPost,
  terminarEntrenamiento,
} from "./helpers";

// Proyecto "seed-workout": deja al usuario compartido con un entrenamiento terminado y publicado
test("Creación y uso de un nuevo entrenamiento recién creado", async ({ page }) => {
  await iniciarSesion(page, getTestUserEmail());
  await empezarEntrenamiento(page, "Fuerza1", "Fuerza");

  const ejercicio1 = await anadirEjercicio(page, "Espalda");
  await registrarSeries(page, ejercicio1, "20", "15", 2);

  const ejercicio2 = await anadirEjercicio(page, "Dorsal");
  await registrarSeries(page, ejercicio2, "10", "10", 2);

  // Mover un ejercicio cambia el orden de las tarjetas
  const ejercicios = page.getByRole("region", { name: "Ejercicios" }).getByRole("article");
  await expect(ejercicios).toHaveCount(2);
  await page.getByRole("button", { name: `Subir ${ejercicio2}`, exact: true }).click();
  await expect(ejercicios.first()).toContainText(ejercicio2);

  await terminarEntrenamiento(page);
  await expect(page.getByText("Fuerza1").first()).toBeVisible();

  const texto = `Primer entrenamiento ${Date.now()}`;
  await publicarEntrenamiento(page, texto);

  // El post aparece en el feed como propio
  await page.getByRole("link", { name: "Ver el feed" }).click();
  const post = tarjetaPost(page, texto);
  await expect(post).toBeVisible();
  await expect(post).toContainText("(tú)");
});