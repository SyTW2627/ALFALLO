// Motor de progreso: calcula rangos, hitos y retos a partir del historial.
// Son funciones puras (sin base de datos) para poder probarlas fácilmente.

import {
    RANKS,
    LIFTS,
    LIFT_KEYS,
    LiftKey,
    Sex,
    SEX_FACTOR,
    MAX_REPS_FOR_1RM,
    estimate1RM,
    CURRENT_WINDOW_DAYS,
    MAX_JUMP,
  } from "./standards";
  
  const DAY = 24 * 60 * 60 * 1000;
  const WEEK = 7 * DAY;
  
  /* ---------- Datos de entrada ---------- */
  
  export interface SetIn {
    reps: number;
    weightKg: number;
  }
  export interface ExerciseIn {
    id: string;
    name: string;
    bodyPart: string;
    rankingKey?: string | null;
    sets: SetIn[];
  }
  export interface WorkoutIn {
    id: string;
    startedAt: Date;
    finishedAt: Date;
    exercises: ExerciseIn[];
  }
  export interface BodyWeightIn {
    kg: number;
    date: Date;
  }
  export interface ProgressInput {
    workouts: WorkoutIn[];
    bodyWeights: BodyWeightIn[];
    sex: Sex;
    now?: Date;
  }
  
  /* ---------- Utilidades ---------- */
  
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const roundUpHalf = (n: number) => Math.ceil(n * 2) / 2;
  
  export function liftOf(e: ExerciseIn): LiftKey | null {
    if (e.rankingKey && (LIFT_KEYS as readonly string[]).includes(e.rankingKey)) return e.rankingKey as LiftKey;
    for (const key of LIFT_KEYS) {
      const s = LIFTS[key];
      if (s.match.test(e.name) && !(s.exclude && s.exclude.test(e.name))) return key;
    }
    return null;
  }
  
  // Peso corporal vigente en una fecha (el último registrado antes; si no hay, el primero).
  export function bodyWeightAt(bodyWeights: BodyWeightIn[], date: Date): number | null {
    if (!bodyWeights.length) return null;
    let actual = bodyWeights[0];
    for (const bw of bodyWeights) {
      if (bw.date.getTime() <= date.getTime()) actual = bw;
      else break;
    }
    return actual.kg;
  }
  
  export function rankIndex(ratio: number, thresholds: readonly number[], factor: number): number {
    let idx = -1;
    thresholds.forEach((t, i) => {
      if (ratio >= t * factor - 1e-9) idx = i;
    });
    return idx;
  }
  
  const rankInfo = (idx: number) => (idx >= 0 ? { key: RANKS[idx].key, label: RANKS[idx].label, nivel: idx + 1 } : null);
  
  // Lunes 00:00 UTC de la semana de `date`.
  export function weekStart(date: Date): Date {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d;
  }
  
  /* ---------- Rangos ---------- */
  
  interface LiftPoint {
    date: Date;
    e1rm: number;
    kg: number; // peso de la serie que da el mejor 1RM
    reps: number;
    maxKg: number; // peso más alto movido en la sesión (cualquier nº de reps)
    bodyWeight: number | null;
    ratio: number | null;
  }
  
  function liftHistory(workouts: WorkoutIn[], bodyWeights: BodyWeightIn[], lift: LiftKey) {
    const accepted: LiftPoint[] = [];
    let pending: LiftPoint | null = null;
    let best = 0;
  
    for (const w of workouts) {
      const sets = w.exercises.filter((e) => liftOf(e) === lift).flatMap((e) => e.sets);
      const valid = sets.filter((s) => s.weightKg > 0 && s.reps >= 1 && s.reps <= MAX_REPS_FOR_1RM);
      if (!valid.length) continue;
  
      const top = valid.reduce((m, s) => (estimate1RM(s.weightKg, s.reps) > estimate1RM(m.weightKg, m.reps) ? s : m));
      const bw = bodyWeightAt(bodyWeights, w.finishedAt);
      const e1rm = estimate1RM(top.weightKg, top.reps);
      const point: LiftPoint = {
        date: w.finishedAt,
        e1rm,
        kg: top.weightKg,
        reps: top.reps,
        maxKg: Math.max(...sets.map((s) => s.weightKg)),
        bodyWeight: bw,
        ratio: bw ? e1rm / bw : null,
      };
  
      if (best === 0 || e1rm <= best * MAX_JUMP) {
        accepted.push(point);
        best = Math.max(best, e1rm);
        pending = null; // una sesión normal descarta la marca dudosa anterior (era un error)
      } else if (pending) {
        // Segunda sesión con un salto grande: se confirma el menor de los dos.
        const confirmed = pending.e1rm <= point.e1rm ? pending : point;
        accepted.push({ ...point, ...confirmed, date: point.date });
        best = Math.max(best, confirmed.e1rm);
        pending = null;
      } else {
        pending = point;
      }
    }
    return { accepted, pending };
  }
  
  export function computeRanks({ workouts, bodyWeights, sex, now = new Date() }: ProgressInput) {
    const factor = SEX_FACTOR[sex] ?? 1;
    const currentBw = bodyWeights.length ? bodyWeights[bodyWeights.length - 1].kg : null;
    const desde = now.getTime() - CURRENT_WINDOW_DAYS * DAY;
  
    return LIFT_KEYS.map((key) => {
      const std = LIFTS[key];
      const { accepted, pending } = liftHistory(workouts, bodyWeights, key);
      const score = (p: LiftPoint) => p.ratio ?? p.e1rm;
      const mejorDe = (lista: LiftPoint[]) => (lista.length ? lista.reduce((m, p) => (score(p) > score(m) ? p : m)) : null);
  
      const mejor = mejorDe(accepted);
      const actual = mejorDe(accepted.filter((p) => p.date.getTime() >= desde));
      const idxActual = actual?.ratio != null ? rankIndex(actual.ratio, std.thresholds, factor) : -1;
      const idxMejor = mejor?.ratio != null ? rankIndex(mejor.ratio, std.thresholds, factor) : -1;
  
      const marca = (p: LiftPoint | null, idx: number) =>
        p && {
          fecha: p.date,
          kg: p.kg,
          reps: p.reps,
          e1rm: round1(p.e1rm),
          ratio: p.ratio != null ? round2(p.ratio) : null,
          rango: rankInfo(idx),
        };
  
      // Qué falta para el siguiente rango, con el peso corporal de hoy.
      let siguiente = null;
      if (currentBw && idxActual < RANKS.length - 1) {
        const ratioObjetivo = std.thresholds[idxActual + 1] * factor;
        const e1rmNecesario = ratioObjetivo * currentBw;
        siguiente = {
          rango: rankInfo(idxActual + 1),
          ratio: round2(ratioObjetivo),
          e1rmNecesario: roundUpHalf(e1rmNecesario),
          faltaKg: roundUpHalf(Math.max(0, e1rmNecesario - (actual?.e1rm ?? 0))),
        };
      }
  
      return {
        key,
        label: std.label,
        estado: !accepted.length ? "sin-datos" : !currentBw ? "sin-peso" : "ok",
        actual: marca(actual, idxActual),
        mejor: marca(mejor, idxMejor),
        siguiente,
        pendiente: pending && { fecha: pending.date, kg: pending.kg, reps: pending.reps, e1rm: round1(pending.e1rm) },
        umbrales: RANKS.map((r, i) => ({
          rango: rankInfo(i),
          ratio: round2(std.thresholds[i] * factor),
          e1rm: currentBw ? roundUpHalf(std.thresholds[i] * factor * currentBw) : null,
        })),
        // Para los hitos de fuerza.
        _maxKg: accepted.length ? Math.max(...accepted.map((p) => p.maxKg)) : 0,
        _maxKgRatio: accepted.length ? Math.max(...accepted.map((p) => (p.bodyWeight ? p.maxKg / p.bodyWeight : 0))) : 0,
        _idxMejor: idxMejor,
        _idxActual: idxActual,
      };
    });
  }
  
  export type RankResult = ReturnType<typeof computeRanks>[number];
  
  /* ---------- Estadísticas generales ---------- */
  
  const volumeOf = (w: WorkoutIn) =>
    w.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + s.reps * s.weightKg, 0), 0);
  
  function maxStreakWeeks(workouts: WorkoutIn[]): number {
    const weeks = [...new Set(workouts.map((w) => weekStart(w.finishedAt).getTime()))].sort((a, b) => a - b);
    let max = 0;
    let run = 0;
    weeks.forEach((t, i) => {
      run = i > 0 && t - weeks[i - 1] === WEEK ? run + 1 : 1;
      max = Math.max(max, run);
    });
    return max;
  }
  
  /* ---------- Hitos ---------- */
  
  interface Stats {
    entrenos: number;
    volumen: number;
    racha: number;
    ranks: Record<LiftKey, RankResult>;
  }
  
  interface AchievementDef {
    key: string;
    titulo: string;
    descripcion: string;
    categoria: "constancia" | "volumen" | "fuerza" | "rango";
    unidad: "" | "semanas" | "kg" | "x" | "rango" | "levantamientos";
    objetivo: number;
    medir: (s: Stats) => number;
  }
  
  const bestRankOf = (s: Stats) => Math.max(...LIFT_KEYS.map((k) => s.ranks[k]._idxMejor)) + 1;
  
  export const ACHIEVEMENTS: AchievementDef[] = [
    { key: "primer-entreno", titulo: "Primer paso", descripcion: "Termina tu primer entrenamiento.", categoria: "constancia", unidad: "", objetivo: 1, medir: (s) => s.entrenos },
    { key: "entrenos-10", titulo: "Habitual", descripcion: "Completa 10 entrenamientos.", categoria: "constancia", unidad: "", objetivo: 10, medir: (s) => s.entrenos },
    { key: "entrenos-50", titulo: "Imparable", descripcion: "Completa 50 entrenamientos.", categoria: "constancia", unidad: "", objetivo: 50, medir: (s) => s.entrenos },
    { key: "entrenos-100", titulo: "Centenario", descripcion: "Completa 100 entrenamientos.", categoria: "constancia", unidad: "", objetivo: 100, medir: (s) => s.entrenos },
    { key: "racha-4", titulo: "Un mes sin fallar", descripcion: "Entrena 4 semanas seguidas.", categoria: "constancia", unidad: "semanas", objetivo: 4, medir: (s) => s.racha },
    { key: "racha-12", titulo: "Tres meses en racha", descripcion: "Entrena 12 semanas seguidas.", categoria: "constancia", unidad: "semanas", objetivo: 12, medir: (s) => s.racha },
    { key: "volumen-10t", titulo: "10 toneladas", descripcion: "Más que un elefante africano (≈ 6 t).", categoria: "volumen", unidad: "kg", objetivo: 10_000, medir: (s) => s.volumen },
    { key: "volumen-100t", titulo: "100 toneladas", descripcion: "Lo que pesa una ballena azul.", categoria: "volumen", unidad: "kg", objetivo: 100_000, medir: (s) => s.volumen },
    { key: "volumen-1000t", titulo: "1.000 toneladas", descripcion: "Más que dos Boeing 747 cargados.", categoria: "volumen", unidad: "kg", objetivo: 1_000_000, medir: (s) => s.volumen },
    { key: "club-100-banca", titulo: "Club de los 100", descripcion: "Levanta 100 kg en press de banca.", categoria: "fuerza", unidad: "kg", objetivo: 100, medir: (s) => s.ranks.bench._maxKg },
    { key: "banca-peso-corporal", titulo: "Tu propio peso", descripcion: "Levanta tu peso corporal en press de banca.", categoria: "fuerza", unidad: "x", objetivo: 1, medir: (s) => s.ranks.bench._maxKgRatio },
    { key: "muerto-doble", titulo: "El doble", descripcion: "Levanta el doble de tu peso corporal en peso muerto.", categoria: "fuerza", unidad: "x", objetivo: 2, medir: (s) => s.ranks.deadlift._maxKgRatio },
    { key: "primer-oro", titulo: "Oro", descripcion: "Alcanza el rango Oro en cualquier levantamiento.", categoria: "rango", unidad: "rango", objetivo: 4, medir: bestRankOf },
    { key: "primer-diamante", titulo: "Diamante", descripcion: "Alcanza el rango Diamante en cualquier levantamiento.", categoria: "rango", unidad: "rango", objetivo: 6, medir: bestRankOf },
    { key: "tres-oro", titulo: "Los tres grandes", descripcion: "Rango Oro en banca, sentadilla y peso muerto.", categoria: "rango", unidad: "levantamientos", objetivo: 3, medir: (s) => (["bench", "squat", "deadlift"] as const).filter((k) => s.ranks[k]._idxMejor >= 3).length },
  ];
  
  export function computeAchievements(stats: Stats) {
    return ACHIEVEMENTS.map(({ medir, ...def }) => {
      const actual = medir(stats);
      return { ...def, actual: round2(Math.min(actual, def.objetivo)), conseguido: actual >= def.objetivo - 1e-9 };
    });
  }
  
  /* ---------- Retos semanales ---------- */
  
  const ZONE_CHALLENGES = [
    { key: "pierna", nombre: "pierna", zonas: ["Quadriceps", "Femoral", "Gluteus", "Abductors", "Adductors"], objetivo: 20 },
    { key: "espalda", nombre: "espalda", zonas: ["Back", "Dorsal", "Lumbar"], objetivo: 16 },
    { key: "pecho", nombre: "pecho", zonas: ["Chest"], objetivo: 12 },
    { key: "hombro", nombre: "hombro", zonas: ["Lateral Shoulder", "Posterior Shoulder", "Front Shoulder"], objetivo: 12 },
    { key: "brazos", nombre: "brazos", zonas: ["Biceps", "Triceps"], objetivo: 14 },
  ];
  
  export function computeChallenges(workouts: WorkoutIn[], now = new Date()) {
    const inicio = weekStart(now);
    const fin = new Date(inicio.getTime() + WEEK);
    const semana = Math.floor(inicio.getTime() / WEEK); // número que cambia cada lunes
    const id = inicio.toISOString().slice(0, 10);
    const enSemana = workouts.filter((w) => w.finishedAt >= inicio && w.finishedAt < fin);
  
    const retos = [];
  
    retos.push({ key: `${id}-entrenos`, titulo: "Entrena 3 veces esta semana", unidad: "", objetivo: 3, actual: enSemana.length });
  
    const zona = ZONE_CHALLENGES[semana % ZONE_CHALLENGES.length];
    const series = enSemana.reduce(
      (a, w) => a + w.exercises.filter((e) => zona.zonas.includes(e.bodyPart)).reduce((b, e) => b + e.sets.length, 0),
      0
    );
    retos.push({ key: `${id}-series-${zona.key}`, titulo: `Haz ${zona.objetivo} series de ${zona.nombre}`, unidad: "series", objetivo: zona.objetivo, actual: series });
  
    if (semana % 2 === 0) {
      // Objetivo personalizado: tu media de las 4 semanas anteriores + 10 %.
      const hace4 = new Date(inicio.getTime() - 4 * WEEK);
      const previas = workouts.filter((w) => w.finishedAt >= hace4 && w.finishedAt < inicio);
      const media = previas.reduce((a, w) => a + volumeOf(w), 0) / 4;
      const objetivo = Math.max(5000, Math.ceil((media * 1.1) / 500) * 500);
      retos.push({ key: `${id}-volumen`, titulo: `Levanta ${objetivo.toLocaleString("es-ES")} kg esta semana`, unidad: "kg", objetivo, actual: enSemana.reduce((a, w) => a + volumeOf(w), 0) });
    } else {
      const minutos = enSemana.reduce((a, w) => a + (w.finishedAt.getTime() - w.startedAt.getTime()) / 60000, 0);
      retos.push({ key: `${id}-minutos`, titulo: "Acumula 150 minutos entrenando", unidad: "min", objetivo: 150, actual: Math.round(minutos) });
    }
  
    return retos.map((r) => ({ ...r, tipo: "semanal", completado: r.actual >= r.objetivo, terminaEn: fin }));
  }
  
  /* ---------- Todo junto ---------- */
  
  export function computeProgress(input: ProgressInput) {
    const now = input.now ?? new Date();
    const workouts = [...input.workouts].sort((a, b) => a.finishedAt.getTime() - b.finishedAt.getTime());
    const bodyWeights = [...input.bodyWeights].sort((a, b) => a.date.getTime() - b.date.getTime());
    const data = { ...input, workouts, bodyWeights, now };
  
    const ranks = computeRanks(data);
    const stats: Stats = {
      entrenos: workouts.length,
      volumen: workouts.reduce((a, w) => a + volumeOf(w), 0),
      racha: maxStreakWeeks(workouts),
      ranks: Object.fromEntries(ranks.map((r) => [r.key, r])) as Record<LiftKey, RankResult>,
    };
  
    return {
      rangos: ranks.map(({ _maxKg, _maxKgRatio, _idxMejor, _idxActual, ...r }) => r),
      hitos: computeAchievements(stats),
      retos: computeChallenges(workouts, now),
      _idxActual: Object.fromEntries(ranks.map((r) => [r.key, r._idxActual])) as Record<LiftKey, number>,
    };
  }
  
  export type Progress = ReturnType<typeof computeProgress>;
  
  // Lo que ha cambiado al terminar un entrenamiento (para celebrarlo en el resumen).
  export function diffProgress(antes: Progress, despues: Progress) {
    const rangos = despues.rangos
      .filter((r) => despues._idxActual[r.key] > antes._idxActual[r.key] && despues._idxActual[r.key] >= 0)
      .map((r) => ({
        key: r.key,
        label: r.label,
        de: antes.rangos.find((x) => x.key === r.key)?.actual?.rango ?? null,
        a: r.actual?.rango ?? null,
      }));
    const completadosAntes = new Set(antes.retos.filter((r) => r.completado).map((r) => r.key));
    const retos = despues.retos.filter((r) => r.completado && !completadosAntes.has(r.key)).map((r) => ({ key: r.key, titulo: r.titulo }));
    return { rangos, retos };
  }