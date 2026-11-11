// Utilidades del feed comunitario: traducen los posts de la API (en inglés)
// a la forma que usan los componentes, igual que hace lib/entrenamiento.js.

import { normalizarEntrenamiento } from "./entrenamiento.js";

export const MAX_TEXTO_POST = 280; // mismo límite que el modelo Post (caption)
export const MAX_COMENTARIO = 500; // mismo límite que el modelo Comment (text)
export const POSTS_POR_PAGINA = 10;

// `user` llega populado ({ _id, name }) o como id / null si se borró la cuenta.
function normalizarAutor(u) {
  if (!u || typeof u !== "object") return { id: u ?? null, nombre: "Usuario eliminado" };
  return { id: u._id ?? u.id, nombre: u.name ?? "Usuario" };
}

export function normalizarComentario(c) {
  return {
    id: c._id ?? c.id,
    autor: normalizarAutor(c.user),
    texto: c.text ?? "",
    fecha: c.createdAt ?? null,
  };
}

export function normalizarPost(p) {
  const w = p.workout && typeof p.workout === "object" ? p.workout : null;
  return {
    id: p._id ?? p.id,
    autor: normalizarAutor(p.user),
    texto: p.caption ?? "",
    fecha: p.createdAt,
    // Si el entrenamiento se borró, el post se muestra sin la tarjeta de datos.
    entrenamiento: w ? normalizarEntrenamiento(w) : null,
    kudos: p.kudosCount ?? p.kudos?.length ?? 0,
    tengoKudos: Boolean(p.hasKudo),
    comentarios: (p.comments ?? []).map(normalizarComentario),
  };
}

/* ---------- Formato ---------- */

const relativo = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" });
const fecha = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" });

// "hace 5 minutos", "ayer", "12 nov 2026"
export function haceCuanto(iso, ahora = Date.now()) {
  if (!iso) return "";
  const seg = Math.round((new Date(iso).getTime() - ahora) / 1000);
  const abs = Math.abs(seg);
  if (abs < 45) return "ahora mismo";
  if (abs < 3600) return relativo.format(Math.round(seg / 60), "minute");
  if (abs < 86400) return relativo.format(Math.round(seg / 3600), "hour");
  if (abs < 7 * 86400) return relativo.format(Math.round(seg / 86400), "day");
  return fecha.format(new Date(iso)).replace(".", "");
}
