import { test, expect } from "@playwright/test";
import { getTestUserEmail, irA } from "./helpers";

test("muestra errores al enviar el formulario de acceso con datos inválidos", async ({ page }) => {
  await irA(page, "/login");

  await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
  await page.getByLabel("Email").fill("no-es-un-email");
  await page.getByLabel("Contraseña", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("El email no es válido.")).toBeVisible();
  await expect(page.getByText("Mínimo 8 caracteres.")).toBeVisible();
  await expect(page).toHaveURL("/login");
});

test("con una contraseña errónea no entra y muestra el error de la API", async ({ page }) => {
  await irA(page, "/login");
  await page.getByLabel("Email").fill(getTestUserEmail());
  await page.getByLabel("Contraseña", { exact: true }).fill("ContraseñaMala1");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toHaveText("Credenciales inválidas");
  await expect(page).toHaveURL("/login");
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
});