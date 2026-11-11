import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import { Post } from '../models/post';
import { Workout, WorkoutStatus } from '../models/workout';

// Datos que se rellenan al devolver un post: autor, entrenamiento con sus ejercicios y autores de comentarios
const POPULATE = [
  { path: 'user', select: 'name' },
  { path: 'workout', populate: { path: 'exercises.exercise', select: 'name bodyPart' } },
  { path: 'comments.user', select: 'name' },
];

// Añade si el usuario que pide el post ya le ha dado kudos
const conMiKudo = (post: any, userId?: string) => ({
  ...post.toJSON(),
  hasKudo: post.kudos.some((id: Types.ObjectId) => id.equals(userId)),
});

// POST /api/posts - Publicar un entrenamiento terminado
export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { workoutId, caption } = req.body;

    if (!workoutId || !Types.ObjectId.isValid(workoutId)) {
      return res.status(400).json({ message: 'Id de entrenamiento no válido' });
    }

    const workout = await Workout.findOne({ _id: workoutId, user: userId });
    if (!workout) {
      return res.status(404).json({ message: 'Entrenamiento no encontrado' });
    }
    if (workout.status !== WorkoutStatus.FINISHED) {
      return res.status(400).json({ message: 'Solo se pueden publicar entrenamientos terminados' });
    }

    const exists = await Post.findOne({ workout: workoutId });
    if (exists) {
      return res.status(409).json({ message: 'Este entrenamiento ya está publicado' });
    }

    const post = new Post({ user: userId, workout: workoutId, caption });
    await post.save();
    await post.populate(POPULATE);
    return res.status(201).json(conMiKudo(post, userId));
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error al publicar el entrenamiento' });
  }
};

// GET /api/posts/feed?page=1&limit=10 - Posts más recientes
export const getFeed = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(POPULATE);

    return res.status(200).json(posts.map((p) => conMiKudo(p, userId)));
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener el feed', error });
  }
};

// GET /api/posts/:id - Un post con sus comentarios
export const getPostById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id de post no válido' });
    }

    const post = await Post.findById(id).populate(POPULATE);
    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }
    return res.status(200).json(conMiKudo(post, req.user?.id));
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener el post', error });
  }
};

// DELETE /api/posts/:id - Borrar un post propio (el entrenamiento no se borra)
export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id de post no válido' });
    }

    const post = await Post.findOneAndDelete({ _id: id, user: req.user?.id });
    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }
    return res.status(200).json({ message: 'Post eliminado' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar el post', error });
  }
};

// POST /api/posts/:id/kudos - Dar kudos (si ya lo había dado, no cambia nada)
export const giveKudo = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id de post no válido' });
    }

    const post = await Post.findByIdAndUpdate(
      id,
      { $addToSet: { kudos: req.user?.id } },
      { returnDocument: 'after' }
    );
    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }
    return res.status(200).json({ kudosCount: post.kudos.length, hasKudo: true });
  } catch (error) {
    return res.status(500).json({ message: 'Error al dar kudos', error });
  }
};

// DELETE /api/posts/:id/kudos - Quitar el kudos
export const removeKudo = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id de post no válido' });
    }

    const post = await Post.findByIdAndUpdate(
      id,
      { $pull: { kudos: req.user?.id } },
      { returnDocument: 'after' }
    );
    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }
    return res.status(200).json({ kudosCount: post.kudos.length, hasKudo: false });
  } catch (error) {
    return res.status(500).json({ message: 'Error al quitar el kudos', error });
  }
};

// POST /api/posts/:id/comments - Comentar un post
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { text } = req.body;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id de post no válido' });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    post.comments.push({ user: req.user?.id, text });
    await post.save();
    await post.populate({ path: 'comments.user', select: 'name' });

    return res.status(201).json(post.comments[post.comments.length - 1]);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error al comentar' });
  }
};

// DELETE /api/posts/:id/comments/:commentId - Borrar un comentario (su autor o el dueño del post)
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const commentId = req.params.commentId as string;
    const userId = req.user?.id;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Id no válido' });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comentario no encontrado' });
    }
    if (!comment.user.equals(userId) && !post.user.equals(userId)) {
      return res.status(403).json({ message: 'No puedes borrar este comentario' });
    }

    comment.deleteOne();
    await post.save();
    return res.status(200).json({ message: 'Comentario eliminado' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar el comentario', error });
  }
};