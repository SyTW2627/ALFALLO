import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth';
import { getLeaderboard } from '../controllers/leaderboard';

const router = Router();

/**
 * @openapi
 * /api/leaderboard:
 *   get:
 *     summary: Clasificaciones entre tú y la gente que sigues
 *     description: >
 *       Ranking de esta semana (de lunes a hoy) por volumen y por número de entrenamientos, y para cada
 *       reto especial en curso (o terminado hace menos de 7 días) quién lo completó antes.
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Clasificaciones
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', authenticateJWT, getLeaderboard);

export default router;
