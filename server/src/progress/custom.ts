// Hitos y retos creados por los administradores.
// Aquí se define QUÉ se puede medir (las métricas disponibles) y cómo se calcula el progreso
// de cada usuario. Igual que engine.ts, son funciones puras (sin base de datos).

import type { Stats, WorkoutIn } from "./engine";
import { LIFTS, LIFT_KEYS, RANKS } from "./standards";

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ---------- Hitos ---------- */

export const ACHIEVEMENT_CATEGORIES = [
  { key: "constancia", label: "Constancia" },
  { key: "volumen", label: "Volumen" },
  { key: "fuerza", label: "Fuerza" },
  { key: "rango", label: "Rangos" },
  { key: "especial", label: "Especiales" },
] as const;

type AchievementUnit = "" | "semanas" | "kg" | "x" | "rango";

interface AchievementMetric {
  label: string;
  unidad: AchievementUnit;
  medir: (s: Stats) => number;
}

const bestRank = (s: Stats) => Math.max(...LIFT_KEYS.map((k) => s.ranks[k]._idxMejor)) + 1;

const liftMetrics: Record<string, AchievementMetric> = Object.fromEntries(
  LIFT_KEYS.flatMap((k) => {
    const nombre = LIFTS[k].label.toLowerCase();
    return [
      [`kg-${k}`, { label: `Peso máximo en ${nombre} (kg)`, unidad: "kg", medir: (s: Stats) => s.ranks[k]._maxKg }],
      [
        `ratio-${k}`,
        { label: `Peso máximo en ${nombre} (veces tu peso corporal)`, unidad: "x", medir: (s: Stats) => s.ranks[k]._maxKgRatio },
      ],
      [`rango-${k}`, { label: `Rango alcanzado en ${nombre}`, unidad: "rango", medir: (s: Stats) => s.ranks[k]._idxMejor + 1 }],
    ];
  })
);

export const CUSTOM_ACHIEVEMENT_METRICS: Record<string, AchievementMetric> = {
  entrenos: { label: "Entrenamientos completados", unidad: "", medir: (s) => s.entrenos },
  volumen: { label: "Volumen total levantado (kg)", unidad: "kg", medir: (s) => s.volumen },
  racha: { label: "Semanas seguidas entrenando", unidad: "semanas", medir: (s) => s.racha },
  "mejor-rango": { label: "Mejor rango en cualquier levantamiento", unidad: "rango", medir: bestRank },
  ...liftMetrics,
};

export interface CustomAchievementDef {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  metrica: string;
  objetivo: number;
}

export const customAchievementKey = (id: string) => `custom-${id}`;

export function computeCustomAchievements(defs: CustomAchievementDef[], stats: Stats) {
  return defs
    .filter((d) => CUSTOM_ACHIEVEMENT_METRICS[d.metrica])
    .map((d) => {
      const metrica = CUSTOM_ACHIEVEMENT_METRICS[d.metrica];
      const actual = metrica.medir(stats);
      return {
        key: customAchievementKey(d.id),
        titulo: d.titulo,
        descripcion: d.descripcion,
        categoria: d.categoria,
        unidad: metrica.unidad,
        objetivo: d.objetivo,
        actual: round2(Math.max(0, Math.min(actual, d.objetivo))),
        conseguido: actual >= d.objetivo - 1e-9,
        personalizado: true,
      };
    });
}

/* ---------- Retos especiales ---------- */

type ChallengeUnit = "" | "series" | "kg" | "min";

interface ChallengeMetric {
  label: string;
  unidad: ChallengeUnit;
  medir: (workouts: WorkoutIn[], zonas: string[]) => number;
}

const volumeOf = (w: WorkoutIn) =>
  w.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + s.reps * s.weightKg, 0), 0);

export const CUSTOM_CHALLENGE_METRICS: Record<string, ChallengeMetric> = {
  entrenos: { label: "Entrenamientos terminados", unidad: "", medir: (ws) => ws.length },
  series: {
    label: "Series de unas zonas musculares",
    unidad: "series",
    medir: (ws, zonas) =>
      ws.reduce((a, w) => a + w.exercises.filter((e) => zonas.includes(e.bodyPart)).reduce((b, e) => b + e.sets.length, 0), 0),
  },
  volumen: { label: "Volumen levantado (kg)", unidad: "kg", medir: (ws) => ws.reduce((a, w) => a + volumeOf(w), 0) },
  minutos: {
    label: "Minutos entrenando",
    unidad: "min",
    medir: (ws) => Math.round(ws.reduce((a, w) => a + (w.finishedAt.getTime() - w.startedAt.getTime()) / 60000, 0)),
  },
};

export interface CustomChallengeDef {
  id: string;
  titulo: string;
  descripcion: string;
  metrica: string;
  zonas: string[];
  objetivo: number;
  inicio: Date;
  fin: Date;
}

export const customChallengeKey = (id: string) => `custom-${id}`;

// Solo se devuelven los retos en curso (inicio <= ahora < fin).
export function computeCustomChallenges(defs: CustomChallengeDef[], workouts: WorkoutIn[], now = new Date()) {
  return defs
    .filter((d) => CUSTOM_CHALLENGE_METRICS[d.metrica] && d.inicio <= now && now < d.fin)
    .map((d) => {
      const metrica = CUSTOM_CHALLENGE_METRICS[d.metrica];
      const enPeriodo = workouts.filter((w) => w.finishedAt >= d.inicio && w.finishedAt < d.fin);
      const actual = metrica.medir(enPeriodo, d.zonas ?? []);
      return {
        key: customChallengeKey(d.id),
        titulo: d.titulo,
        descripcion: d.descripcion,
        unidad: metrica.unidad,
        objetivo: d.objetivo,
        actual,
        tipo: "especial" as const,
        completado: actual >= d.objetivo,
        empiezaEn: d.inicio,
        terminaEn: d.fin,
      };
    });
}

/* ---------- Opciones para el panel de administración ---------- */

export function adminOptions() {
  return {
    categorias: ACHIEVEMENT_CATEGORIES,
    metricasHito: Object.entries(CUSTOM_ACHIEVEMENT_METRICS).map(([key, m]) => ({ key, label: m.label, unidad: m.unidad })),
    metricasReto: Object.entries(CUSTOM_CHALLENGE_METRICS).map(([key, m]) => ({ key, label: m.label, unidad: m.unidad })),
    rangos: RANKS.map((r, i) => ({ valor: i + 1, label: r.label })),
    levantamientos: LIFT_KEYS.map((k) => ({ key: k, label: LIFTS[k].label })),
  };
}
