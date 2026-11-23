// Rutinas por defecto (plantillas) que cualquier usuario puede copiar a sus rutinas.
// Los ejercicios se buscan por nombre en el catálogo (los del script `npm run seed`). Si alguno
// no existe, esa línea se omite. Las series, repeticiones y descansos cumplen los rangos de
// OBJECTIVE_PROFILES (src/models/routines.ts) para que la rutina copiada se pueda guardar.

import { Objective } from '../models/routines';

export interface TemplateLine {
  ejercicio: string; // nombre exacto en el catálogo
  sets: number;
  reps: number;
  restInSeconds: number;
}

export interface TemplateDay {
  name: string;
  objective: Objective;
  exercises: TemplateLine[];
}

export interface RoutineTemplate {
  clave: string;
  nombre: string;
  descripcion: string;
  nivel: 'Principiante' | 'Intermedio' | 'Avanzado';
  frecuencia: string;
  dias: TemplateDay[];
}

const H = Objective.HYPERTROPHY;
const F = Objective.FORCE;

const l = (ejercicio: string, sets: number, reps: number, restInSeconds: number): TemplateLine => ({
  ejercicio,
  sets,
  reps,
  restInSeconds,
});

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    clave: 'heavy-duty',
    nombre: 'Heavy Duty',
    descripcion:
      'El método de Mike Mentzer: muy pocas series, todas al fallo, y mucho descanso entre sesiones. ' +
      'Haz las dos primeras series de cada ejercicio de aproximación y la última al fallo absoluto. ' +
      'Entrena un día y descansa al menos uno o dos antes del siguiente.',
    nivel: 'Avanzado',
    frecuencia: '3 días, con días de descanso entre medias',
    dias: [
      {
        name: 'Pecho y espalda',
        objective: H,
        exercises: [
          l('Aperturas en polea', 3, 8, 180),
          l('Press inclinado con mancuernas', 3, 8, 180),
          l('Jalón al pecho', 3, 8, 180),
          l('Peso muerto', 3, 8, 180),
        ],
      },
      {
        name: 'Piernas',
        objective: H,
        exercises: [
          l('Extensión de cuádriceps', 3, 10, 180),
          l('Sentadilla', 3, 8, 180),
          l('Curl femoral tumbado', 3, 8, 180),
        ],
      },
      {
        name: 'Hombros y brazos',
        objective: H,
        exercises: [
          l('Elevaciones laterales', 3, 10, 180),
          l('Press militar', 3, 8, 180),
          l('Curl con barra', 3, 8, 180),
          l('Extensión de tríceps en polea', 3, 8, 180),
        ],
      },
    ],
  },
  {
    clave: 'push-pull-legs',
    nombre: 'Push Pull Legs',
    descripcion:
      'Empuje, tirón y pierna: cada día trabaja grupos musculares que se mueven igual, así que mientras ' +
      'uno entrena el resto descansa. Hazla 3 días por semana o repítela dos veces para entrenar 6.',
    nivel: 'Intermedio',
    frecuencia: '3 o 6 días por semana',
    dias: [
      {
        name: 'Empuje (Push)',
        objective: H,
        exercises: [
          l('Press de banca', 4, 8, 150),
          l('Press inclinado con mancuernas', 3, 10, 120),
          l('Press militar', 3, 8, 150),
          l('Elevaciones laterales', 3, 12, 90),
          l('Fondos en paralelas', 3, 10, 120),
          l('Extensión de tríceps en polea', 3, 12, 90),
        ],
      },
      {
        name: 'Tirón (Pull)',
        objective: H,
        exercises: [
          l('Dominadas', 3, 8, 150),
          l('Remo con barra', 4, 8, 150),
          l('Jalón al pecho', 3, 10, 120),
          l('Face pull', 3, 12, 90),
          l('Curl con barra', 3, 10, 90),
          l('Curl martillo', 3, 12, 90),
        ],
      },
      {
        name: 'Pierna (Legs)',
        objective: H,
        exercises: [
          l('Sentadilla', 4, 8, 180),
          l('Peso muerto rumano', 3, 10, 150),
          l('Prensa de piernas', 3, 10, 120),
          l('Curl femoral tumbado', 3, 12, 90),
          l('Extensión de cuádriceps', 3, 12, 90),
          l('Hip thrust', 3, 10, 120),
        ],
      },
    ],
  },
  {
    clave: 'upper-lower',
    nombre: 'Upper Lower',
    descripcion:
      'Torso y pierna, dos veces por semana cada uno: un día pesado para ganar fuerza y otro con más ' +
      'repeticiones para ganar músculo. Buena opción para pasar de principiante a intermedio.',
    nivel: 'Principiante',
    frecuencia: '4 días por semana',
    dias: [
      {
        name: 'Torso · Fuerza',
        objective: F,
        exercises: [
          l('Press de banca', 4, 6, 180),
          l('Remo con barra', 4, 6, 180),
          l('Press militar', 3, 6, 180),
          l('Dominadas', 3, 6, 180),
        ],
      },
      {
        name: 'Pierna · Fuerza',
        objective: F,
        exercises: [
          l('Sentadilla', 4, 5, 240),
          l('Peso muerto', 3, 5, 240),
          l('Prensa de piernas', 3, 8, 180),
        ],
      },
      {
        name: 'Torso · Hipertrofia',
        objective: H,
        exercises: [
          l('Press inclinado con mancuernas', 3, 10, 120),
          l('Jalón al pecho', 3, 10, 120),
          l('Remo en polea baja', 3, 12, 90),
          l('Elevaciones laterales', 3, 12, 90),
          l('Curl martillo', 3, 12, 90),
          l('Press francés', 3, 10, 90),
        ],
      },
      {
        name: 'Pierna · Hipertrofia',
        objective: H,
        exercises: [
          l('Peso muerto rumano', 3, 10, 150),
          l('Prensa de piernas', 3, 12, 120),
          l('Extensión de cuádriceps', 3, 12, 90),
          l('Curl femoral tumbado', 3, 12, 90),
          l('Hip thrust', 3, 10, 120),
        ],
      },
    ],
  },
];
