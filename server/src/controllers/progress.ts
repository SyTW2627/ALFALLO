import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { User } from '../models/user';
import { Workout, WorkoutStatus } from '../models/workout';
import { Achievement } from '../models/achievement';
import { computeProgress, diffProgress, Progress, WorkoutIn } from '../progress/engine';
import { Sex } from '../progress/standards';

// Convierte los entrenamientos de Mongo (con los ejercicios populados) al formato del motor.
function toEngineWorkouts(docs: any[]): WorkoutIn[] {
  return docs
    .filter((w) => w.finishedAt)
    .map((w) => ({
      id: String(w._id),
      startedAt: new Date(w.startedAt),
      finishedAt: new Date(w.finishedAt),
      exercises: (w.exercises ?? [])
        .filter((x: any) => x.exercise && typeof x.exercise === 'object')
        .map((x: any) => ({
          id: String(x.exercise._id),
          name: x.exercise.name ?? '',
          bodyPart: x.exercise.bodyPart ?? '',
          rankingKey: x.exercise.rankingKey ?? null,
          sets: (x.sets ?? []).map((s: any) => ({ reps: s.reps, weightKg: s.weightKg })),
        })),
    }));
}

async function loadProgressData(userId: string) {
  const [user, workouts] = await Promise.all([
    User.findById(userId),
    Workout.find({ user: userId, status: WorkoutStatus.FINISHED })
      .populate('exercises.exercise')
      .sort({ finishedAt: 1 })
      .lean(),
  ]);
  if (!user) return null;
  return {
    user,
    input: {
      workouts: toEngineWorkouts(workouts),
      bodyWeights: (user.bodyWeights ?? []).map((b) => ({ kg: b.kg, date: new Date(b.date) })),
      sex: (user.sex ?? 'unspecified') as Sex,
    },
  };
}

// Guarda los hitos recién conseguidos y devuelve la lista con su fecha de desbloqueo.
async function syncAchievements(userId: string, progress: Progress) {
  const guardados = await Achievement.find({ user: userId }).lean();
  const fechas = new Map(guardados.map((a) => [a.key, a.unlockedAt]));
  const nuevos = progress.hitos.filter((h) => h.conseguido && !fechas.has(h.key));

  if (nuevos.length) {
    const ahora = new Date();
    try {
      await Achievement.insertMany(
        nuevos.map((h) => ({ user: userId, key: h.key, unlockedAt: ahora })),
        { ordered: false }
      );
    } catch {
      // Duplicados por dos peticiones simultáneas: el índice único ya los evita.
    }
    nuevos.forEach((h) => fechas.set(h.key, ahora));
  }

  return {
    // Un hito guardado sigue conseguido aunque luego se borren entrenamientos.
    hitos: progress.hitos.map((h) => ({
      ...h,
      conseguido: fechas.has(h.key),
      conseguidoEn: fechas.get(h.key) ?? null,
    })),
    nuevos: nuevos.map((h) => ({ key: h.key, titulo: h.titulo, descripcion: h.descripcion })),
  };
}

const publicProgress = ({ _idxActual, ...p }: Progress) => p;

// GET /api/progress - Rangos, hitos y retos del usuario
export const getProgress = async (req: AuthRequest, res: Response) => {
  try {
    const data = await loadProgressData(req.user!.id);
    if (!data) return res.status(404).json({ message: 'Usuario no encontrado' });

    const progress = computeProgress(data.input);
    const { hitos } = await syncAchievements(req.user!.id, progress);

    return res.status(200).json({
      perfil: {
        sexo: data.user.sex ?? 'unspecified',
        pesoCorporalKg: data.input.bodyWeights.at(-1)?.kg ?? null,
        historialPeso: data.input.bodyWeights,
      },
      ...publicProgress(progress),
      hitos,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al calcular tu progreso', error });
  }
};

// Se llama al terminar un entrenamiento: compara el progreso sin y con ese entrenamiento.
export async function progressNews(userId: string, workoutId: string) {
  const data = await loadProgressData(userId);
  if (!data) return null;

  const despues = computeProgress(data.input);
  const antes = computeProgress({ ...data.input, workouts: data.input.workouts.filter((w) => w.id !== workoutId) });
  const { nuevos } = await syncAchievements(userId, despues);

  return { ...diffProgress(antes, despues), hitos: nuevos };
}