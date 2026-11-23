import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Exercise } from '../models/exercises';
import { Workout } from '../models/workout';
import { Routine } from '../models/routines';

export const getExercises = async (req: Request, res: Response) => {
  try {
    const exercises = await Exercise.find().sort({ name: 1 });
    return res.status(200).json(exercises);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener los ejercicios', error });
  }
};

export const createExercise = async (req: Request, res: Response) => {
  try {
    const { name, description, bodyPart, difficulty, rankingKey } = req.body;

    const existingExercise = await Exercise.findOne({ name });
    if (existingExercise) {
      return res.status(400).json({ message: 'Ya existe un ejercicio con ese nombre' });
    }

    const exercise = new Exercise({ name, description, bodyPart, difficulty, rankingKey });
    await exercise.save();

    return res.status(201).json(exercise);
  } catch (error: any) {
    if (error?.code === 11000) return res.status(400).json({ message: 'Ya existe un ejercicio con ese nombre' });
    return res.status(400).json({ message: error.message || 'Error al crear el ejercicio' });
  }
};

// Campos que se pueden editar de un ejercicio.
const CAMPOS = ['name', 'description', 'bodyPart', 'difficulty', 'rankingKey'] as const;

// Cuántos entrenamientos y rutinas usan cada ejercicio (para saber si se puede borrar).
export async function exerciseUsage(ids?: Types.ObjectId[]) {
  const filtroW = ids ? { 'exercises.exercise': { $in: ids } } : {};
  const filtroR = ids ? { 'days.exercises.exercise': { $in: ids } } : {};
  const [enEntrenos, enRutinas] = await Promise.all([
    Workout.aggregate([
      { $match: filtroW },
      { $unwind: '$exercises' },
      { $group: { _id: '$exercises.exercise', ids: { $addToSet: '$_id' } } },
      { $project: { total: { $size: '$ids' } } },
    ]),
    Routine.aggregate([
      { $match: filtroR },
      { $unwind: '$days' },
      { $unwind: '$days.exercises' },
      { $group: { _id: '$days.exercises.exercise', ids: { $addToSet: '$_id' } } },
      { $project: { total: { $size: '$ids' } } },
    ]),
  ]);
  const uso = new Map<string, { entrenamientos: number; rutinas: number }>();
  const de = (id: string) => uso.get(id) ?? { entrenamientos: 0, rutinas: 0 };
  enEntrenos.forEach((e) => uso.set(String(e._id), { ...de(String(e._id)), entrenamientos: e.total }));
  enRutinas.forEach((r) => uso.set(String(r._id), { ...de(String(r._id)), rutinas: r.total }));
  return (id: string) => de(id);
}

const esNombreRepetido = (error: any) => error?.code === 11000;

// PUT /api/exercises/:id - Editar un ejercicio (solo administradores)
export const updateExercise = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Id de ejercicio no válido' });

    const exercise = await Exercise.findById(id);
    if (!exercise) return res.status(404).json({ message: 'Ejercicio no encontrado' });

    for (const campo of CAMPOS) {
      if (req.body?.[campo] !== undefined) exercise.set(campo, req.body[campo] === '' && campo === 'rankingKey' ? null : req.body[campo]);
    }
    await exercise.save();
    return res.status(200).json(exercise);
  } catch (error: any) {
    if (esNombreRepetido(error)) return res.status(400).json({ message: 'Ya existe un ejercicio con ese nombre' });
    return res.status(400).json({ message: error.message || 'Error al actualizar el ejercicio' });
  }
};

// DELETE /api/exercises/:id - Solo si nadie lo usa: si no, los entrenamientos y rutinas se quedarían sin él
export const deleteExercise = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Id de ejercicio no válido' });

    const exercise = await Exercise.findById(id);
    if (!exercise) return res.status(404).json({ message: 'Ejercicio no encontrado' });

    const uso = (await exerciseUsage([exercise._id as Types.ObjectId]))(id);
    if (uso.entrenamientos || uso.rutinas) {
      return res.status(409).json({
        message: `No se puede eliminar: se usa en ${uso.entrenamientos} entrenamiento(s) y ${uso.rutinas} rutina(s). Puedes editarlo en su lugar.`,
        uso,
      });
    }

    await exercise.deleteOne();
    return res.status(200).json({ message: 'Ejercicio eliminado' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar el ejercicio', error });
  }
};
