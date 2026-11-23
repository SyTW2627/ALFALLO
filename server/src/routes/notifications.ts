import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth';
import { getNotifications, markNotificationsRead } from '../controllers/notifications';

const router = Router();

router.use(authenticateJWT);

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: Últimas notificaciones (campanita) y cuántas no ha visto el usuario
 *     description: >
 *       Incluye las enviadas a todos por los administradores y las personales del usuario
 *       (ánimos y comentarios en sus publicaciones, nuevos seguidores y retos a punto de completar).
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 noLeidas:
 *                   type: integer
 *                 notificaciones:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', getNotifications);

/**
 * @openapi
 * /api/notifications/read:
 *   post:
 *     summary: Marca todas las notificaciones como leídas
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hecho
 */
router.post('/read', markNotificationsRead);

export default router;
