import { Response } from 'express';
import { User } from '../models/user';
import { AuthRequest } from '../middlewares/auth';

// GET /api/users/profile - Obtener perfil del usuario autenticado
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el perfil', error });
  }
};

// PUT /api/users/profile - Actualizar nombre, email, sexo y peso corporal
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, sex, bodyWeightKg } = req.body;

    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (sex !== undefined) user.sex = sex;

    // El peso se guarda como historial. Si ya hay un registro de hoy, se sustituye.
    if (bodyWeightKg !== undefined && bodyWeightKg !== null && bodyWeightKg !== '') {
      const kg = Number(bodyWeightKg);
      if (!Number.isFinite(kg)) {
        return res.status(400).json({ message: 'El peso corporal debe ser un número' });
      }
      const hoy = new Date().toISOString().slice(0, 10);
      const ultimo = user.bodyWeights.at(-1);
      if (ultimo && new Date(ultimo.date).toISOString().slice(0, 10) === hoy) {
        ultimo.kg = kg;
      } else {
        user.bodyWeights.push({ kg, date: new Date() });
      }
    }

    await user.save();

    res.json({
      message: 'Perfil actualizado con éxito',
      user,
    });
  } catch (error: any) {
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join('. ') });
    }
    if (error?.code === 11000) {
      return res.status(400).json({ message: 'Ese email ya está en uso' });
    }
    res.status(500).json({ message: 'Error al actualizar el perfil', error });
  }
};

// PATCH /api/users/change-password - Cambiar contraseña
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Debes proporcionar la contraseña actual y la nueva' });
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Comprobar contraseña actual
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
    }

    // Asignar nueva contraseña (el pre('save') del modelo la encriptará)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar la contraseña', error });
  }
};

// DELETE /api/users/account - Eliminar cuenta propia
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.user?.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Cuenta eliminada con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la cuenta', error });
  }
};