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