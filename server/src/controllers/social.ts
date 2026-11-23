import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import { User } from '../models/user';
import { Post } from '../models/post';
import { Workout, WorkoutStatus } from '../models/workout';
import { POPULATE, conMiKudo } from './posts';
import { avisarSeguidor } from '../notifications/personal';

// Número de seguidores de un usuario: cuántos usuarios lo tienen en su "following"
const contarSeguidores = (id: string | Types.ObjectId) => User.countDocuments({ following: id });

// POST /api/users/:id/follow - Seguir a un usuario
export const followUser = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user?.id as string;
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id de usuario no válido' });
    }
    if (id === me) {
      return res.status(400).json({ message: 'No puedes seguirte a ti mismo' });
    }

    const target = await User.exists({ _id: id });
    if (!target) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // $addToSet: si ya lo seguía, no se duplica
    await User.updateOne({ _id: me }, { $addToSet: { following: id } });
    await avisarSeguidor(id, me); // "Pablo te sigue" (solo la primera vez)
    return res.status(200).json({ following: true, followersCount: await contarSeguidores(id) });
  } catch (error) {
    return res.status(500).json({ message: 'Error al seguir al usuario', error });
  }
};

// DELETE /api/users/:id/follow - Dejar de seguir a un usuario
export const unfollowUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id de usuario no válido' });
    }

    const target = await User.exists({ _id: id });
    if (!target) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await User.updateOne({ _id: req.user?.id }, { $pull: { following: id } });
    return res.status(200).json({ following: false, followersCount: await contarSeguidores(id) });
  } catch (error) {
    return res.status(500).json({ message: 'Error al dejar de seguir al usuario', error });
  }
};

// GET /api/users/:id/followers - Quién sigue a este usuario
export const getFollowers = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id de usuario no válido' });
    }
    if (!(await User.exists({ _id: id }))) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const followers = await User.find({ following: id }).select('name').sort({ name: 1 });
    return res.status(200).json(followers);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener los seguidores', error });
  }
};

// GET /api/users/:id/following - A quién sigue este usuario
export const getFollowing = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id de usuario no válido' });
    }

    const user = await User.findById(id).select('following').populate('following', 'name');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    return res.status(200).json(user.following);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener los seguidos', error });
  }
};

// GET /api/users/:id - Perfil público: datos básicos, estadísticas y sus últimos posts
export const getPublicProfile = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user?.id as string;
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id de usuario no válido' });
    }

    // Solo datos públicos: nunca email, contraseña ni peso corporal
    const user = await User.findById(id).select('name createdAt following');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const [workouts, followers, isFollowing, posts] = await Promise.all([
      Workout.countDocuments({ user: id, status: WorkoutStatus.FINISHED }),
      contarSeguidores(id),
      User.exists({ _id: me, following: id }),
      Post.find({ user: id }).sort({ createdAt: -1 }).limit(20).populate(POPULATE),
    ]);

    return res.status(200).json({
      user: { _id: user._id, name: user.name, createdAt: user.get('createdAt') },
      stats: { workouts, posts: posts.length, followers, following: user.following.length },
      isMe: id === me,
      isFollowing: Boolean(isFollowing),
      posts: posts.map((p) => conMiKudo(p, me)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener el perfil', error });
  }
};