import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const PASSWORD = "12345678";
export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000/api";

// Email del usuario compartido (lo crea createUser.spec.ts)
export function getTestUserEmail(): string {
  const email = process.env.E2E_USER_EMAIL;
  if (!email) {
    throw new Error("E2E_USER_EMAIL no está definido en la configuración de Playwright.");
  }
  return email;
}

export const emailUnico = (prefijo = "e2e") =>
  `${prefijo}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Astro pinta los componentes de React en el servidor y luego los "hidrata" en el navegador.
// Si se escribe en un formulario antes de la hidratación, React borra lo escrito.
// Cada componente lleva el atributo `ssr` hasta que se hidrata: esperamos a que no quede ninguno.
export async function esperarHidratacion(page: Page) {
  await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
}

export async function irA(page: Page, ruta: string) {
  await page.goto(ruta);
  await esperarHidratacion(page);
}

// Crea un usuario directamente en la API (más rápido que pasar por el formulario)
export async function registrarPorApi(request: APIRequestContext, nombre: string, email = emailUnico()) {
  const res = await request.post(`${API_URL}/auth/register`, { data: { name: nombre, email, password: PASSWORD } });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = await res.json();
  return { email, nombre, token: body.token as string, id: body.user._id as string };
}

// Borra una cuenta con su token (para limpiar lo que crean los tests)
export async function borrarCuenta(request: APIRequestContext, token: string) {
  await request.delete(`${API_URL}/users/account`, { headers: { Authorization: `Bearer ${token}` } });
}

// Inicia sesión en la API y devuelve el token (para preparar datos sin pasar por la interfaz)
export async function loginPorApi(request: APIRequestContext, email: string, password = PASSWORD) {
  const res = await request.post(`${API_URL}/auth/login`, { data: { email, password } });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()).token as string;
}

// El usuario del token pasa a seguir al usuario con ese id
export async function seguirPorApi(request: APIRequestContext, token: string, idUsuario: string) {
  const res = await request.post(`${API_URL}/users/${idUsuario}/follow`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
}

// Inicia sesión desde el formulario y espera a estar en el inicio con la sesión abierta
export async function iniciarSesion(page: Page, email: string, password = PASSWORD) {
  await irA(page, "/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Ir a mi perfil" })).toBeVisible();
}

// Cierra la sesión sin pasar por el perfil (para cambiar de usuario dentro de un test)
export async function olvidarSesion(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

// Abre el buscador, filtra por zona y añade el primer ejercicio disponible.
// Devuelve su nombre: así los tests no dependen de qué ejercicios tenga cada catálogo.
export async function anadirEjercicio(page: Page, zona: string, boton = page.getByRole("button", { name: "Añadir ejercicio" })) {
  await boton.click();
  const buscador = page.getByRole("dialog", { name: "Añadir ejercicio" });
  await buscador.getByRole("group", { name: "Filtrar por zona" }).getByRole("button", { name: zona, exact: true }).click();

  // Primer resultado que no esté ya añadido
  const opcion = buscador.getByRole("list", { name: "Resultados" }).locator("button:enabled").first();
  await expect(opcion).toBeVisible();
  const nombre = (await opcion.locator("span > span").first().textContent())?.trim();
  if (!nombre) throw new Error(`No hay ejercicios de la zona "${zona}" en el catálogo`);

  await opcion.click();
  return nombre;
}

// Tarjeta de un ejercicio durante un entrenamiento
export const tarjetaEjercicio = (page: Page, nombre: string) => page.getByRole("article").filter({ hasText: nombre });

// Rellena peso y repeticiones en la tarjeta del ejercicio y pulsa "+ Serie" tantas veces como se indique
export async function registrarSeries(page: Page, nombre: string, kg: string, reps: string, veces = 1) {
  const tarjeta = tarjetaEjercicio(page, nombre);
  await tarjeta.getByLabel("Peso (kg)").fill(kg);
  await tarjeta.getByLabel("Reps").fill(reps);
  for (let i = 0; i < veces; i++) {
    await tarjeta.getByRole("button", { name: "+ Serie" }).click();
  }
  await expect(tarjeta.getByRole("button", { name: `Borrar serie ${veces}` })).toBeVisible();
  await cerrarTemporizador(page);
}

// Después de cada serie se abre el temporizador de descanso: se cierra para que no tape otros botones
export async function cerrarTemporizador(page: Page) {
  const saltar = page.getByRole("button", { name: "Saltar" });
  if (await saltar.isVisible()) await saltar.click();
}

// Empieza un entrenamiento libre con un título y, opcionalmente, un objetivo
export async function empezarEntrenamiento(page: Page, titulo: string, objetivo?: string) {
  await irA(page, "/entrenamiento");
  if (objetivo) await page.getByRole("button", { name: objetivo, exact: true }).click();
  await page.getByRole("textbox", { name: "Nombre" }).fill(titulo);
  await page.getByRole("button", { name: "Empezar entrenamiento" }).click();
  await expect(page.getByRole("button", { name: "Añadir ejercicio" })).toBeVisible();
}

// Termina el entrenamiento en curso y comprueba que aparece el resumen
export async function terminarEntrenamiento(page: Page) {
  await cerrarTemporizador(page);
  await page.getByRole("button", { name: "Terminar entrenamiento" }).click();
  await page.getByRole("button", { name: "Terminar", exact: true }).click();
  await expect(page.getByText("Entrenamiento completado")).toBeVisible();
}

// Publica el entrenamiento recién terminado desde el resumen
export async function publicarEntrenamiento(page: Page, texto: string) {
  await page.getByRole("textbox", { name: "Compártelo con la comunidad" }).fill(texto);
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("¡Publicado en la comunidad!")).toBeVisible();
}

// Tarjeta de un post del feed, buscada por su texto
export const tarjetaPost = (page: Page, texto: string) => page.getByRole("article").filter({ hasText: texto });

function escaparRegex(texto: string) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

