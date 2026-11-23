// Notificaciones personales: se crean cuando pasa algo que afecta a un usuario concreto.
// Nunca deben romper la petición que las provoca: si fallan, solo se registra el error.

import { Types } from 'mongoose';
import { Notification, NotificationType } from '../models/notification';
import { User } from '../models/user';

type Id = string | Types.ObjectId;

interface Personal {
  destinatario: Id;
  clave: string;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  enlace?: string;
}

const perfil = (id: Id) => `/usuario?id=${encodeURIComponent(String(id))}`;

const recortar = (texto: string, max = 90) => (texto.length > max ? `${texto.slice(0, max - 1).trimEnd()}…` : texto);

async function nombreDe(id: Id) {
  const u = await User.findById(id).select('name').lean();
  return String(u?.name ?? 'Alguien');
}

// Crea la notificación si no existía ya otra con la misma clave para ese usuario.
export async function notificar(n: Personal) {
  try {
    await Notification.updateOne(
      { destinatario: n.destinatario, clave: n.clave },
      { $setOnInsert: { ...n, publicarEn: new Date() } },
      { upsert: true }
    );
  } catch (error: any) {
    if (error?.code !== 11000) console.error('Error al crear una notificación personal', error);
  }
}

// "Ana te ha dado ánimos". Si quita y vuelve a dar ánimos no se repite.
export async function avisarKudos(post: { _id: Id; user: Id; caption?: string }, actor: Id) {
  if (String(post.user) === String(actor)) return;
  await notificar({
    destinatario: post.user,
    clave: `kudos:${post._id}:${actor}`,
    tipo: 'kudos',
    titulo: `${await nombreDe(actor)} te ha dado ánimos`,
    mensaje: post.caption ? `En tu publicación «${recortar(post.caption, 60)}».` : 'En tu entrenamiento publicado.',
    enlace: perfil(post.user),
  });
}

// "Ana ha comentado tu entrenamiento".
export async function avisarComentario(post: { _id: Id; user: Id }, comentario: { _id: Id; text: string }, actor: Id) {
  if (String(post.user) === String(actor)) return;
  await notificar({
    destinatario: post.user,
    clave: `comentario:${post._id}:${comentario._id}`,
    tipo: 'comentario',
    titulo: `${await nombreDe(actor)} ha comentado tu entrenamiento`,
    mensaje: `«${recortar(comentario.text)}»`,
    enlace: perfil(post.user),
  });
}

// "Pablo te sigue".
export async function avisarSeguidor(seguido: Id, seguidor: Id) {
  const nombre = await nombreDe(seguidor);
  await notificar({
    destinatario: seguido,
    clave: `seguidor:${seguidor}`,
    tipo: 'seguidor',
    titulo: `${nombre} te sigue`,
    mensaje: 'Ahora verá tus entrenamientos publicados. Échale un vistazo a su perfil.',
    enlace: perfil(seguidor),
  });
}

// Al borrar una publicación o un comentario, sus avisos dejan de tener sentido.
export async function olvidarAvisosDe(postId: Id, comentarioId?: Id) {
  try {
    const prefijo = comentarioId ? `^comentario:${postId}:${comentarioId}$` : `^(kudos|comentario):${postId}:`;
    await Notification.deleteMany({ clave: { $regex: prefijo } });
  } catch (error) {
    console.error('Error al borrar avisos', error);
  }
}

/* ---------- "Te has quedado a 2 series del reto" ---------- */

// A partir de este porcentaje se avisa de que falta poco.
export const UMBRAL_CASI = 0.75;

const numero = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

export function cuantoFalta(unidad: string, falta: number) {
  switch (unidad) {
    case 'series':
      return `${numero.format(falta)} ${falta === 1 ? 'serie' : 'series'}`;
    case 'kg':
      return `${numero.format(falta)} kg`;
    case 'min':
      return `${numero.format(falta)} ${falta === 1 ? 'minuto' : 'minutos'}`;
    default:
      return `${numero.format(falta)} ${falta === 1 ? 'entrenamiento' : 'entrenamientos'}`;
  }
}

// Se llama al terminar un entrenamiento con los retos ya calculados. Un aviso por reto (y semana).
export async function avisarRetosCasi(
  userId: Id,
  retos: { key: string; titulo: string; unidad: string; objetivo: number; actual: number; completado: boolean }[]
) {
  for (const r of retos) {
    if (r.completado || r.objetivo <= 0 || r.actual / r.objetivo < UMBRAL_CASI) continue;
    await notificar({
      destinatario: userId,
      clave: `casi:${r.key}`,
      tipo: 'progreso',
      titulo: `¡Ya casi! Te ${r.objetivo - r.actual === 1 ? 'queda' : 'quedan'} ${cuantoFalta(r.unidad, r.objetivo - r.actual)}`,
      mensaje: `Te has quedado a ${cuantoFalta(r.unidad, r.objetivo - r.actual)} del reto «${r.titulo}».`,
      enlace: '/progreso?tab=retos',
    });
  }
}
