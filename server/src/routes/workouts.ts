import { Router } from 'express';
import {
  startWorkout,
  updateActiveWorkout,
  finishWorkout,
  getWorkoutHistory,
  discardActiveWorkout,
  getActiveWorkout
} from '../controllers/workouts';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT); // Proteger todas las rutas de entrenamientos

router.post('/start', startWorkout);
router.put('/active', updateActiveWorkout);
router.post('/finish', finishWorkout);
router.get('/active', getActiveWorkout);
router.delete('/active', discardActiveWorkout);
router.get('/history', getWorkoutHistory);

export default router;