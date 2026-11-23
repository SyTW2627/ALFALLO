import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { User } from '../models/user';
import { Workout, WorkoutStatus } from '../models/workout';
import { CustomChallenge } from '../models/customChallenge';
import { weekStart, WorkoutIn } from '../progress/engine';
import { CUSTOM_CHALLENGE_METRICS } from '../progress/custom';
import { toEngineWorkouts } from './progress';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
// Los retos especiales terminados se siguen mostrando unos días (para ver quién ganó).
const DIAS_RETO_TERMINADO = 7;

const volumenDe = (w: WorkoutIn) =>
  w.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + s.reps * s.weightKg, 0), 0);

// Posición con empates: 1, 2, 2, 4...
function conPosiciones<T>(lista: T[], valor: (x: T) => number | string) {
  let anterior: number | string | undefined;
  let posicion = 0;
  return lista.map((x, i) => {
    const v = valor(x);
    if (i === 0 || v !== anterior) posicion = i + 1;
    anterior = v;
    return { ...x, posicion };
  });
}

// GET /api/leaderboard - Clasificaciones entre tú y la gente que sigues:
// volumen y entrenamientos de esta semana, y quién completó antes cada reto especial.
export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.id;
    const yo = await User.findById(me).select('following').lean();
    if (!yo) return res.status(404).json({ message: 'Usuario no encontrado' });

    const ahora = new Date();
    const lunes = weekStart(ahora);
    const ids = [me, ...(yo.following ?? []).map(String)];

    const [usuarios, retos] = await Promise.all([
      User.find({ _id: { $in: ids } }).select('name').lean(),
      CustomChallenge.find({
        activo: true,
        inicio: { $lte: ahora },
        fin: { $gte: new Date(ahora.getTime() - DIAS_RETO_TERMINADO * DAY) },
      })
        .sort({ fin: 1 })
        .lean(),
    ]);

    const desde = new Date(Math.min(lunes.getTime(), ...retos.map((r) => new Date(r.inicio).getTime())));
    const docs = await Workout.find({ user: { $in: ids }, status: WorkoutStatus.FINISHED, finishedAt: { $gte: desde } })
      .populate('exercises.exercise', 'name bodyPart rankingKey')
      .sort({ finishedAt: 1 })
      .lean();
    const usuarioDe = new Map(docs.map((d) => [String(d._id), String(d.user)]));
    const porUsuario = new Map<string, WorkoutIn[]>(usuarios.map((u) => [String(u._id), []]));
    for (const w of toEngineWorkouts(docs)) porUsuario.get(usuarioDe.get(w.id)!)?.push(w);

    const persona = (u: { _id: unknown; name?: unknown }) => ({
      usuario: { id: String(u._id), nombre: String(u.name ?? 'Usuario') },
      esYo: String(u._id) === me,
    });

    /* ---------- Esta semana (de lunes a hoy) ---------- */
    const semana = usuarios.map((u) => {
      const ws = (porUsuario.get(String(u._id)) ?? []).filter((w) => w.finishedAt >= lunes);
      return {
        ...persona(u),
        volumen: Math.round(ws.reduce((a, w) => a + volumenDe(w), 0)),
        entrenamientos: ws.length,
        series: ws.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.length, 0), 0),
      };
    });

    /* ---------- Retos especiales: quién lo completó antes ---------- */
    const clasificacionRetos = retos
      .filter((r) => CUSTOM_CHALLENGE_METRICS[r.metrica])
      .map((r) => {
        const metrica = CUSTOM_CHALLENGE_METRICS[r.metrica];
        const inicio = new Date(r.inicio);
        const fin = new Date(r.fin);
        const filas = usuarios.map((u) => {
          // Las cuatro métricas son sumas por entrenamiento: se acumulan en orden hasta llegar al objetivo.
          let actual = 0;
          let completadoEn: Date | null = null;
          for (const w of porUsuario.get(String(u._id)) ?? []) {
            if (w.finishedAt < inicio || w.finishedAt >= fin) continue;
            actual += metrica.medir([w], r.zonas ?? []);
            if (!completadoEn && actual >= r.objetivo) completadoEn = w.finishedAt;
          }
          return { ...persona(u), actual, completado: completadoEn !== null, completadoEn };
        });
        // Primero quien lo completó (el más rápido arriba); después, por lo que lleva.
        filas.sort((a, b) => {
          if (a.completadoEn && b.completadoEn) return a.completadoEn.getTime() - b.completadoEn.getTime();
          if (a.completadoEn) return -1;
          if (b.completadoEn) return 1;
          return b.actual - a.actual;
        });
        return {
          id: String(r._id),
          titulo: r.titulo,
          descripcion: r.descripcion ?? '',
          unidad: metrica.unidad,
          objetivo: r.objetivo,
          empiezaEn: inicio,
          terminaEn: fin,
          terminado: ahora >= fin,
          ranking: conPosiciones(filas, (f) => (f.completadoEn ? `c${f.completadoEn.getTime()}` : f.actual)),
        };
      });

    return res.status(200).json({
      siguiendo: ids.length - 1,
      semana: {
        desde: lunes,
        hasta: new Date(lunes.getTime() + WEEK),
        porVolumen: conPosiciones([...semana].sort((a, b) => b.volumen - a.volumen), (f) => f.volumen),
        porEntrenamientos: conPosiciones(
          [...semana].sort((a, b) => b.entrenamientos - a.entrenamientos || b.volumen - a.volumen),
          (f) => f.entrenamientos
        ),
      },
      retos: clasificacionRetos,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al calcular la clasificación', error });
  }
};
