import { Router } from 'express';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';
import {
  accessAdmin,
  leaveAdmin,
  getOptions,
  listAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  listChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  listNotifications,
  createNotification,
  deleteNotification,
  listExercises,
} from '../controllers/admin';

const router = Router();

router.use(authenticateJWT);

/**
 * @openapi
 * /api/admin/access:
 *   post:
 *     summary: Entra como administrador con la contraseña de administración
 *     description: >
 *       El usuario (ya autenticado) envía la contraseña de administración (variable de entorno ADMIN_PASSWORD).
 *       Si es correcta, su rol pasa a "admin" y se devuelve un token nuevo. Máximo 5 intentos fallidos cada 15 minutos.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Acceso concedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Contraseña incorrecta (o falta el token)
 *       429:
 *         description: Demasiados intentos fallidos
 *       503:
 *         description: ADMIN_PASSWORD no está configurada
 */
router.post('/access', accessAdmin);

/**
 * @openapi
 * /api/admin/leave:
 *   post:
 *     summary: Sale del modo administrador (el rol vuelve a "user")
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Nuevo token con rol de usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/leave', requireAdmin, leaveAdmin);

// A partir de aquí, todo requiere ser administrador.
router.use(requireAdmin);

/**
 * @openapi
 * /api/admin/options:
 *   get:
 *     summary: Métricas, categorías, rangos y zonas disponibles para crear hitos y retos
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Opciones de los formularios
 *       403:
 *         description: No eres administrador
 */
router.get('/options', getOptions);

/**
 * @openapi
 * /api/admin/achievements:
 *   get:
 *     summary: Lista los hitos creados por administradores (con cuántos usuarios lo han conseguido)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de hitos
 *   post:
 *     summary: Crea un hito que verán todos los usuarios
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomAchievementInput'
 *     responses:
 *       201:
 *         description: Hito creado
 *       400:
 *         description: Datos no válidos
 * /api/admin/achievements/{id}:
 *   put:
 *     summary: Edita un hito
 *     tags: [Admin]
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
 *             $ref: '#/components/schemas/CustomAchievementInput'
 *     responses:
 *       200:
 *         description: Hito actualizado
 *       404:
 *         description: Hito no encontrado
 *   delete:
 *     summary: Elimina un hito (y el registro de quién lo había conseguido)
 *     tags: [Admin]
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
 *         description: Hito eliminado
 *       404:
 *         description: Hito no encontrado
 */
router.get('/achievements', listAchievements);
router.post('/achievements', createAchievement);
router.put('/achievements/:id', updateAchievement);
router.delete('/achievements/:id', deleteAchievement);

/**
 * @openapi
 * /api/admin/challenges:
 *   get:
 *     summary: Lista los retos especiales (con su estado programado / en curso / terminado)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de retos
 *   post:
 *     summary: Crea un reto especial con fecha de inicio y fin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomChallengeInput'
 *     responses:
 *       201:
 *         description: Reto creado
 *       400:
 *         description: Datos no válidos
 * /api/admin/challenges/{id}:
 *   put:
 *     summary: Edita un reto especial
 *     tags: [Admin]
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
 *             $ref: '#/components/schemas/CustomChallengeInput'
 *     responses:
 *       200:
 *         description: Reto actualizado
 *       404:
 *         description: Reto no encontrado
 *   delete:
 *     summary: Elimina un reto especial
 *     tags: [Admin]
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
 *         description: Reto eliminado
 *       404:
 *         description: Reto no encontrado
 */
router.get('/challenges', listChallenges);
router.post('/challenges', createChallenge);
router.put('/challenges/:id', updateChallenge);
router.delete('/challenges/:id', deleteChallenge);

/**
 * @openapi
 * /api/admin/notifications:
 *   get:
 *     summary: Lista las notificaciones enviadas
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de notificaciones
 *   post:
 *     summary: Envía una notificación a todos los usuarios
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, mensaje]
 *             properties:
 *               titulo:
 *                 type: string
 *                 example: ¡Nuevo reto de diciembre!
 *               mensaje:
 *                 type: string
 *                 example: Entra en Logros para ver el reto especial de este mes.
 *               enlace:
 *                 type: string
 *                 example: /progreso?tab=retos
 *     responses:
 *       201:
 *         description: Notificación enviada
 *       400:
 *         description: Datos no válidos
 * /api/admin/notifications/{id}:
 *   delete:
 *     summary: Elimina una notificación
 *     tags: [Admin]
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
 *         description: Notificación eliminada
 *       404:
 *         description: Notificación no encontrada
 */
router.get('/notifications', listNotifications);
router.post('/notifications', createNotification);
router.delete('/notifications/:id', deleteNotification);

/**
 * @openapi
 * /api/admin/exercises:
 *   get:
 *     summary: Catálogo de ejercicios con su uso (entrenamientos y rutinas que lo incluyen)
 *     description: Para crear, editar o borrar ejercicios se usan POST/PUT/DELETE de /api/exercises.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ejercicios
 */
router.get('/exercises', listExercises);

export default router;
