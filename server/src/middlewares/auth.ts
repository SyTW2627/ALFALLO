import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';

// Extender la interfaz Request de Express para adjuntar los datos del usuario
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acceso denegado: No se proporcionó un token válido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'secret_key_fallback';
    const decoded = jwt.verify(token, secret) as { id: string; role: string };

    // Inyectar el usuario decodificado en la petición
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
};

// Solo deja pasar a administradores. Se comprueba en la base de datos (y no solo en el token)
// para que quitarle el rol a alguien tenga efecto inmediato.
// Va siempre DESPUÉS de authenticateJWT.
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?.id).select('role').lean();
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Necesitas permisos de administrador', code: 'NOT_ADMIN' });
    }
    req.user!.role = 'admin';
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Error al comprobar los permisos', error });
  }
};
