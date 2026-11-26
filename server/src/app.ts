import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import exerciseRoutes from './routes/exercises';
import routineRoutes from './routes/routines';
import workoutRoutes from './routes/workouts';
import { setupSwagger } from './docs/swagger';
import postRoutes from './routes/posts';
import progressRoutes from './routes/progress';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import leaderboardRoutes from './routes/leaderboard';
import versusRoutes from './routes/versus';
const app = express();

// CORS_ORIGIN (opcional): orígenes permitidos separados por comas, p. ej. "https://alfallo.app".
// Sin definir se permite cualquier origen (cómodo en desarrollo).
const origenes = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors(origenes?.length ? { origin: origenes } : undefined));
app.use(express.json({ limit: '1mb' }));

// Los controladores devuelven { message, error } en los 500. El detalle (consulta, pila...)
// se registra en el servidor y no se envía al cliente: puede revelar datos internos.
app.use((_req: Request, res: Response, next: NextFunction) => {
  const json = res.json.bind(res);
  res.json = (body?: any) => {
    if (res.statusCode >= 500 && body && typeof body === 'object' && 'error' in body) {
      console.error(`[${res.statusCode}] ${body.message ?? ''}`, body.error);
      const { error: _oculto, ...resto } = body;
      return json(resto);
    }
    return json(body);
  };
  next();
});

// Documentación de la API (Swagger UI en /api-docs)
setupSwagger(app);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/versus', versusRoutes);

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Comprueba el estado de la API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: La API está funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: API AlFallo funcionando correctamente
 */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'API AlFallo funcionando correctamente' });
});

// Rutas de la API que no existen: 404 en JSON (en vez de la página HTML de Express)
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Errores no capturados. El más habitual: un cuerpo JSON mal formado → 400.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo de la petición no es un JSON válido' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'La petición es demasiado grande' });
  }
  console.error('Error no controlado', err);
  return res.status(500).json({ message: 'Error interno del servidor' });
});

export default app;