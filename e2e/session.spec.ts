import { test, expect } from "@playwright/test";
import { PASSWORD, borrarCuenta, irA, iniciarSesion, registrarPorApi } from "./helpers";

// Control de sesión: registro con email repetido, rutas privadas, token rechazado y cierre de sesión
const tokens: string[] = [];

test.afterAll(async ({ playwright }) => {
  const api = await playwright.request.newContext();
  for (const token of tokens) await borrarCuenta(api, token);
  await api.dispose();
});

test("registrarse con un email ya usado muestra el error de la API", async ({ page, request }) => {
  const usuario = await registrarPorApi(request, "Repetido");
  tokens.push(usuario.token);

  await irA(page, "/registro");
  await page.getByRole("textbox", { name: "Nombre" }).fill("Otro");
  await page.getByRole("textbox", { name: "Email" }).fill(usuario.email);
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(PASSWORD);
  await page.getByRole("textbox", { name: "Repite la contraseña" }).fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.getByRole("alert")).toHaveText("El correo electrónico ya está registrado");
  await expect(page).toHaveURL("/registro");
});

test("sin sesión, una página privada redirige al login", async ({ page }) => {
  await page.goto("/entrenamiento");
  await expect(page).toHaveURL(/\/login/);
});

test("con la sesión iniciada, el login devuelve al inicio", async ({ page, request }) => {
  const usuario = await registrarPorApi(request, "Sesion Abierta");
  tokens.push(usuario.token);

  await iniciarSesion(page, usuario.email);
  await page.goto("/login");
  await expect(page).toHaveURL("/");
});

test("si la API rechaza el token, avisa de que la sesión ha caducado", async ({ page }) => {
  // Token con forma de JWT y sin caducar, pero firmado con otra clave: la API responde 403
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const falso = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ id: "000000000000000000000000", role: "user", exp })}.firma`;

  await page.goto("/");
  await page.evaluate((token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify({ id: "000000000000000000000000", nombre: "Falso", email: "falso@example.com", rol: "user" }));
  }, falso);

  await page.goto("/perfil-usuario");

  await expect(page).toHaveURL("/login?sesion=caducada");
  await expect(page.getByText("Tu sesión ha caducado. Vuelve a iniciar sesión.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
});

test("cerrar sesión borra el token y vuelve al inicio sin sesión", async ({ page, request }) => {
  const usuario = await registrarPorApi(request, "Para Salir");
  tokens.push(usuario.token);

  await iniciarSesion(page, usuario.email);
  await page.getByRole("link", { name: "Ir a mi perfil" }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();

  await expect(page).toHaveURL("/");
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
  await expect(page.getByRole("link", { name: "Ir a mi perfil" })).toHaveCount(0);
});