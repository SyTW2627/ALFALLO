// Carga un catálogo básico de ejercicios en la base de datos (para desarrollo en local).
// Uso:  npm run seed
// Se puede ejecutar varias veces: los ejercicios que ya existen (mismo nombre) no se duplican.

import mongoose from 'mongoose';
import { connectDB } from '../db/mongoose';
import { BodyParts, Exercise } from '../models/exercises';

type Semilla = {
  name: string;
  description: string;
  bodyPart: BodyParts;
  difficulty: number;
  rankingKey?: 'bench' | 'squat' | 'deadlift' | 'ohp' | 'row';
};

const EJERCICIOS: Semilla[] = [
  // Pecho
  { name: 'Press de banca', description: 'Tumbado en banco plano, bajar la barra al pecho y empujar.', bodyPart: BodyParts.CHEST, difficulty: 3, rankingKey: 'bench' },
  { name: 'Press inclinado con mancuernas', description: 'En banco inclinado, empujar las mancuernas hacia arriba.', bodyPart: BodyParts.CHEST, difficulty: 2 },
  { name: 'Aperturas en polea', description: 'De pie entre poleas, juntar los brazos delante del pecho.', bodyPart: BodyParts.CHEST, difficulty: 2 },
  { name: 'Fondos en paralelas', description: 'Bajar el cuerpo flexionando los codos y subir.', bodyPart: BodyParts.CHEST, difficulty: 3 },
  // Espalda
  { name: 'Remo con barra', description: 'Inclinado hacia delante, llevar la barra al abdomen.', bodyPart: BodyParts.BACK, difficulty: 3, rankingKey: 'row' },
  { name: 'Dominadas', description: 'Colgado de la barra, subir hasta pasar la barbilla.', bodyPart: BodyParts.DORSAL, difficulty: 4 },
  { name: 'Jalón al pecho', description: 'Sentado en polea alta, bajar la barra hasta el pecho.', bodyPart: BodyParts.DORSAL, difficulty: 2 },
  { name: 'Remo en polea baja', description: 'Sentado, tirar del agarre hacia el abdomen.', bodyPart: BodyParts.BACK, difficulty: 2 },
  { name: 'Peso muerto', description: 'Levantar la barra del suelo con la espalda recta hasta quedar erguido.', bodyPart: BodyParts.LUMBAR, difficulty: 4, rankingKey: 'deadlift' },
  // Hombro
  { name: 'Press militar', description: 'De pie, empujar la barra desde los hombros por encima de la cabeza.', bodyPart: BodyParts.FRONT_SHOULDER, difficulty: 3, rankingKey: 'ohp' },
  { name: 'Elevaciones laterales', description: 'Subir las mancuernas hacia los lados hasta la altura de los hombros.', bodyPart: BodyParts.LATERAL_SHOULDER, difficulty: 1 },
  { name: 'Face pull', description: 'Tirar de la cuerda de la polea hacia la cara abriendo los codos.', bodyPart: BodyParts.POSTERIOR_SHOULDER, difficulty: 2 },
  // Brazos
  { name: 'Curl con barra', description: 'De pie, flexionar los codos subiendo la barra.', bodyPart: BodyParts.BICEPS, difficulty: 1 },
  { name: 'Curl martillo', description: 'Curl con mancuernas en agarre neutro.', bodyPart: BodyParts.BICEPS, difficulty: 1 },
  { name: 'Extensión de tríceps en polea', description: 'Extender los codos empujando la cuerda hacia abajo.', bodyPart: BodyParts.TRICEPS, difficulty: 1 },
  { name: 'Press francés', description: 'Tumbado, bajar la barra hacia la frente y extender.', bodyPart: BodyParts.TRICEPS, difficulty: 2 },
  // Pierna
  { name: 'Sentadilla', description: 'Con la barra en la espalda, bajar hasta romper el paralelo y subir.', bodyPart: BodyParts.QUADRICEPS, difficulty: 3, rankingKey: 'squat' },
  { name: 'Prensa de piernas', description: 'Empujar la plataforma con las piernas.', bodyPart: BodyParts.QUADRICEPS, difficulty: 2 },
  { name: 'Extensión de cuádriceps', description: 'Sentado en máquina, extender las rodillas.', bodyPart: BodyParts.QUADRICEPS, difficulty: 1 },
  { name: 'Curl femoral tumbado', description: 'Tumbado boca abajo, flexionar las rodillas.', bodyPart: BodyParts.FEMORAL, difficulty: 1 },
  { name: 'Peso muerto rumano', description: 'Bajar la barra deslizando por las piernas con rodillas semiflexionadas.', bodyPart: BodyParts.FEMORAL, difficulty: 3 },
  { name: 'Hip thrust', description: 'Con la espalda en un banco, elevar la cadera con la barra.', bodyPart: BodyParts.GLUTEUS, difficulty: 2 },
  { name: 'Abductores en máquina', description: 'Sentado, separar las piernas contra la resistencia.', bodyPart: BodyParts.ABDUCTORS, difficulty: 1 },
  { name: 'Aductores en máquina', description: 'Sentado, juntar las piernas contra la resistencia.', bodyPart: BodyParts.ADDUCTORS, difficulty: 1 },
  // Core
  { name: 'Plancha', description: 'Mantener el cuerpo recto apoyado en antebrazos y puntas de los pies.', bodyPart: BodyParts.ABDOMINAL, difficulty: 1 },
  { name: 'Crunch en polea', description: 'De rodillas, flexionar el tronco tirando de la cuerda.', bodyPart: BodyParts.ABDOMINAL, difficulty: 2 },
];

async function main() {
  await connectDB();
  let creados = 0;
  for (const e of EJERCICIOS) {
    const r = await Exercise.updateOne({ name: e.name }, { $setOnInsert: e }, { upsert: true });
    if (r.upsertedCount) creados++;
  }
  const total = await Exercise.countDocuments();
  console.log(`Ejercicios nuevos: ${creados}. Total en el catálogo: ${total}.`);
  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error('Error al cargar los ejercicios:', error);
  await mongoose.connection.close();
  process.exit(1);
});
