import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import exerciseRoutes from './routes/exercises';
import routineRoutes from './routes/routines';
import workoutRoutes from './routes/workouts';
import { setupSwagger } from './docs/swagger';
const app = express();

app.use(cors()); // Habilita peticiones desde cualquier origen
app.use(express.json());

// Documentación de la API (Swagger UI en /api-docs)
setupSwagger(app);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/workouts', workoutRoutes);

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

export default app;