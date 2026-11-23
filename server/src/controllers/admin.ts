import { Response } from 'express';
import crypto from 'crypto';
import { Error as MongooseError } from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import { User } from '../models/user';
import { Achievement } from '../models/achievement';
import { CustomAchievement } from '../models/customAchievement';
import { CustomChallenge } from '../models/customChallenge';
import { Notification } from '../models/notification';
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
      await Notification.create({
        titulo: `Nuevo reto: ${reto.titulo}`,
        mensaje: reto.descripcion || '¡Hay un reto especial esperándote!',
        enlace: '/progreso?tab=retos',
        tipo: 'reto',
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

// GET /api/admin/notifications
export const listNotifications = async (_req: AuthRequest, res: Response) => {
  try {
    const lista = await Notification.find().sort({ createdAt: -1 }).limit(100).lean();
    return res.status(200).json(lista);
  } catch (error) {
    return responderError(res, error, 'Error al obtener las notificaciones');
  }
};

// POST /api/admin/notifications - Se envía a todos los usuarios
export const createNotification = async (req: AuthRequest, res: Response) => {
  try {
    const datos = pick(req.body, ['titulo', 'mensaje', 'enlace'] as const);
    if (typeof datos.enlace === 'string' && !datos.enlace.trim()) delete datos.enlace;
    const notificacion = await Notification.create({ ...datos, tipo: 'aviso', createdBy: req.user!.id });
    return res.status(201).json(notificacion);
  } catch (error) {
    return responderError(res, error, 'Error al enviar la notificación');
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
