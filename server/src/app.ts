import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';

const app = express();

app.use(cors()); // Habilita peticiones desde cualquier origen
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'API AlFallo funcionando correctamente' });
});

export default app;