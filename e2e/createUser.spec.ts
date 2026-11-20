import { test, expect } from "@playwright/test";
import { PASSWORD, getTestUserEmail, irA } from "./helpers";

// Proyecto "setup": crea el usuario que usan el resto de tests
test("Creación de un usuario correctamente", async ({ page }) => {
  await irA(page, "/");
  await page.getByRole("link", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL("/registro");
  await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));

  await page.getByRole("textbox", { name: "Nombre" }).fill("Tester E2E");
  await page.getByRole("textbox", { name: "Email" }).fill(getTestUserEmail());
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(PASSWORD);
  await page.getByRole("textbox", { name: "Repite la contraseña" }).fill(PASSWORD);

  // El botón "Ver" muestra la contraseña y "Ocultar" la vuelve a ocultar
  const contrasena = page.getByRole("textbox", { name: "Contraseña", exact: true });
  await page.getByRole("button", { name: "Ver" }).click();
  await expect(contrasena).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar" }).click();
  await expect(contrasena).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Crear cuenta" }).click();

  // Entra en la app con la sesión iniciada
  await expect(page).toHaveURL("/");
  await expect(page.getByText("Vamos a por más, Tester.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ir a mi perfil" })).toBeVisible();
});