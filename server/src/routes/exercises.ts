import { Router } from 'express';
import { getExercises, createExercise } from '../controllers/exercises';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// Consultar catálogo es público o protegido según queráis, lo ponemos tras autenticación
router.get('/', authenticateJWT, getExercises);
router.post('/', authenticateJWT, createExercise);

export default router;