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

/**
 * @openapi
 * /api/workouts/start:
 *   post:
 *     summary: Inicia un nuevo entrenamiento
 *     tags: [Workouts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Torso
 *               objective:
 *                 type: string
 *                 enum: [hypertrophy, force, resistance]
 *     responses:
 *       201:
 *         description: Entrenamiento iniciado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workout'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Ya hay un entrenamiento en curso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 workout:
 *                   $ref: '#/components/schemas/Workout'
 */
router.post('/start', startWorkout);

/**
 * @openapi
 * /api/workouts/active:
 *   get:
 *     summary: Obtiene el entrenamiento en curso
 *     description: Devuelve null si el usuario no tiene ningún entrenamiento en curso.
 *     tags: [Workouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Entrenamiento en curso o null
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Workout'
 *               nullable: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   put:
 *     summary: Registra ejercicios, series y notas del entrenamiento en curso
 *     description: El array exercises reemplaza por completo al anterior.
 *     tags: [Workouts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               exercises:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/WorkoutExerciseInput'
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Entrenamiento actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workout'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No hay ningún entrenamiento en curso
 *   delete:
 *     summary: Descarta el entrenamiento en curso sin guardarlo
 *     tags: [Workouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Entrenamiento descartado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No hay ningún entrenamiento en curso
 */
router.put('/active', updateActiveWorkout);

/**
 * @openapi
 * /api/workouts/finish:
 *   post:
 *     summary: Finaliza el entrenamiento en curso
 *     tags: [Workouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Entrenamiento finalizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workout'
 *       400:
 *         description: No se puede terminar un entrenamiento sin ninguna serie
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No hay entrenamiento activo para finalizar
 */
router.post('/finish', finishWorkout);
router.get('/active', getActiveWorkout);
router.delete('/active', discardActiveWorkout);

/**
 * @openapi
 * /api/workouts/history:
 *   get:
 *     summary: Historial de entrenamientos terminados (más recientes primero)
 *     tags: [Workouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Entrenamientos finalizados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Workout'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/history', getWorkoutHistory);

export default router;