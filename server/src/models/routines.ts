import { Document, Schema, Types, model } from "mongoose";
import { IExercise } from "./exercises";
import { IUser } from "./user";

export enum Objective {
  HYPERTROPHY = "hypertrophy",
  FORCE = "force",
  RESISTANCE = "resistance",
}

interface Range {
  min: number;
  max: number;
  default: number;
}

interface ObjectiveProfile {
  reps: Range;
  sets: Range;
  restInSeconds: Range;
}

// Rangos recomendados por objetivo. Sirven para validar y para rellenar valores por defecto.
export const OBJECTIVE_PROFILES: Record<Objective, ObjectiveProfile> = {
  [Objective.FORCE]: {
    reps: { min: 4, max: 8, default: 6 },
    sets: { min: 3, max: 6, default: 4 },
    restInSeconds: { min: 180, max: 300, default: 240 },
  },
  [Objective.HYPERTROPHY]: {
    reps: { min: 8, max: 12, default: 8 },
    sets: { min: 3, max: 4, default: 3 },
    restInSeconds: { min: 90, max: 180, default: 150 },
  },
  [Objective.RESISTANCE]: {
    reps: { min: 15, max: 30, default: 20 },
    sets: { min: 2, max: 4, default: 3 },
    restInSeconds: { min: 30, max: 60, default: 45 },
  },
};


// Ejemplo de rutina: "Press de banca, 4 × 8, descanso 150 s"
export interface IRoutineExercise {
  exercise: Types.ObjectId; // referencia al catálogo (Exercise)
  sets: number;
  reps: number;
  restInSeconds: number;
}

// Un día de la rutina: "Torso · Fuerza"
export interface IRoutineDay {
  name: string;
  objective: Objective;
  exercises: IRoutineExercise[];
}

export interface IRoutine extends Document {
  user: Types.ObjectId;
  name: string;
  days: IRoutineDay[];
  createdAt: Date;
  updatedAt: Date;
}


const routineExerciseSchema = new Schema<IRoutineExercise>(
  {
    exercise: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
    sets: { type: Number, required: true },
    reps: { type: Number, required: true },
    restInSeconds: { type: Number, required: true },
  },
  { _id: false }
);

const routineDaySchema = new Schema<IRoutineDay>({
  name: { type: String, required: true, trim: true },
  objective: { type: String, enum: Object.values(Objective), required: true },
  exercises: {
    type: [routineExerciseSchema],
    validate: {
      validator: (value: unknown[]) => value.length > 0,
      message: "Cada día necesita al menos un ejercicio",
    },
  },
});


const FIELDS = ["sets", "reps", "restInSeconds"] as const;

routineDaySchema.pre("validate", function (this: IRoutineDay) {
  const objectiveKey = this.objective as Objective;
  const profile = OBJECTIVE_PROFILES[objectiveKey];
  if (!profile) return; // si el objetivo no es válido, ya lo valida el enum

  this.exercises.forEach((line: IRoutineExercise, i: number) => {
    for (const field of FIELDS) {
      const { min, max, default: def } = profile[field];
      const fieldValue = line[field];

      if (fieldValue === undefined || fieldValue === null) {
        line[field] = def;
        continue;
      }

      if (fieldValue < min || fieldValue > max) {
        (this as any).invalidate(
          `exercises.${i}.${field}`,
          `${field} debe estar entre ${min} y ${max} para el objetivo "${this.objective}"`
        );
      }
    }
  });
});

const routineSchema = new Schema<IRoutine>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    days: {
      type: [routineDaySchema],
      validate: {
        validator: (value: unknown[]) => value.length >= 1 && value.length <= 7,
        message: "Una rutina debe tener entre 1 y 7 días",
      },
    },
  },
  { timestamps: true }
);

export const Routine = model<IRoutine>("Routine", routineSchema);