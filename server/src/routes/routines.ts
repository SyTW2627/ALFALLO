import { Router } from 'express';
import {
  getUserRoutines,
  createRoutine,
  deleteRoutine,
  getRoutineById,
  updateRoutine,
  getRoutineTemplates,
  copyRoutineTemplate,
} from '../controllers/routines';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT); // Proteger todas las rutas de rutinas

/**
 * @openapi
 * /api/routines:
 *   get:
 *     summary: Lista las rutinas del usuario autenticado (más recientes primero)
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rutinas del usuario con los ejercicios populados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Routine'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   post:
 *     summary: Crea una rutina
 *     description: >
 *       Las series, repeticiones y descanso de cada ejercicio se validan según el objetivo del día
 *       (force, hypertrophy o resistance). Si se omiten, se rellenan con los valores por defecto.
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoutineInput'
 *     responses:
 *       201:
 *         description: Rutina creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Routine'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', getUserRoutines);
router.post('/', createRoutine);

/**
 * @openapi
 * /api/routines/{id}:
 *   get:
 *     summary: Obtiene una rutina del usuario
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Id de la rutina
 *     responses:
 *       200:
 *         description: Rutina con los ejercicios populados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Routine'
 *       400:
 *         description: Id no válido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Rutina no encontrada o no pertenece al usuario
 *   put:
 *     summary: Edita el nombre y/o los días de una rutina del usuario
 *     description: >
 *       Solo se modifican los campos enviados. Los días se validan según el objetivo,
 *       igual que al crear la rutina.
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Id de la rutina
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoutineInput'
 *     responses:
 *       200:
 *         description: Rutina actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Routine'
 *       400:
 *         description: Id o datos no válidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Rutina no encontrada o no pertenece al usuario
 *   delete:
 *     summary: Elimina una rutina del usuario
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Id de la rutina
 *     responses:
 *       200:
 *         description: Rutina eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Rutina no encontrada o no pertenece al usuario
 */
/**
 * @openapi
 * /api/routines/templates:
 *   get:
 *     summary: Rutinas por defecto (Heavy Duty, Push Pull Legs y Upper Lower)
 *     description: Con los ejercicios del catálogo ya incluidos. `faltan` lista los ejercicios que no están en el catálogo.
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de rutinas por defecto
 * /api/routines/templates/{clave}:
 *   post:
 *     summary: Copia una rutina por defecto a tus rutinas (después se puede editar)
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clave
 *         required: true
 *         schema:
 *           type: string
 *           enum: [heavy-duty, push-pull-legs, upper-lower]
 *     responses:
 *       201:
 *         description: Rutina creada
 *       404:
 *         description: No existe esa rutina por defecto
 *       409:
 *         description: Sus ejercicios no están en el catálogo
 */
// Antes de '/:id' para que "templates" no se tome como un id.
router.get('/templates', getRoutineTemplates);
router.post('/templates/:clave', copyRoutineTemplate);

router.get('/:id', getRoutineById);
router.put('/:id', updateRoutine);
router.delete('/:id', deleteRoutine);

export default router;