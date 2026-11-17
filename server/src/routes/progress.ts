import { Router } from 'express';
import { getProgress } from '../controllers/progress';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

/**
 * @openapi
 * /api/progress:
 *   get:
 *     summary: Rangos de fuerza, hitos y retos semanales del usuario
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progreso calculado a partir del historial y el peso corporal
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', authenticateJWT, getProgress);

export default router;