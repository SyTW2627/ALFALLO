// Versus (beta): cálculo de las marcas de un duelo entre dos usuarios.
// Funciones puras (sin base de datos), igual que progress/engine.ts, para poder probarlas fácilmente.

import { BodyWeightIn, WorkoutIn, bodyWeightAt, liftOf } from '../progress/engine';
import { LiftKey, MAX_JUMP, MAX_REPS_FOR_1RM, estimate1RM } from '../progress/standards';

const DAY = 24 * 60 * 60 * 1000;

// Para descartar errores al teclear se mira la mejor marca de los 90 días anteriores al duelo.
export const DIAS_REFERENCIA = 90;

// "kg": gana quien levanta más (1RM estimado). "relativa": quien levanta más en proporción a su peso corporal.
export const MODALIDADES = ['kg', 'relativa'] as const;
export type Modalidad = (typeof MODALIDADES)[number];

export const DURACIONES_DIAS = [3, 7, 14, 30] as const;

export interface Marca {
  fecha: Date;
  kg: number;
  reps: number;
  e1rm: number;
  ratio: number | null; // null si no hay peso corporal registrado
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

// Mejor serie de cada entrenamiento en ese ejercicio (series de 1 a 10 reps con peso).
function puntos(workouts: WorkoutIn[], bodyWeights: BodyWeightIn[], lift: LiftKey): Marca[] {
  const out: Marca[] = [];
  for (const w of workouts) {
    const series = w.exercises
      .filter((e) => liftOf(e) === lift)
      .flatMap((e) => e.sets)
      .filter((s) => s.weightKg > 0 && s.reps >= 1 && s.reps <= MAX_REPS_FOR_1RM);
    if (!series.length) continue;
    const top = series.reduce((m, s) => (estimate1RM(s.weightKg, s.reps) > estimate1RM(m.weightKg, m.reps) ? s : m));
    const e1rm = estimate1RM(top.weightKg, top.reps);
    const bw = bodyWeightAt(bodyWeights, w.finishedAt);
    out.push({ fecha: w.finishedAt, kg: top.weightKg, reps: top.reps, e1rm, ratio: bw ? e1rm / bw : null });
  }
  return out;
}

export const valorDe = (m: Marca | null, modalidad: Modalidad) =>
  m == null ? null : modalidad === 'kg' ? m.e1rm : m.ratio;

// Mejor marca de un usuario durante el duelo [inicio, fin).
// Una marca que supera en más de un 50 % su mejor de los 90 días anteriores no cuenta (evita "800 kg" por error).
export function mejorMarcaEnDuelo(
  workouts: WorkoutIn[],
  bodyWeights: BodyWeightIn[],
  lift: LiftKey,
  modalidad: Modalidad,
  inicio: Date,
  fin: Date
): Marca | null {
  const todos = puntos(workouts, bodyWeights, lift);
  const desdeRef = inicio.getTime() - DIAS_REFERENCIA * DAY;
  const referencia = Math.max(
    0,
    ...todos.filter((p) => p.fecha.getTime() >= desdeRef && p.fecha < inicio).map((p) => p.e1rm)
  );

  const validas = todos.filter(
    (p) => p.fecha >= inicio && p.fecha < fin && (referencia === 0 || p.e1rm <= referencia * MAX_JUMP)
  );

  let mejor: Marca | null = null;
  for (const p of validas) {
    const v = valorDe(p, modalidad);
    if (v == null) continue;
    if (!mejor || v > valorDe(mejor, modalidad)!) mejor = p;
  }
  return mejor && { ...mejor, e1rm: round1(mejor.e1rm), ratio: mejor.ratio != null ? round2(mejor.ratio) : null };
}

export type Lado = 'retador' | 'rival';

// Quién va ganando: el que tenga mayor valor; sin marcas, nadie.
export function ganadorDe(a: Marca | null, b: Marca | null, modalidad: Modalidad): Lado | 'empate' | null {
  const va = valorDe(a, modalidad);
  const vb = valorDe(b, modalidad);
  if (va == null && vb == null) return null;
  if (vb == null) return 'retador';
  if (va == null) return 'rival';
  if (Math.abs(va - vb) < 1e-9) return 'empate';
  return va > vb ? 'retador' : 'rival';
}
