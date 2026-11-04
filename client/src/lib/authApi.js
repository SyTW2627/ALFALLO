import { api, ApiError } from "./api.js";

const CAMPO_NOMBRE = "nombre"; 
const CAMPO_PASSWORD_ACTUAL = "currentPassword";
const CAMPO_PASSWORD_NUEVA = "newPassword";

const extraerUsuario = (data) => data?.user ?? data?.usuario ?? data?.data ?? data;

export function normalizarUsuario(u) {
  const x = u ?? {};
  return {
    id: x._id ?? x.id ?? null,
    nombre: x.nombre ?? x.name ?? x.username ?? "",
    email: x.email ?? "",
    creadoEn: x.createdAt ?? x.creadoEn ?? x.fechaRegistro ?? null,
  };
}

function sesionDesde(data) {
  const token = data?.token ?? data?.accessToken ?? data?.jwt ?? null;
  return { token, usuario: normalizarUsuario(extraerUsuario(data)) };
}

async function completarUsuario(sesion) {
  if (sesion.usuario.email) return sesion;
  return { ...sesion, usuario: await obtenerPerfil(sesion.token) };
}

export async function iniciarSesion({ email, password }) {
  const data = await api("/api/auth/login", { method: "POST", auth: false, body: { email, password } });
  const sesion = sesionDesde(data);
  if (!sesion.token) throw new ApiError("El servidor no ha devuelto el token de sesión.");
  return completarUsuario(sesion);
}

export async function registrarUsuario({ nombre, email, password }) {
  const data = await api("/api/auth/register", {
    method: "POST",
    auth: false,
    body: { [CAMPO_NOMBRE]: nombre, email, password },
  });
  const sesion = sesionDesde(data);
  if (!sesion.token) return iniciarSesion({ email, password });
  return completarUsuario(sesion);
}

export async function obtenerPerfil(token) {
  const data = await api("/api/users/profile", { token });
  return normalizarUsuario(extraerUsuario(data));
}

export async function actualizarPerfil({ nombre, email }) {
  await api("/api/users/profile", { method: "PUT", body: { [CAMPO_NOMBRE]: nombre, email } });
  return obtenerPerfil();
}

export async function cambiarPassword({ actual, nueva }) {
  return api("/api/users/change-password", {
    method: "PATCH",
    body: { [CAMPO_PASSWORD_ACTUAL]: actual, [CAMPO_PASSWORD_NUEVA]: nueva },
  });
}

export async function eliminarCuenta() {
  return api("/api/users/account", { method: "DELETE" });
}