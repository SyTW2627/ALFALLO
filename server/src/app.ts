import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import exerciseRoutes from './routes/exercises';
import routineRoutes from './routes/routines';
import workoutRoutes from './routes/workouts';
const app = express();

app.use(cors()); // Habilita peticiones desde cualquier origen
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/workouts', workoutRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'API AlFallo funcionando correctamente' });
});

export default app;