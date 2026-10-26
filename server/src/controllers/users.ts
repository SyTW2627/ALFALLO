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

// PUT /api/users/profile - Actualizar datos básicos (nombre, email)
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user?.id,
      { name, email },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      message: 'Perfil actualizado con éxito',
      user: updatedUser,
    });
  } catch (error) {
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