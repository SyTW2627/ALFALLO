import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { Workout, WorkoutStatus } from '../models/workout';

// 1. Iniciar un nuevo entrenamiento
export const startWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { title, objective } = req.body;

    // Comprobar si ya hay un entrenamiento en curso
    const activeWorkout = await Workout.findOne({ user: userId, status: WorkoutStatus.IN_PROGRESS });
    if (activeWorkout) {
      return res.status(409).json({ message: 'Ya tienes un entrenamiento en curso', workout: activeWorkout });
    }

    const workout = new Workout({
      user: userId,
      title,
      objective,
      status: WorkoutStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    await workout.save();
    await workout.populate('exercises.exercise');
    return res.status(201).json(workout);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error al iniciar el entrenamiento' });
  }
};

// 2. Actualizar / Registrar ejercicios y series mientras se entrena
export const updateActiveWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { exercises, notes } = req.body;

    const workout = await Workout.findOne({ user: userId, status: WorkoutStatus.IN_PROGRESS });
    if (!workout) {
      return res.status(404).json({ message: 'No tienes ningún entrenamiento en curso' });
    }

    if (exercises) workout.exercises = exercises;
    if (notes !== undefined) workout.notes = notes;

    await workout.save();
    await workout.populate('exercises.exercise');
    return res.status(200).json(workout);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error al actualizar el entrenamiento' });
  }
};

// 3. Finalizar entrenamiento
export const finishWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const workout = await Workout.findOne({ user: userId, status: WorkoutStatus.IN_PROGRESS });
    if (!workout) {
      return res.status(404).json({ message: 'No hay entrenamiento activo para finalizar' });
    }

    workout.status = WorkoutStatus.FINISHED;
    workout.finishedAt = new Date();

    await workout.save();
    await workout.populate('exercises.exercise');
    return res.status(200).json(workout);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error al finalizar el entrenamiento' });
  }
};

// 4. Obtener historial de entrenamientos terminados
export const getWorkoutHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const history = await Workout.find({ user: userId, status: WorkoutStatus.FINISHED })
      .populate('exercises.exercise')
      .sort({ finishedAt: -1 });

    return res.status(200).json(history);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener el historial', error });
  }
};

// 5. Obtener el entrenamiento en curso (para retomarlo al recargar la página)
export const getActiveWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const workout = await Workout.findOne({ user: userId, status: WorkoutStatus.IN_PROGRESS })
      .populate('exercises.exercise');

    // 200 con null en vez de 404: no tener entrenamiento activo es un estado normal.
    return res.status(200).json(workout);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener el entrenamiento en curso', error });
  }
};

// 6. Descartar el entrenamiento en curso sin guardarlo
export const discardActiveWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const workout = await Workout.findOneAndDelete({ user: userId, status: WorkoutStatus.IN_PROGRESS });
    if (!workout) {
      return res.status(404).json({ message: 'No tienes ningún entrenamiento en curso' });
    }

    return res.status(200).json({ message: 'Entrenamiento descartado' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al descartar el entrenamiento', error });
  }
};
