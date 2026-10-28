// Gestión de sesión en el navegador.
// TODO API ─ Cuando exista el backend, el token será el JWT real devuelto por
// /auth/login o /auth/registro, y el usuario vendrá de GET /usuarios/me.

const TOKEN_KEY = "token";
const USUARIO_KEY = "usuario";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Devuelve el usuario si hay sesión iniciada, o null si no la hay.
export function getUsuario() {
  try {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    const raw = localStorage.getItem(USUARIO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function estaLogueado() {
  return getUsuario() !== null;
}

export function guardarSesion({ token, usuario }) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  } catch {
    /* almacenamiento no disponible (modo privado, etc.) */
  }
}

export function cerrarSesion(destino = "/") {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
  } catch {
    /* nada que borrar */
  }
  window.location.href = destino;
}

// "Iker Martín" → "IM"
export function iniciales(nombre = "") {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const texto = (partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "");
  return texto.toUpperCase();
}