import { Router } from 'express';
import { getExercises, createExercise, updateExercise, deleteExercise } from '../controllers/exercises';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = Router();

/**
 * @openapi
 * /api/exercises:
 *   get:
 *     summary: Lista el catálogo de ejercicios ordenado por nombre
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Catálogo de ejercicios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Exercise'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   post:
 *     summary: Añade un ejercicio al catálogo (solo administradores)
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExerciseInput'
 *     responses:
 *       201:
 *         description: Ejercicio creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exercise'
 *       400:
 *         description: Datos inválidos o ya existe un ejercicio con ese nombre
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Token inválido o no eres administrador
 * /api/exercises/{id}:
 *   put:
 *     summary: Edita un ejercicio del catálogo (solo administradores)
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExerciseInput'
 *     responses:
 *       200:
 *         description: Ejercicio actualizado
 *       400:
 *         description: Datos inválidos o nombre repetido
 *       403:
 *         description: No eres administrador
 *       404:
 *         description: Ejercicio no encontrado
 *   delete:
 *     summary: Elimina un ejercicio (solo si no se usa en ningún entrenamiento ni rutina)
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ejercicio eliminado
 *       403:
 *         description: No eres administrador
 *       404:
 *         description: Ejercicio no encontrado
 *       409:
 *         description: El ejercicio se usa en entrenamientos o rutinas
 */
// Consultar el catálogo: cualquier usuario autenticado. Modificarlo: solo administradores.
router.get('/', authenticateJWT, getExercises);
router.post('/', authenticateJWT, requireAdmin, createExercise);
router.put('/:id', authenticateJWT, requireAdmin, updateExercise);
router.delete('/:id', authenticateJWT, requireAdmin, deleteExercise);

export default router;