import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { User } from '../models/user';
import { Workout, WorkoutStatus } from '../models/workout';
import { Post } from '../models/post';
import { Report } from '../models/report';
import { Achievement } from '../models/achievement';
import { CustomAchievement } from '../models/customAchievement';
import { CustomChallenge } from '../models/customChallenge';
import { ACHIEVEMENTS, computeChallenges, weekStart, WorkoutIn } from '../progress/engine';
import { CUSTOM_CHALLENGE_METRICS, customAchievementKey } from '../progress/custom';
import { toEngineWorkouts } from './progress';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const SEMANAS_GRAFICO = 8;
// Retos especiales que se muestran: los que siguen en curso o terminaron hace poco.
const DIAS_RETOS_TERMINADOS = 60;

function porUsuario(workouts: (WorkoutIn & { user: string })[]) {
  const mapa = new Map<string, WorkoutIn[]>();
  for (const w of workouts) {
    if (!mapa.has(w.user)) mapa.set(w.user, []);
    mapa.get(w.user)!.push(w);
  }
  return mapa;
}

// GET /api/admin/stats - Resumen de la actividad de la app
export const getStats = async (_req: AuthRequest, res: Response) => {
  try {
    const ahora = new Date();
    const hace7 = new Date(ahora.getTime() - 7 * DAY);
    const hace14 = new Date(ahora.getTime() - 14 * DAY);
    const lunes = weekStart(ahora);
    const inicioGrafico = new Date(lunes.getTime() - (SEMANAS_GRAFICO - 1) * WEEK);
    const terminado = { status: WorkoutStatus.FINISHED };

    const [
      usuariosTotal,
      usuariosNuevos,
      activos,
      entrenosTotal,
      entrenosSemana,
      entrenosSemanaAnterior,
      postsTotal,
      postsSemana,
      reportesPendientes,
      altas,
      entrenosGrafico,
      retosDefs,
      hitosDefs,
      conteoHitos,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: hace7 } }),
      Workout.distinct('user', { ...terminado, finishedAt: { $gte: hace7 } }),
      Workout.countDocuments(terminado),
      Workout.countDocuments({ ...terminado, finishedAt: { $gte: hace7 } }),
      Workout.countDocuments({ ...terminado, finishedAt: { $gte: hace14, $lt: hace7 } }),
      Post.countDocuments(),
      Post.countDocuments({ createdAt: { $gte: hace7 } }),
      Report.countDocuments({ estado: 'pendiente' }),
      User.find({ createdAt: { $gte: inicioGrafico } }).select('createdAt').lean(),
      Workout.find({ ...terminado, finishedAt: { $gte: inicioGrafico } }).select('user finishedAt').lean(),
      CustomChallenge.find({ fin: { $gte: new Date(ahora.getTime() - DIAS_RETOS_TERMINADOS * DAY) }, inicio: { $lte: ahora } })
        .sort({ inicio: -1 })
        .limit(20)
        .lean(),
      CustomAchievement.find().select('titulo activo').lean(),
      Achievement.aggregate([{ $group: { _id: '$key', total: { $sum: 1 } } }]),
    ]);

    /* ---------- Actividad por semana (lunes a domingo) ---------- */
    const semanas = Array.from({ length: SEMANAS_GRAFICO }, (_, i) => ({
      inicio: new Date(inicioGrafico.getTime() + i * WEEK),
      usuariosNuevos: 0,
      entrenamientos: 0,
      activos: new Set<string>(),
    }));
    const indiceSemana = (d: Date) => Math.floor((weekStart(new Date(d)).getTime() - inicioGrafico.getTime()) / WEEK);
    for (const u of altas) {
      const i = indiceSemana(u.createAt as Date);
      if (semanas[i]) semanas[i].usuariosNuevos++;
    }
    for (const w of entrenosGrafico) {
      const i = indiceSemana(w.finishedAt as Date);
      if (!semanas[i]) continue;
      semanas[i].entrenamientos++;
      semanas[i].activos.add(String(w.user));
    }

    /* ---------- Retos: se calculan con el mismo motor que ve cada usuario ---------- */
    // Hacen falta los entrenamientos con sus ejercicios desde el reto más antiguo (o 4 semanas antes
    // del lunes, que es lo que usa el reto semanal de volumen).
    const desde = new Date(
      Math.min(lunes.getTime() - 4 * WEEK, ...retosDefs.map((r) => new Date(r.inicio).getTime()))
    );
    const docs = await Workout.find({ ...terminado, finishedAt: { $gte: desde } })
      .populate('exercises.exercise', 'name bodyPart rankingKey')
      .lean();
    const usuarioDe = new Map(docs.map((d) => [String(d._id), String(d.user)]));
    const entrenos = toEngineWorkouts(docs).map((w) => ({ ...w, user: usuarioDe.get(w.id)! }));

    const retosEspeciales = retosDefs.map((r) => {
      const inicio = new Date(r.inicio);
      const fin = new Date(r.fin);
      const metrica = CUSTOM_CHALLENGE_METRICS[r.metrica];
      const enPeriodo = porUsuario(entrenos.filter((w) => w.finishedAt >= inicio && w.finishedAt < fin));
      let completados = 0;
      for (const ws of enPeriodo.values()) {
        if (metrica && metrica.medir(ws, r.zonas ?? []) >= r.objetivo) completados++;
      }
      return {
        _id: String(r._id),
        titulo: r.titulo,
        activo: r.activo,
        enCurso: ahora < fin,
        inicio,
        fin,
        participantes: enPeriodo.size,
        completados,
      };
    });

    // Retos de esta semana: se agrupan por tipo (el de volumen tiene un objetivo distinto para cada usuario).
    const semanales = new Map<string, { tipo: string; titulo: string; participantes: number; completados: number }>();
    const prefijo = lunes.toISOString().slice(0, 10) + '-';
    for (const [, ws] of porUsuario(entrenos)) {
      const entrenoEstaSemana = ws.some((w) => w.finishedAt >= lunes);
      if (!entrenoEstaSemana) continue;
      for (const reto of computeChallenges(ws, ahora)) {
        const tipo = reto.key.replace(prefijo, '');
        const titulo = tipo === 'volumen' ? 'Superar su volumen habitual (+10 %)' : reto.titulo;
        const g = semanales.get(tipo) ?? { tipo, titulo, participantes: 0, completados: 0 };
        g.participantes++;
        if (reto.completado) g.completados++;
        semanales.set(tipo, g);
      }
    }

    /* ---------- Hitos: cuántos usuarios tienen cada uno ---------- */
    const conseguidos = new Map(conteoHitos.map((c) => [String(c._id), c.total as number]));
    const hitos = [
      ...ACHIEVEMENTS.map((h) => ({ key: h.key, titulo: h.titulo, personalizado: false, activo: true })),
      ...hitosDefs.map((h) => ({ key: customAchievementKey(String(h._id)), titulo: h.titulo, personalizado: true, activo: h.activo })),
    ]
      .map((h) => ({ ...h, conseguidoPor: conseguidos.get(h.key) ?? 0 }))
      .sort((a, b) => b.conseguidoPor - a.conseguidoPor);

    return res.status(200).json({
      generadoEn: ahora,
      usuarios: { total: usuariosTotal, nuevosSemana: usuariosNuevos, activosSemana: activos.length },
      entrenamientos: { total: entrenosTotal, semana: entrenosSemana, semanaAnterior: entrenosSemanaAnterior },
      publicaciones: { total: postsTotal, semana: postsSemana },
      reportesPendientes,
      semanas: semanas.map((s) => ({ ...s, activos: s.activos.size })),
      retosEspeciales,
      retosSemanales: [...semanales.values()],
      hitos,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al calcular las estadísticas', error });
  }
};
