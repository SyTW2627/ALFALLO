import express from 'express';
import { connectDB } from './db/mongoose';


const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(express.json());

// Ruta de comprobación de estado de la API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API AlFallo funcionando correctamente' });
});

// Inicializar base de datos y servidor
const startServer = async () => {
  await connectDB();
 
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
};


startServer();
