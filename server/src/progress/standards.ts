// Tablas de rangos de fuerza.
// Cada umbral es la fuerza relativa mínima: 1RM estimado / peso corporal.
// Son orientativas: ajústalas aquí y todo lo demás (API y frontend) se adapta solo.

export const RANKS = [
    { key: "hierro", label: "Hierro" },
    { key: "bronce", label: "Bronce" },
    { key: "plata", label: "Plata" },
    { key: "oro", label: "Oro" },
    { key: "platino", label: "Platino" },
    { key: "diamante", label: "Diamante" },
    { key: "elite", label: "Élite" },
  ] as const;
  
  export type RankKey = (typeof RANKS)[number]["key"];
  
  export const LIFT_KEYS = ["bench", "squat", "deadlift", "ohp", "row"] as const;
  export type LiftKey = (typeof LIFT_KEYS)[number];
  
  export interface LiftStandard {
    label: string;
    // Un umbral por rango, en el mismo orden que RANKS (tabla masculina).
    thresholds: [number, number, number, number, number, number, number];
    // Si el ejercicio no tiene rankingKey, se reconoce por su nombre.
    match: RegExp;
    exclude?: RegExp;
  }
  
  export const LIFTS: Record<LiftKey, LiftStandard> = {
    bench: {
      label: "Press de banca",
      thresholds: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      match: /press\s+(de\s+)?banca/i,
      exclude: /inclinad|declinad|mancuern|cerrad|m[aá]quina/i,
    },
    squat: {
      label: "Sentadilla",
      thresholds: [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5],
      match: /sentadilla/i,
      exclude: /b[uú]lgara|goblet|hack|frontal|sumo|split|zancada|mancuern|m[aá]quina|pistol/i,
    },
    deadlift: {
      label: "Peso muerto",
      thresholds: [1, 1.25, 1.5, 1.75, 2, 2.5, 3],
      match: /peso\s+muerto/i,
      exclude: /rumano|piernas\s+r[ií]gidas|mancuern|una\s+pierna|unilateral/i,
    },
    ohp: {
      label: "Press militar",
      thresholds: [0.35, 0.5, 0.65, 0.8, 0.95, 1.1, 1.25],
      match: /press\s+militar/i,
      exclude: /mancuern|m[aá]quina/i,
    },
    row: {
      label: "Remo con barra",
      thresholds: [0.5, 0.65, 0.8, 1, 1.15, 1.3, 1.5],
      match: /remo\s+(con\s+)?barra/i,
    },
  };
  
  // Las tablas femeninas son, de media, ~65 % de las masculinas.
  export const SEX_FACTOR = { male: 1, female: 0.65, unspecified: 1 } as const;
  export type Sex = keyof typeof SEX_FACTOR;
  
  // Fórmula de Epley. Solo se usan series de 1 a 10 reps: más allá la estimación deja de ser fiable.
  export const MAX_REPS_FOR_1RM = 10;
  export const estimate1RM = (kg: number, reps: number) => (reps === 1 ? kg : kg * (1 + reps / 30));
  
  // El rango "actual" es el mejor de los últimos 90 días.
  export const CURRENT_WINDOW_DAYS = 90;
  
  // Un 1RM que supera en más de un 50 % tu mejor marca no cuenta hasta que lo repites en otra sesión
  // (evita que un error al teclear, 800 o 180 en vez de 80, te haga Élite).
  export const MAX_JUMP = 1.5;