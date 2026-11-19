// Cliente de la API de AlFallo.

import { getToken, getUsuario, normalizarUsuario } from "./auth.js";

// Si el servidor no responde en este tiempo, se trata como "sin conexión"
// (en el gimnasio es habitual tener cobertura que no llega a cargar nada).
const TIEMPO_MAXIMO_MS = 15000;

const API_URL = (import.meta.env?.PUBLIC_API_URL ?? "http://localhost:3000/api").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(mensaje, { status = 0, red = false } = {}) {
    super(mensaje);
    this.name = "ApiError";
    this.status = status; 
    this.red = red; 
  }
}

export function sesionRechazada(err) {
  return err instanceof ApiError && [401, 403, 404].includes(err.status);
}

/* ---------- Copia local de las lecturas (para usar la app sin conexión) ----------
 * Las peticiones GET marcadas con `copiaLocal: true` guardan su última respuesta.
 * Si después no hay conexión, se devuelve esa copia en lugar de fallar.
 */
const PREFIJO_COPIA = "alfallo:copia:";

const claveCopia = (ruta) => `${PREFIJO_COPIA}${getUsuario()?.id ?? "anonimo"}:${ruta}`;

function guardarCopia(ruta, datos) {
  try {
    localStorage.setItem(claveCopia(ruta), JSON.stringify(datos));
  } catch {
    /* almacenamiento lleno o no disponible: se sigue sin copia */
  }
}

function leerCopia(ruta) {
  try {
    const raw = localStorage.getItem(claveCopia(ruta));
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function peticion(ruta, { metodo = "GET", cuerpo, auth = false, copiaLocal = false } = {}) {
  const headers = { Accept: "application/json" };
  if (cuerpo !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  const control = new AbortController();
  const limite = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS);
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: control.signal,
    });
  } catch {
    if (copiaLocal) {
      const copia = leerCopia(ruta);
      if (copia !== undefined) return copia;
    }
    throw new ApiError("No se ha podido conectar con el servidor.", { red: true });
  } finally {
    clearTimeout(limite);
  }

  let datos = null;
  try {
    datos = await res.json();
  } catch {
    throw new ApiError(`Respuesta inesperada del servidor (${res.status}).`, { status: res.status });
  }

  if (!res.ok) {
    throw new ApiError(datos?.message || `Error inesperado del servidor (${res.status}).`, {
      status: res.status,
    });
  }
  if (copiaLocal) guardarCopia(ruta, datos);
  return datos;
}

// Indica si un error es por falta de conexión (y no un error del servidor).
export const esErrorDeRed = (err) => err instanceof ApiError && err.red;


export async function iniciarSesion({ email, password }) {
  const r = await peticion("/auth/login", { metodo: "POST", cuerpo: { email, password } });
  return { token: r.token, usuario: normalizarUsuario(r.user) };
}

export async function registrarUsuario({ nombre, email, password }) {
  const r = await peticion("/auth/register", {
    metodo: "POST",
    cuerpo: { name: nombre, email, password },
  });
  return { token: r.token, usuario: normalizarUsuario(r.user) };
}

// Sirve para entrar y para registrarse: `credential` es el token que devuelve el botón de Google.
export async function entrarConGoogle(credential) {
  const r = await peticion("/auth/google", { metodo: "POST", cuerpo: { credential } });
  return { token: r.token, usuario: normalizarUsuario(r.user) };
}


export async function obtenerPerfil() {
  const r = await peticion("/users/profile", { auth: true, copiaLocal: true });
  return normalizarUsuario(r.user);
}

export async function contarEntrenamientos() {
  const r = await peticion("/workouts/history", { auth: true, copiaLocal: true });
  return Array.isArray(r) ? r.length : null;
}

/* ---------- Entrenamiento ---------- */

// Catálogo de ejercicios.
export function obtenerEjercicios() {
  return peticion("/exercises", { auth: true, copiaLocal: true });
}

// Rutinas del usuario (con los ejercicios ya populados).
export function obtenerRutinas() {
  return peticion("/routines", { auth: true, copiaLocal: true });
}

// Entrenamientos terminados, del más reciente al más antiguo.
export function obtenerHistorial() {
  return peticion("/workouts/history", { auth: true, copiaLocal: true });
}

// Entrenamiento en curso o null si no hay ninguno.
export function obtenerEntrenamientoActivo() {
  return peticion("/workouts/active", { auth: true });
}

// `inicio`: hora real de inicio (si se empezó sin conexión, se envía más tarde).
export function empezarEntrenamiento({ titulo, objetivo, inicio }) {
  return peticion("/workouts/start", {
    metodo: "POST",
    auth: true,
    cuerpo: { title: titulo, objective: objetivo || undefined, startedAt: inicio },
  });
}

// Sustituye la lista completa de ejercicios/series del entrenamiento en curso.
// `ejercicios` usa la forma del frontend: [{ id, series: [{ reps, kg }] }]
export function guardarEntrenamiento({ ejercicios, notas }) {
  return peticion("/workouts/active", {
    metodo: "PUT",
    auth: true,
    cuerpo: {
      exercises: ejercicios.map((e) => ({
        exercise: e.id,
        sets: e.series.map((s) => ({ reps: s.reps, weightKg: s.kg })),
      })),
      notes: notas,
    },
  });
}

// `fin`: hora real de fin (si se terminó sin conexión, se envía más tarde).
export function terminarEntrenamiento({ fin } = {}) {
  return peticion("/workouts/finish", { metodo: "POST", auth: true, cuerpo: { finishedAt: fin } });
}

export function descartarEntrenamiento() {
  return peticion("/workouts/active", { metodo: "DELETE", auth: true });
}

/* ---------- Historial (entrenamientos terminados) ---------- */

export function obtenerEntrenamiento(id) {
  return peticion(`/workouts/${encodeURIComponent(id)}`, { auth: true });
}

// `cambios` usa la forma del frontend: { titulo, objetivo, notas, inicio, fin, ejercicios: [{ id, series: [{ reps, kg }] }] }
export function editarEntrenamiento(id, { titulo, objetivo, notas, inicio, fin, ejercicios }) {
  return peticion(`/workouts/${encodeURIComponent(id)}`, {
    metodo: "PUT",
    auth: true,
    cuerpo: {
      title: titulo,
      objective: objetivo || null,
      notes: notas,
      startedAt: inicio,
      finishedAt: fin,
      exercises: ejercicios?.map((e) => ({
        exercise: e.id,
        sets: e.series.map((s) => ({ reps: s.reps, weightKg: s.kg })),
      })),
    },
  });
}

export function eliminarEntrenamiento(id) {
  return peticion(`/workouts/${encodeURIComponent(id)}`, { metodo: "DELETE", auth: true });
}

/* ---------- Rutinas ---------- */

export function obtenerRutina(id) {
  return peticion(`/routines/${encodeURIComponent(id)}`, { auth: true, copiaLocal: true });
}

// `rutina` ya viene en el formato de la API: { name, days: [...] } (ver aPayload en lib/rutinas.js)
export function crearRutina(rutina) {
  return peticion("/routines", { metodo: "POST", auth: true, cuerpo: rutina });
}

export function actualizarRutina(id, rutina) {
  return peticion(`/routines/${encodeURIComponent(id)}`, { metodo: "PUT", auth: true, cuerpo: rutina });
}

export function eliminarRutina(id) {
  return peticion(`/routines/${encodeURIComponent(id)}`, { metodo: "DELETE", auth: true });
}

/* ---------- Perfil y progreso ---------- */

// Actualiza solo los campos que se pasan. `pesoKg` se guarda en el historial de peso.
export async function actualizarPerfil({ nombre, email, sexo, pesoKg } = {}) {
  const r = await peticion("/users/profile", {
    metodo: "PUT",
    auth: true,
    cuerpo: { name: nombre, email, sex: sexo, bodyWeightKg: pesoKg },
  });
  return normalizarUsuario(r.user);
}

// Rangos de fuerza, hitos y retos semanales.
export function obtenerProgreso() {
  return peticion("/progress", { auth: true, copiaLocal: true });
}

/* ---------- Feed comunitario (posts) ---------- */

// Posts más recientes, paginados (la API limita `limite` a 50).
export function obtenerFeed({ pagina = 1, limite = 10 } = {}) {
  return peticion(`/posts/feed?page=${pagina}&limit=${limite}`, { auth: true, copiaLocal: true });
}

export function obtenerPost(id) {
  return peticion(`/posts/${encodeURIComponent(id)}`, { auth: true });
}

// Publica un entrenamiento TERMINADO. Si ya estaba publicado la API responde 409.
export function publicarEntrenamiento({ idEntrenamiento, texto }) {
  return peticion("/posts", {
    metodo: "POST",
    auth: true,
    cuerpo: { workoutId: idEntrenamiento, caption: texto?.trim() || undefined },
  });
}

export function eliminarPost(id) {
  return peticion(`/posts/${encodeURIComponent(id)}`, { metodo: "DELETE", auth: true });
}

// Devuelven { kudosCount, hasKudo }.
export function darKudos(id) {
  return peticion(`/posts/${encodeURIComponent(id)}/kudos`, { metodo: "POST", auth: true });
}

export function quitarKudos(id) {
  return peticion(`/posts/${encodeURIComponent(id)}/kudos`, { metodo: "DELETE", auth: true });
}

export function comentarPost(id, texto) {
  return peticion(`/posts/${encodeURIComponent(id)}/comments`, {
    metodo: "POST",
    auth: true,
    cuerpo: { text: texto },
  });
}

export function eliminarComentario(idPost, idComentario) {
  return peticion(
    `/posts/${encodeURIComponent(idPost)}/comments/${encodeURIComponent(idComentario)}`,
    { metodo: "DELETE", auth: true }
  );
}

