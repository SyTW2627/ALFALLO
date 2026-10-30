// Cliente de la API de AlFallo.

import { getToken, normalizarUsuario } from "./auth.js";

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

async function peticion(ruta, { metodo = "GET", cuerpo, auth = false } = {}) {
  const headers = { Accept: "application/json" };
  if (cuerpo !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ApiError("No se ha podido conectar con el servidor.", { red: true });
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
  return datos;
}


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


export async function obtenerPerfil() {
  const r = await peticion("/users/profile", { auth: true });
  return normalizarUsuario(r.user);
}

export async function contarEntrenamientos() {
  const r = await peticion("/workouts/history", { auth: true });
  return Array.isArray(r) ? r.length : null;
}

/* ---------- Entrenamiento ---------- */

// Catálogo de ejercicios.
export function obtenerEjercicios() {
  return peticion("/exercises", { auth: true });
}

// Rutinas del usuario (con los ejercicios ya populados).
export function obtenerRutinas() {
  return peticion("/routines", { auth: true });
}

// Entrenamientos terminados, del más reciente al más antiguo.
export function obtenerHistorial() {
  return peticion("/workouts/history", { auth: true });
}

// Entrenamiento en curso o null si no hay ninguno.
export function obtenerEntrenamientoActivo() {
  return peticion("/workouts/active", { auth: true });
}

export function empezarEntrenamiento({ titulo, objetivo }) {
  return peticion("/workouts/start", {
    metodo: "POST",
    auth: true,
    cuerpo: { title: titulo, objective: objetivo || undefined },
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

export function terminarEntrenamiento() {
  return peticion("/workouts/finish", { metodo: "POST", auth: true });
}

export function descartarEntrenamiento() {
  return peticion("/workouts/active", { metodo: "DELETE", auth: true });
}