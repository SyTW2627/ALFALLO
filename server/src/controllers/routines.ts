import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { Routine } from '../models/routines';

// Obtener todas las rutinas del usuario autenticado
export const getUserRoutines = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const routines = await Routine.find({ user: userId })
      .populate('days.exercises.exercise')
      .sort({ createdAt: -1 });

    return res.status(200).json(routines);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener las rutinas', error });
  }
};

// Crear una nueva rutina
export const createRoutine = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, days } = req.body;

    const routine = new Routine({
      user: userId,
      name,
      days,
    });

    await routine.save();
    await routine.populate('days.exercises.exercise');

    return res.status(201).json(routine);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error al crear la rutina' });
  }
};

// Eliminar una rutina
export const deleteRoutine = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const routine = await Routine.findOneAndDelete({ _id: id, user: userId });
    if (!routine) {
      return res.status(404).json({ message: 'Rutina no encontrada o no autorizada' });
    }

    return res.status(200).json({ message: 'Rutina eliminada correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar la rutina', error });
  }
};