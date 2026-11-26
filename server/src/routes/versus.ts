import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth';
import { acceptVersus, cancelVersus, createVersus, declineVersus, headToHead, listVersus } from '../controllers/versus';

const router = Router();

/**
 * @openapi
 * /api/versus:
 *   get:
 *     summary: Tus versus (beta) y la gente a la que puedes retar
 *     description: >
 *       Duelos pendientes, en curso y recientes con su marcador. Los duelos en curso cuya fecha de fin
 *       ya pasó se cierran al consultarlos (se guarda el resultado y se avisa a los dos).
 *     tags: [Versus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Duelos, amigos, ejercicios y duraciones disponibles
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     summary: Reta a alguien a quien sigues
 *     tags: [Versus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rival, ejercicio]
 *             properties:
 *               rival: { type: string, description: Id del usuario retado }
 *               ejercicio: { type: string, enum: [bench, squat, deadlift, ohp, row] }
 *               modalidad: { type: string, enum: [kg, relativa], default: kg, description: "kg = 1RM estimado; relativa = 1RM / peso corporal" }
 *               dias: { type: integer, enum: [3, 7, 14, 30], default: 7 }
 *               mensaje: { type: string, maxLength: 140, example: "¿Seguro que no te da miedo?" }
 *     responses:
 *       201:
 *         description: Versus creado (pendiente de que el rival lo acepte)
 *       400:
 *         description: Datos no válidos
 *       403:
 *         description: No sigues a ese usuario
 *       409:
 *         description: Ya hay un versus abierto en ese ejercicio o demasiados abiertos
 */
router.get('/', authenticateJWT, listVersus);
router.post('/', authenticateJWT, createVersus);

/**
 * @openapi
 * /api/versus/head-to-head/{id}:
 *   get:
 *     summary: Comparación al momento con un amigo en los 5 ejercicios básicos
 *     description: Mejor 1RM estimado y fuerza relativa de los últimos 90 días. Solo si os seguís mutuamente.
 *     tags: [Versus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Comparación por ejercicio y resumen
 *       403:
 *         description: No sois amigos (no os seguís mutuamente)
 */
router.get('/head-to-head/:id', authenticateJWT, headToHead);

/**
 * @openapi
 * /api/versus/{id}/accept:
 *   post:
 *     summary: Acepta un versus que te han lanzado (empieza la cuenta atrás)
 *     tags: [Versus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Versus en curso }
 *       403: { description: No eres la persona retada }
 *       409: { description: Ya no está pendiente }
 * /api/versus/{id}/decline:
 *   post:
 *     summary: Rechaza un versus que te han lanzado
 *     tags: [Versus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Versus rechazado }
 * /api/versus/{id}:
 *   delete:
 *     summary: Retira un versus que lanzaste y aún no se ha aceptado
 *     tags: [Versus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Versus cancelado }
 *       409: { description: Ya se había aceptado }
 */
router.post('/:id/accept', authenticateJWT, acceptVersus);
router.post('/:id/decline', authenticateJWT, declineVersus);
router.delete('/:id', authenticateJWT, cancelVersus);

export default router;
