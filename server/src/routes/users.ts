import { Router } from 'express';
import { getProfile, updateProfile, changePassword, deleteAccount } from '../controllers/users';
import { authenticateJWT } from '../middlewares/auth';
import { followUser, unfollowUser, getFollowers, getFollowing, getPublicProfile } from '../controllers/social';

const router = Router();

// Todas estas rutas requieren estar autenticado
router.use(authenticateJWT);

/**
 * @openapi
 * /api/users/profile:
 *   get:
 *     summary: Obtiene el perfil del usuario autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Usuario no encontrado
 *   put:
 *     summary: Actualiza el nombre y el email del usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Iker
 *               email:
 *                 type: string
 *                 format: email
 *                 example: iker@example.com
 *     responses:
 *       200:
 *         description: Perfil actualizado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/profile', getProfile); // /api/users/profile - Obtener perfil del usuario autenticado
router.put('/profile', updateProfile); // /api/users/profile - Actualizar datos básicos (nombre, email)

/**
 * @openapi
 * /api/users/change-password:
 *   patch:
 *     summary: Cambia la contraseña del usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Faltan campos o la contraseña actual es incorrecta
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/change-password', changePassword); // /api/users/change-password - Cambiar contraseña

/**
 * @openapi
 * /api/users/account:
 *   delete:
 *     summary: Elimina la cuenta del usuario autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cuenta eliminada con éxito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Usuario no encontrado
 */
router.delete('/account', deleteAccount); // /api/users/account - Eliminar cuenta propia

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: Perfil público de un usuario (datos, estadísticas y últimos posts)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Perfil público
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicProfile'
 *       400:
 *         description: Id no válido
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/:id', getPublicProfile);

/**
 * @openapi
 * /api/users/{id}/follow:
 *   post:
 *     summary: Seguir a un usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ahora lo sigues (si ya lo seguías, no cambia nada)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowResponse'
 *       400:
 *         description: Id no válido o intento de seguirte a ti mismo
 *       404:
 *         description: Usuario no encontrado
 *   delete:
 *     summary: Dejar de seguir a un usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ya no lo sigues
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowResponse'
 *       400:
 *         description: Id no válido
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/:id/follow', followUser);
router.delete('/:id/follow', unfollowUser);

/**
 * @openapi
 * /api/users/{id}/followers:
 *   get:
 *     summary: Lista de seguidores de un usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuarios que lo siguen
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserSummary'
 *       404:
 *         description: Usuario no encontrado
 * /api/users/{id}/following:
 *   get:
 *     summary: Lista de usuarios a los que sigue
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuarios seguidos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserSummary'
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

export default router;