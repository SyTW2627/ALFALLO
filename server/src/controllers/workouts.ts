import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { Types } from 'mongoose';
import { Workout, WorkoutStatus } from '../models/workout';
import { Post } from '../models/post';
import { progressNews } from './progress';

// Hora enviada por el cliente: los entrenamientos hechos sin conexión se suben más tarde,
// así que el móvil envía cuándo empezaron y terminaron de verdad. Se aceptan solo valores razonables.
const MARGEN_RELOJ_MS = 2 * 60 * 1000; // relojes de móvil algo adelantados
const MAX_ANTIGUEDAD_MS = 30 * 24 * 60 * 60 * 1000;

function horaDelCliente(valor: unknown, desde?: Date): Date | null {
  if (valor === undefined || valor === null || valor === '') return null;
  const fecha = new Date(valor as string);
  const ahora = Date.now();
  if (Number.isNaN(fecha.getTime())) throw new Error('La fecha enviada no es válida');
  if (fecha.getTime() > ahora + MARGEN_RELOJ_MS) throw new Error('La fecha no puede estar en el futuro');
  if (fecha.getTime() < ahora - MAX_ANTIGUEDAD_MS) throw new Error('La fecha es demasiado antigua');
  if (desde && fecha.getTime() < desde.getTime()) throw new Error('El entrenamiento no puede terminar antes de empezar');
  return new Date(Math.min(fecha.getTime(), ahora));
}

// 1. Iniciar un nuevo entrenamiento
export const startWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { title, objective, startedAt } = req.body;

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
      startedAt: horaDelCliente(startedAt) ?? new Date(),
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
    workout.finishedAt = horaDelCliente(req.body?.finishedAt, workout.startedAt) ?? new Date();

    await workout.save();
    await workout.populate('exercises.exercise');
    // Rangos subidos, hitos y retos conseguidos con este entrenamiento.
    // Si falla el cálculo, el entrenamiento ya está guardado igualmente.
    let novedades = null;
    try {
      novedades = await progressNews(userId!, String(workout._id));
    } catch (error) {
      console.error('Error al calcular las novedades de progreso', error);
    }

    return res.status(200).json({ ...workout.toJSON(), novedades });
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

/* ---------- Historial: ver, editar y eliminar entrenamientos terminados ---------- */

// Fecha editada a mano desde el historial: puede ser antigua, pero no futura.
function fechaEditada(valor: unknown, campo: string): Date | undefined {
  if (valor === undefined) return undefined;
  const fecha = new Date(valor as string);
  if (valor === null || valor === '' || Number.isNaN(fecha.getTime())) {
    throw new Error(`La fecha de ${campo} no es válida`);
  }
  if (fecha.getTime() > Date.now() + MARGEN_RELOJ_MS) {
    throw new Error(`La fecha de ${campo} no puede estar en el futuro`);
  }
  return new Date(Math.min(fecha.getTime(), Date.now()));
}

const MAX_DURACION_MS = 24 * 60 * 60 * 1000;

async function buscarTerminado(req: AuthRequest, res: Response) {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(String(id))) {
    res.status(400).json({ message: 'Id de entrenamiento no válido' });
    return null;
  }
  const workout = await Workout.findOne({ _id: id, user: req.user?.id, status: WorkoutStatus.FINISHED });
  if (!workout) {
    res.status(404).json({ message: 'Entrenamiento no encontrado' });
    return null;
  }
  return workout;
}

// 7. Obtener un entrenamiento terminado del historial
export const getWorkoutById = async (req: AuthRequest, res: Response) => {
  try {
    const workout = await buscarTerminado(req, res);
    if (!workout) return;
    await workout.populate('exercises.exercise');
    return res.status(200).json(workout);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener el entrenamiento', error });
  }
};

// 8. Editar un entrenamiento terminado (título, objetivo, notas, fechas, ejercicios y series)
export const updateFinishedWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const workout = await buscarTerminado(req, res);
    if (!workout) return;

    const { title, objective, notes, exercises, startedAt, finishedAt } = req.body ?? {};

    if (title !== undefined) workout.title = title;
    // null o "" quitan el objetivo
    if (objective !== undefined) workout.objective = objective || undefined;
    if (notes !== undefined) workout.notes = notes;
    if (exercises !== undefined) {
      if (!Array.isArray(exercises)) throw new Error('Los ejercicios deben ser una lista');
      workout.exercises = exercises;
    }

    const inicio = fechaEditada(startedAt, 'inicio');
    const fin = fechaEditada(finishedAt, 'fin');
    if (inicio) workout.startedAt = inicio;
    if (fin) workout.finishedAt = fin;
    const duracion = workout.finishedAt!.getTime() - workout.startedAt.getTime();
    if (duracion < 0) throw new Error('El entrenamiento no puede terminar antes de empezar');
    if (duracion > MAX_DURACION_MS) throw new Error('Un entrenamiento no puede durar más de 24 horas');

    // save() ejecuta las validaciones (p. ej. no dejarlo sin ninguna serie).
    await workout.save();
    await workout.populate('exercises.exercise');
    return res.status(200).json(workout);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error al editar el entrenamiento' });
  }
};

// 9. Eliminar un entrenamiento terminado (y su publicación en el feed, si la tenía).
// Los hitos ya conseguidos se conservan: se guardan aparte (ver models/achievement.ts).
export const deleteFinishedWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const workout = await buscarTerminado(req, res);
    if (!workout) return;

    await Post.deleteOne({ workout: workout._id });
    await workout.deleteOne();

    return res.status(200).json({ message: 'Entrenamiento eliminado' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar el entrenamiento', error });
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
