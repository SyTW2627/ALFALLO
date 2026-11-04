import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { Routine } from '../models/routines';
import { Types } from 'mongoose';

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

// GET /api/routines/:id - Obtener una rutina concreta del usuario (para abrirla en el editor)
export const getRoutineById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const id = req.params.id as string;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id de rutina no válido' });
    }

    const routine = await Routine.findOne({ _id: id, user: userId })
      .populate('days.exercises.exercise');

    if (!routine) {
      return res.status(404).json({ message: 'Rutina no encontrada' });
    }

    return res.status(200).json(routine);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener la rutina', error });
  }
};

// PUT /api/routines/:id - Editar el nombre y/o los días de una rutina del usuario
export const updateRoutine = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const id = req.params.id as string;
    const { name, days } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id de rutina no válido' });
    }

    const routine = await Routine.findOne({ _id: id, user: userId });
    if (!routine) {
      return res.status(404).json({ message: 'Rutina no encontrada' });
    }

    if (name !== undefined) routine.name = name;
    if (days !== undefined) routine.set('days', days);

    // Se usa save() (y no findOneAndUpdate) para que se ejecute la validación
    // de series, repeticiones y descanso según el objetivo de cada día
    await routine.save();
    await routine.populate('days.exercises.exercise');

    return res.status(200).json(routine);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error al actualizar la rutina' });
  }
};