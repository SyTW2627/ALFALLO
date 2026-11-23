import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { User } from '../models/user';
import { Notification, fechaPublicacion, publicadas, publicadasDesde } from '../models/notification';

const MAXIMO = 30;

// GET /api/notifications - Últimas notificaciones y cuántas no ha visto el usuario
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).select('notificationsSeenAt').lean();
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const ahora = new Date();
    const vistasHasta = user.notificationsSeenAt ? new Date(user.notificationsSeenAt) : null;

    const [lista, noLeidas] = await Promise.all([
      // Solo las ya publicadas: las programadas aparecen solas cuando llega su hora.
      Notification.find(publicadas(ahora)).sort({ publicarEn: -1, createdAt: -1 }).limit(MAXIMO).select('-createdBy -__v').lean(),
      Notification.countDocuments(vistasHasta ? publicadasDesde(vistasHasta, ahora) : publicadas(ahora)),
    ]);

    return res.status(200).json({
      noLeidas,
      notificaciones: lista.map((n) => {
        const fecha = fechaPublicacion(n);
        return { ...n, fecha, leida: vistasHasta ? fecha <= vistasHasta : false };
      }),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener las notificaciones', error });
  }
};

// POST /api/notifications/read - Marca todas como leídas (al abrir la campanita)
export const markNotificationsRead = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(req.user!.id, { notificationsSeenAt: new Date() });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.status(200).json({ noLeidas: 0 });
  } catch (error) {
    return res.status(500).json({ message: 'Error al marcar las notificaciones', error });
  }
};
