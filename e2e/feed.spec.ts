import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  anadirEjercicio,
  borrarCuenta,
  empezarEntrenamiento,
  getTestUserEmail,
  iniciarSesion,
  olvidarSesion,
  publicarEntrenamiento,
  registrarPorApi,
  registrarSeries,
  tarjetaPost,
  terminarEntrenamiento,
} from "./helpers";

const tokens: string[] = [];

test.afterAll(async ({ playwright }) => {
  const api = await playwright.request.newContext();
  for (const token of tokens) await borrarCuenta(api, token);
  await api.dispose();
});

// Un usuario nuevo hace un entrenamiento corto y lo publica con el texto indicado
async function publicarComoNuevoUsuario(page: Page, request: APIRequestContext, nombre: string, texto: string) {
  const usuario = await registrarPorApi(request, nombre);
  tokens.push(usuario.token);

  await iniciarSesion(page, usuario.email);
  await empezarEntrenamiento(page, `Entreno de ${nombre}`);
  const ejercicio = await anadirEjercicio(page, "Espalda");
  await registrarSeries(page, ejercicio, "15", "20");
  await terminarEntrenamiento(page);
  await publicarEntrenamiento(page, texto);
  await olvidarSesion(page);
}

test("Dos usuarios publican su entrenamiento y un tercero los ve en el feed y da ánimos", async ({ page, request }) => {
  test.setTimeout(120_000); // dos entrenamientos completos por la interfaz

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const texto1 = `Publicado 1 ${id}`;
  const texto2 = `Publicado 2 ${id}`;

  await publicarComoNuevoUsuario(page, request, "Usuaria Uno", texto1);
  await publicarComoNuevoUsuario(page, request, "Usuario Dos", texto2);

  // El usuario compartido ve los dos posts, con su autor y sin marcarlos como propios
  await iniciarSesion(page, getTestUserEmail());
  const post1 = tarjetaPost(page, texto1);
  const post2 = tarjetaPost(page, texto2);
  await expect(post1).toBeVisible();
  await expect(post2).toBeVisible();
  await expect(post1).toContainText("Usuaria Uno");
  await expect(post2).toContainText("Usuario Dos");
  await expect(post1).not.toContainText("(tú)");

  // El más reciente aparece antes
  const textos = await page.getByRole("article").allTextContents();
  const pos1 = textos.findIndex((t) => t.includes(texto1));
  const pos2 = textos.findIndex((t) => t.includes(texto2));
  expect(pos2).toBeLessThan(pos1);

  // Dar ánimos cambia el botón y suma uno
  await post2.getByRole("button", { name: "Dar ánimos · 0" }).click();
  await expect(post2.getByRole("button", { name: "Ánimos dados · 1" })).toBeVisible();

  // Se ha guardado en la API: sigue igual tras recargar
  await page.reload();
  await expect(tarjetaPost(page, texto2).getByRole("button", { name: "Ánimos dados · 1" })).toBeVisible();
});