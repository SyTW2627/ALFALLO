import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { Routine } from '../models/routines';
import { Exercise } from '../models/exercises';
import { ROUTINE_TEMPLATES } from '../routines/templates';
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
    const id = req.params.id as string;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id de rutina no válido' });
    }

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

/* ---------- Rutinas por defecto (plantillas) ---------- */

// Convierte las plantillas a la misma forma que una rutina de la API, con los ejercicios del catálogo.
async function resolverPlantillas() {
  const nombres = [...new Set(ROUTINE_TEMPLATES.flatMap((t) => t.dias.flatMap((d) => d.exercises.map((e) => e.ejercicio))))];
  const ejercicios = await Exercise.find({ name: { $in: nombres } }).lean();
  const porNombre = new Map(ejercicios.map((e) => [e.name, e]));

  return ROUTINE_TEMPLATES.map((t) => {
    const faltan = new Set<string>();
    const days = t.dias
      .map((d) => ({
        name: d.name,
        objective: d.objective,
        exercises: d.exercises
          .filter((linea) => {
            if (!porNombre.has(linea.ejercicio)) faltan.add(linea.ejercicio);
            return porNombre.has(linea.ejercicio);
          })
          .map((linea) => ({
            exercise: porNombre.get(linea.ejercicio)!,
            sets: linea.sets,
            reps: linea.reps,
            restInSeconds: linea.restInSeconds,
          })),
      }))
      .filter((d) => d.exercises.length > 0);

    return {
      clave: t.clave,
      name: t.nombre,
      descripcion: t.descripcion,
      nivel: t.nivel,
      frecuencia: t.frecuencia,
      days,
      faltan: [...faltan],
      disponible: days.length > 0,
    };
  });
}

// GET /api/routines/templates - Rutinas por defecto: Heavy Duty, Push Pull Legs y Upper Lower
export const getRoutineTemplates = async (_req: AuthRequest, res: Response) => {
  try {
    return res.status(200).json(await resolverPlantillas());
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener las rutinas por defecto', error });
  }
};

// POST /api/routines/templates/:clave - Copia una rutina por defecto a las rutinas del usuario
export const copyRoutineTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const plantilla = (await resolverPlantillas()).find((t) => t.clave === req.params.clave);
    if (!plantilla) {
      return res.status(404).json({ message: 'Rutina por defecto no encontrada' });
    }
    if (!plantilla.disponible) {
      return res.status(409).json({ message: 'Faltan sus ejercicios en el catálogo (ejecuta npm run seed)' });
    }

    const routine = new Routine({
      user: req.user?.id,
      name: plantilla.name,
      days: plantilla.days.map((d) => ({
        ...d,
        exercises: d.exercises.map((e) => ({ ...e, exercise: e.exercise._id })),
      })),
    });
    await routine.save();
    await routine.populate('days.exercises.exercise');
    return res.status(201).json(routine);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error al copiar la rutina' });
  }
};
