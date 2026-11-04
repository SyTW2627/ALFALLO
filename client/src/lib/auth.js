const TOKEN_KEY = "token";
const USUARIO_KEY = "usuario";

/* ---------- Almacenamiento ---------- */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function borrarAlmacenamiento() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
  } catch {
    
  }
}


function leerPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const relleno = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(relleno));
  } catch {
    return null;
  }
}

function tokenVigente(token) {
  const payload = leerPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  return payload.exp * 1000 > Date.now();
}

/* ---------- Usuario ---------- */
export function normalizarUsuario(u = {}) {
  return {
    id: u._id ?? u.id,
    nombre: u.name ?? "",
    email: u.email ?? "",
    rol: u.role ?? "user",
    creadoEn: u.createdAt ?? null,
  };
}

export function getUsuario() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    if (!tokenVigente(token)) {
      borrarAlmacenamiento();
      return null;
    }
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
    /* almacenamiento no disponible */
    }
}


export function actualizarUsuario(usuario) {
  try {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function cerrarSesion(destino = "/") {
  borrarAlmacenamiento();
  window.location.href = destino;
}

// ---------- Utilidades ----------
export function iniciales(nombre = "") {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const texto = (partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "");
  return texto.toUpperCase();
}