import { Router } from 'express';
import { getUserRoutines, createRoutine, deleteRoutine } from '../controllers/routines';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT); // Proteger todas las rutas de rutinas

router.get('/', getUserRoutines);
router.post('/', createRoutine);
router.delete('/:id', deleteRoutine);

export default router;