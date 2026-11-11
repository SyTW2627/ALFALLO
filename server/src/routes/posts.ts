import { Router } from 'express';
import {
  createPost,
  getFeed,
  getPostById,
  deletePost,
  giveKudo,
  removeKudo,
  addComment,
  deleteComment,
} from '../controllers/posts';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT); // Proteger todas las rutas de posts

/**
 * @openapi
 * /api/posts:
 *   post:
 *     summary: Publica un entrenamiento terminado en el feed
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PostInput'
 *     responses:
 *       201:
 *         description: Post creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: Id no válido o el entrenamiento no está terminado
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Entrenamiento no encontrado
 *       409:
 *         description: Este entrenamiento ya está publicado
 */
router.post('/', createPost);

/**
 * @openapi
 * /api/posts/feed:
 *   get:
 *     summary: Feed con los posts más recientes
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *     responses:
 *       200:
 *         description: Lista de posts, del más reciente al más antiguo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/feed', getFeed);

/**
 * @openapi
 * /api/posts/{id}:
 *   get:
 *     summary: Obtiene un post con sus comentarios
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: Id no válido
 *       404:
 *         description: Post no encontrado
 *   delete:
 *     summary: Elimina un post propio (el entrenamiento se mantiene)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post eliminado
 *       400:
 *         description: Id no válido
 *       404:
 *         description: Post no encontrado o no es tuyo
 */
router.get('/:id', getPostById);
router.delete('/:id', deletePost);

/**
 * @openapi
 * /api/posts/{id}/kudos:
 *   post:
 *     summary: Da kudos a un post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Kudos dado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KudosResponse'
 *       404:
 *         description: Post no encontrado
 *   delete:
 *     summary: Quita el kudos de un post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Kudos quitado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KudosResponse'
 *       404:
 *         description: Post no encontrado
 */
router.post('/:id/kudos', giveKudo);
router.delete('/:id/kudos', removeKudo);

/**
 * @openapi
 * /api/posts/{id}/comments:
 *   post:
 *     summary: Comenta un post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 500
 *                 example: ¡Bestia! Ese press de banca
 *     responses:
 *       201:
 *         description: Comentario creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Comentario vacío o demasiado largo
 *       404:
 *         description: Post no encontrado
 */
router.post('/:id/comments', addComment);

/**
 * @openapi
 * /api/posts/{id}/comments/{commentId}:
 *   delete:
 *     summary: Borra un comentario (su autor o el dueño del post)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Comentario eliminado
 *       403:
 *         description: No puedes borrar este comentario
 *       404:
 *         description: Post o comentario no encontrado
 */
router.delete('/:id/comments/:commentId', deleteComment);

export default router;