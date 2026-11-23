import { Response } from 'express';
import crypto from 'crypto';
import { Error as MongooseError, Types } from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import { User } from '../models/user';
import { Achievement } from '../models/achievement';
import { CustomAchievement } from '../models/customAchievement';
import { CustomChallenge } from '../models/customChallenge';
import { Notification, fechaPublicacion } from '../models/notification';
import { Post } from '../models/post';
import { Report, REPORT_REASONS } from '../models/report';
import { BodyParts, Exercise } from '../models/exercises';
import { exerciseUsage } from './exercises';
import { generateToken } from '../utils/jwt';
import { adminOptions, CUSTOM_ACHIEVEMENT_METRICS, customAchievementKey } from '../progress/custom';

/* ---------- Utilidades ---------- */

// Copia solo los campos permitidos que vienen en el cuerpo (los demás se ignoran).
function pick<T extends string>(body: any, campos: readonly T[]): Partial<Record<T, any>> {
  const out: Partial<Record<T, any>> = {};
  for (const c of campos) if (body?.[c] !== undefined) out[c] = body[c];
  return out;
}

// Errores de validación de Mongoose → 400 con un mensaje legible; el resto → 500.
function responderError(res: Response, error: unknown, mensaje500: string) {
  if (error instanceof MongooseError.ValidationError) {
    const primero = Object.values(error.errors)[0];
    return res.status(400).json({ message: primero?.message ?? 'Datos no válidos' });
  }
  if (error instanceof MongooseError.CastError) {
    return res.status(400).json({ message: `Valor no válido en "${error.path}"` });
  }
  return res.status(500).json({ message: mensaje500, error });
}

const quiereNotificar = (body: any) => body?.notificar === true;

/* ---------- Acceso de administrador ---------- */

// Límite de intentos fallidos por usuario (en memoria) para evitar que se adivine la contraseña.
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const intentos = new Map<string, { fallos: number; desde: number }>();

function bloqueado(userId: string) {
  const r = intentos.get(userId);
  if (!r) return false;
  if (Date.now() - r.desde > VENTANA_MS) {
    intentos.delete(userId);
    return false;
  }
  return r.fallos >= MAX_INTENTOS;
}

function registrarFallo(userId: string) {
  const r = intentos.get(userId);
  if (!r || Date.now() - r.desde > VENTANA_MS) intentos.set(userId, { fallos: 1, desde: Date.now() });
  else r.fallos++;
}

// Comparación en tiempo constante (no revela cuántos caracteres coinciden).
function mismaContrasena(a: string, b: string) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// POST /api/admin/access - Convierte al usuario en administrador si conoce la contraseña de administración
export const accessAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return res.status(503).json({ message: 'El acceso de administrador no está configurado en el servidor' });
    }

    const userId = req.user!.id;
    if (bloqueado(userId)) {
      return res.status(429).json({ message: 'Demasiados intentos fallidos. Prueba de nuevo en unos minutos.' });
    }

    const { password } = req.body ?? {};
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'La contraseña de administración es obligatoria' });
    }

    if (!mismaContrasena(password, adminPassword)) {
      registrarFallo(userId);
      return res.status(401).json({ message: 'Contraseña de administración incorrecta' });
    }
    intentos.delete(userId);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    return res.status(200).json({
      message: 'Acceso de administrador concedido',
      token: generateToken(user._id.toString(), user.role),
      user,
    });
  } catch (error) {
    return responderError(res, error, 'Error al conceder el acceso de administrador');
  }
};

// POST /api/admin/leave - Deja de ser administrador (vuelve a ser un usuario normal)
export const leaveAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    user.role = 'user';
    await user.save();

    return res.status(200).json({
      message: 'Has salido del modo administrador',
      token: generateToken(user._id.toString(), user.role),
      user,
    });
  } catch (error) {
    return responderError(res, error, 'Error al salir del modo administrador');
  }
};

/* ---------- Opciones para los formularios ---------- */

const NOMBRES_ZONA: Record<string, string> = {
  Back: 'Espalda',
  Dorsal: 'Dorsal',
  Lumbar: 'Lumbar',
  Biceps: 'Bíceps',
  Triceps: 'Tríceps',
  Quadriceps: 'Cuádriceps',
  Femoral: 'Femoral',
  Gluteus: 'Glúteo',
  Abdominal: 'Abdominal',
  Chest: 'Pecho',
  Abductors: 'Abductores',
  Adductors: 'Aductores',
  'Lateral Shoulder': 'Hombro lateral',
  'Posterior Shoulder': 'Hombro posterior',
  'Front Shoulder': 'Hombro frontal',
};

// GET /api/admin/options
export const getOptions = (_req: AuthRequest, res: Response) => {
  res.status(200).json({
    ...adminOptions(),
    zonas: Object.values(BodyParts).map((z) => ({ valor: z, label: NOMBRES_ZONA[z] ?? z })),
  });
};

/* ---------- Hitos ---------- */

const CAMPOS_HITO = ['titulo', 'descripcion', 'categoria', 'metrica', 'objetivo', 'activo'] as const;

// Los hitos de rango usan 1 (Hierro) … 7 (Élite).
function validarObjetivoHito(metrica?: string, objetivo?: number): string | null {
  if (!metrica || objetivo === undefined) return null;
  if (CUSTOM_ACHIEVEMENT_METRICS[metrica]?.unidad === 'rango' && (!Number.isInteger(objetivo) || objetivo < 1 || objetivo > 7)) {
    return 'Para un hito de rango el objetivo debe ser un rango entre Hierro (1) y Élite (7)';
  }
  return null;
}

// GET /api/admin/achievements
export const listAchievements = async (_req: AuthRequest, res: Response) => {
  try {
    const hitos = await CustomAchievement.find().sort({ createdAt: -1 }).lean();
    const conteos = await Achievement.aggregate([
      { $match: { key: { $in: hitos.map((h) => customAchievementKey(String(h._id))) } } },
      { $group: { _id: '$key', total: { $sum: 1 } } },
    ]);
    const porClave = new Map(conteos.map((c) => [c._id, c.total]));
    return res.status(200).json(
      hitos.map((h) => ({ ...h, conseguidoPor: porClave.get(customAchievementKey(String(h._id))) ?? 0 }))
    );
  } catch (error) {
    return responderError(res, error, 'Error al obtener los hitos');
  }
};

// POST /api/admin/achievements
export const createAchievement = async (req: AuthRequest, res: Response) => {
  try {
    const datos = pick(req.body, CAMPOS_HITO);
    const problema = validarObjetivoHito(datos.metrica, Number(datos.objetivo));
    if (problema) return res.status(400).json({ message: problema });

    const hito = await CustomAchievement.create({ ...datos, createdBy: req.user!.id });

    if (quiereNotificar(req.body) && hito.activo) {
      await Notification.create({
        titulo: `Nuevo hito: ${hito.titulo}`,
        mensaje: hito.descripcion,
        enlace: '/progreso?tab=hitos',
        tipo: 'hito',
        createdBy: req.user!.id,
      });
    }
    return res.status(201).json(hito);
  } catch (error) {
    return responderError(res, error, 'Error al crear el hito');
  }
};

// PUT /api/admin/achievements/:id
export const updateAchievement = async (req: AuthRequest, res: Response) => {
  try {
    const hito = await CustomAchievement.findById(req.params.id);
    if (!hito) return res.status(404).json({ message: 'Hito no encontrado' });

    hito.set(pick(req.body, CAMPOS_HITO));
    const problema = validarObjetivoHito(hito.metrica, hito.objetivo);
    if (problema) return res.status(400).json({ message: problema });

    await hito.save();
    return res.status(200).json(hito);
  } catch (error) {
    return responderError(res, error, 'Error al actualizar el hito');
  }
};

// DELETE /api/admin/achievements/:id - También borra quién lo había conseguido
export const deleteAchievement = async (req: AuthRequest, res: Response) => {
  try {
    const hito = await CustomAchievement.findByIdAndDelete(req.params.id);
    if (!hito) return res.status(404).json({ message: 'Hito no encontrado' });
    await Achievement.deleteMany({ key: customAchievementKey(String(hito._id)) });
    return res.status(200).json({ message: 'Hito eliminado' });
  } catch (error) {
    return responderError(res, error, 'Error al eliminar el hito');
  }
};

/* ---------- Retos especiales ---------- */

const CAMPOS_RETO = ['titulo', 'descripcion', 'metrica', 'zonas', 'objetivo', 'inicio', 'fin', 'activo'] as const;

function estadoReto(r: { inicio: Date; fin: Date; activo: boolean }, ahora = new Date()) {
  if (!r.activo) return 'desactivado';
  if (ahora < new Date(r.inicio)) return 'programado';
  if (ahora >= new Date(r.fin)) return 'terminado';
  return 'en-curso';
}

// GET /api/admin/challenges
export const listChallenges = async (_req: AuthRequest, res: Response) => {
  try {
    const retos = await CustomChallenge.find().sort({ inicio: -1 }).lean();
    return res.status(200).json(retos.map((r) => ({ ...r, estado: estadoReto(r) })));
  } catch (error) {
    return responderError(res, error, 'Error al obtener los retos');
  }
};

// POST /api/admin/challenges
export const createChallenge = async (req: AuthRequest, res: Response) => {
  try {
    const datos = pick(req.body, CAMPOS_RETO);
    if (datos.metrica !== 'series') datos.zonas = [];
    const reto = await CustomChallenge.create({ ...datos, createdBy: req.user!.id });

    if (quiereNotificar(req.body) && reto.activo && reto.fin > new Date()) {
      // Si el reto empieza más adelante, el aviso se programa para el día que empieza.
      await Notification.create({
        titulo: `Nuevo reto: ${reto.titulo}`,
        mensaje: reto.descripcion || '¡Hay un reto especial esperándote!',
        enlace: '/progreso?tab=retos',
        tipo: 'reto',
        publicarEn: new Date(Math.max(Date.now(), reto.inicio.getTime())),
        createdBy: req.user!.id,
      });
    }
    return res.status(201).json({ ...reto.toObject(), estado: estadoReto(reto) });
  } catch (error) {
    return responderError(res, error, 'Error al crear el reto');
  }
};

// PUT /api/admin/challenges/:id
export const updateChallenge = async (req: AuthRequest, res: Response) => {
  try {
    const reto = await CustomChallenge.findById(req.params.id);
    if (!reto) return res.status(404).json({ message: 'Reto no encontrado' });

    reto.set(pick(req.body, CAMPOS_RETO));
    if (reto.metrica !== 'series') reto.set('zonas', []);
    await reto.save(); // save() (y no findByIdAndUpdate) para que se validen las fechas y las zonas
    return res.status(200).json({ ...reto.toObject(), estado: estadoReto(reto) });
  } catch (error) {
    return responderError(res, error, 'Error al actualizar el reto');
  }
};

// DELETE /api/admin/challenges/:id
export const deleteChallenge = async (req: AuthRequest, res: Response) => {
  try {
    const reto = await CustomChallenge.findByIdAndDelete(req.params.id);
    if (!reto) return res.status(404).json({ message: 'Reto no encontrado' });
    return res.status(200).json({ message: 'Reto eliminado' });
  } catch (error) {
    return responderError(res, error, 'Error al eliminar el reto');
  }
};

/* ---------- Notificaciones ---------- */

// Añade la fecha de publicación efectiva y si ya se ve o está programada.
function conEstado(n: any, ahora = new Date()) {
  const fecha = fechaPublicacion(n);
  return { ...n, fecha, estado: fecha > ahora ? 'programada' : 'publicada' };
}

// `publicarEn`: vacío = ahora; una fecha pasada también cuenta como "ahora".
function leerPublicarEn(valor: unknown): Date | null | 'invalida' {
  if (valor === undefined || valor === null || valor === '') return null;
  const fecha = new Date(valor as string);
  if (Number.isNaN(fecha.getTime())) return 'invalida';
  return fecha < new Date() ? new Date() : fecha;
}

// GET /api/admin/notifications - Todas, también las programadas (primero las que se publicarán más tarde)
export const listNotifications = async (_req: AuthRequest, res: Response) => {
  try {
    const lista = await Notification.find().sort({ publicarEn: -1, createdAt: -1 }).limit(100).lean();
    const ahora = new Date();
    return res.status(200).json(lista.map((n) => conEstado(n, ahora)));
  } catch (error) {
    return responderError(res, error, 'Error al obtener las notificaciones');
  }
};

// POST /api/admin/notifications - Se envía a todos los usuarios, ahora o en la fecha `publicarEn`
export const createNotification = async (req: AuthRequest, res: Response) => {
  try {
    const datos = pick(req.body, ['titulo', 'mensaje', 'enlace'] as const);
    if (typeof datos.enlace === 'string' && !datos.enlace.trim()) delete datos.enlace;
    const publicarEn = leerPublicarEn(req.body?.publicarEn);
    if (publicarEn === 'invalida') return res.status(400).json({ message: 'La fecha de publicación no es válida' });

    const notificacion = await Notification.create({
      ...datos,
      tipo: 'aviso',
      publicarEn: publicarEn ?? new Date(),
      createdBy: req.user!.id,
    });
    return res.status(201).json(conEstado(notificacion.toObject()));
  } catch (error) {
    return responderError(res, error, 'Error al enviar la notificación');
  }
};

// PUT /api/admin/notifications/:id - Editar o reprogramar (publicarEn vacío o pasado = publicar ya)
export const updateNotification = async (req: AuthRequest, res: Response) => {
  try {
    const notificacion = await Notification.findById(req.params.id);
    if (!notificacion) return res.status(404).json({ message: 'Notificación no encontrada' });

    const datos = pick(req.body, ['titulo', 'mensaje', 'enlace'] as const);
    if (typeof datos.enlace === 'string' && !datos.enlace.trim()) {
      delete datos.enlace;
      notificacion.set('enlace', undefined);
    }
    notificacion.set(datos);
    if ('publicarEn' in (req.body ?? {})) {
      const publicarEn = leerPublicarEn(req.body.publicarEn);
      if (publicarEn === 'invalida') return res.status(400).json({ message: 'La fecha de publicación no es válida' });
      notificacion.publicarEn = publicarEn ?? new Date();
    }
    await notificacion.save();
    return res.status(200).json(conEstado(notificacion.toObject()));
  } catch (error) {
    return responderError(res, error, 'Error al actualizar la notificación');
  }
};

// DELETE /api/admin/notifications/:id
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const notificacion = await Notification.findByIdAndDelete(req.params.id);
    if (!notificacion) return res.status(404).json({ message: 'Notificación no encontrada' });
    return res.status(200).json({ message: 'Notificación eliminada' });
  } catch (error) {
    return responderError(res, error, 'Error al eliminar la notificación');
  }
};

/* ---------- Ejercicios ---------- */

// GET /api/admin/exercises - Catálogo con cuántos entrenamientos y rutinas usan cada ejercicio
export const listExercises = async (_req: AuthRequest, res: Response) => {
  try {
    const [ejercicios, usoDe] = await Promise.all([Exercise.find().sort({ name: 1 }).lean(), exerciseUsage()]);
    return res.status(200).json(ejercicios.map((e) => ({ ...e, uso: usoDe(String(e._id)) })));
  } catch (error) {
    return responderError(res, error, 'Error al obtener los ejercicios');
  }
};

/* ---------- Moderación ---------- */

const claveReporte = (r: { post: unknown; comment?: unknown }) => `${r.post}:${r.comment ?? ''}`;

// GET /api/admin/reports?estado=pendiente|resuelto
// Agrupa los reportes por contenido (una publicación o un comentario) y dice si ese contenido sigue existiendo.
export const listReports = async (req: AuthRequest, res: Response) => {
  try {
    const resueltos = req.query.estado === 'resuelto';
    const reportes = await Report.find({ estado: resueltos ? { $in: ['eliminado', 'descartado'] } : 'pendiente' })
      .sort({ createdAt: -1 })
      .limit(resueltos ? 300 : 1000)
      .populate([
        { path: 'reportadoPor', select: 'name' },
        { path: 'autor', select: 'name' },
        { path: 'resueltoPor', select: 'name' },
      ])
      .lean();

    const posts = await Post.find({ _id: { $in: [...new Set(reportes.map((r) => String(r.post)))] } })
      .select('user caption comments')
      .lean();
    const postPorId = new Map(posts.map((p) => [String(p._id), p]));

    const grupos = new Map<string, any>();
    for (const r of reportes as any[]) {
      const clave = claveReporte(r);
      if (!grupos.has(clave)) {
        const post = postPorId.get(String(r.post));
        const comentario = r.comment ? post?.comments?.find((c: any) => String(c._id) === String(r.comment)) : null;
        const existe = Boolean(post && (!r.comment || comentario));
        grupos.set(clave, {
          clave,
          tipo: r.comment ? 'comentario' : 'publicacion',
          post: String(r.post),
          comment: r.comment ? String(r.comment) : null,
          autor: r.autor ? { id: String(r.autor._id), nombre: r.autor.name } : null,
          contenido: existe ? (r.comment ? comentario?.text : post?.caption) || r.contenido : r.contenido,
          existe,
          estado: r.estado,
          resueltoEn: r.resueltoEn ?? null,
          resueltoPor: r.resueltoPor?.name ?? null,
          total: 0,
          motivos: Object.fromEntries(REPORT_REASONS.map((m) => [m, 0])),
          reportes: [],
          ultimo: r.createdAt,
        });
      }
      const g = grupos.get(clave);
      g.total++;
      g.motivos[r.motivo]++;
      g.reportes.push({ motivo: r.motivo, detalle: r.detalle ?? '', por: r.reportadoPor?.name ?? 'Usuario eliminado', fecha: r.createdAt });
    }

    // Lo más reportado primero (y, a igualdad, lo más reciente).
    const lista = [...grupos.values()].sort((a, b) => b.total - a.total || +new Date(b.ultimo) - +new Date(a.ultimo));
    return res.status(200).json(resueltos ? lista.sort((a, b) => +new Date(b.resueltoEn) - +new Date(a.resueltoEn)) : lista);
  } catch (error) {
    return responderError(res, error, 'Error al obtener los reportes');
  }
};

// POST /api/admin/reports/resolve - { post, comment?, accion: "eliminar" | "descartar" }
export const resolveReport = async (req: AuthRequest, res: Response) => {
  try {
    const { post, comment, accion } = req.body ?? {};
    if (!Types.ObjectId.isValid(post) || (comment && !Types.ObjectId.isValid(comment))) {
      return res.status(400).json({ message: 'Id no válido' });
    }
    if (accion !== 'eliminar' && accion !== 'descartar') {
      return res.status(400).json({ message: 'La acción debe ser "eliminar" o "descartar"' });
    }

    if (accion === 'eliminar') {
      if (comment) await Post.updateOne({ _id: post }, { $pull: { comments: { _id: comment } } });
      else await Post.deleteOne({ _id: post });
    }

    // Al eliminar una publicación también se cierran los reportes de sus comentarios.
    const filtro: Record<string, unknown> = { post, estado: 'pendiente' };
    if (comment || accion === 'descartar') filtro.comment = comment || null;
    const r = await Report.updateMany(filtro, {
      estado: accion === 'eliminar' ? 'eliminado' : 'descartado',
      resueltoPor: req.user!.id,
      resueltoEn: new Date(),
    });

    return res.status(200).json({
      message: accion === 'eliminar' ? 'Contenido eliminado' : 'Reportes descartados',
      actualizados: r.modifiedCount,
    });
  } catch (error) {
    return responderError(res, error, 'Error al resolver el reporte');
  }
};
