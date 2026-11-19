import { expect, test } from "@playwright/test";

test("muestra errores al enviar el formulario de acceso con datos inválidos", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
  await page.getByLabel("Email").fill("no-es-un-email");
  await page.getByLabel("Contraseña").fill("123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("El email no es válido.")).toBeVisible();
  await expect(page.getByText("Mínimo 8 caracteres.")).toBeVisible();
});
