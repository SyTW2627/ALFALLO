import { Router } from 'express';
import { getExercises, createExercise } from '../controllers/exercises';
import { authenticateJWT } from '../middlewares/auth';

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
 *     summary: Añade un ejercicio al catálogo
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
 *         $ref: '#/components/responses/Forbidden'
 */
// Consultar catálogo es público o protegido según queráis, lo ponemos tras autenticación
router.get('/', authenticateJWT, getExercises);
router.post('/', authenticateJWT, createExercise);

export default router;