// Utilidades del seguimiento entre usuarios: traducen las respuestas de la API
// (en inglés) a la forma que usan los componentes.

import { normalizarPost } from "./feed.js";

// Enlace al perfil público de un usuario (la web es estática, por eso va como parámetro).
export const urlPerfil = (id) => `/usuario?id=${encodeURIComponent(id)}`;

// Elemento de las listas de seguidos / seguidores: { _id, name }.
export function normalizarUsuarioBasico(u) {
  return { id: u?._id ?? u?.id, nombre: u?.name ?? "Usuario" };
}

export function normalizarPerfilPublico(r) {
  return {
    id: r.user?._id ?? r.user?.id,
    nombre: r.user?.name ?? "Usuario",
    creadoEn: r.user?.createdAt ?? null,
    estadisticas: {
      entrenamientos: r.stats?.workouts ?? 0,
      publicaciones: r.stats?.posts ?? 0,
      seguidores: r.stats?.followers ?? 0,
      seguidos: r.stats?.following ?? 0,
    },
    soyYo: Boolean(r.isMe),
    loSigo: Boolean(r.isFollowing),
    posts: (r.posts ?? []).map(normalizarPost),
  };
}
