import { Document, Schema, Types, model } from "mongoose";


export enum Objective {
  HYPERTROPHY = "hypertrophy",
  FORCE = "force",
  RESISTANCE = "resistance",
}

export enum WorkoutStatus {
  IN_PROGRESS = "in_progress",
  FINISHED = "finished",
}

export interface ISet {
  reps: number;
  weightKg: number;
}

export interface IWorkoutExercise {
  exercise: Types.ObjectId; // referencia al catálogo (Exercise)
  sets: ISet[];
}

export interface IWorkout extends Document {
  user: Types.ObjectId;
  title: string; // tipo de entrenamiento elegido: "Torso", "Pierna"...
  objective?: Objective;
  status: WorkoutStatus;
  startedAt: Date;
  finishedAt?: Date;
  exercises: IWorkoutExercise[];
  notes?: string;
  // Virtuals (se calculan, no se guardan):
  durationMinutes?: number | null;
  totalSets?: number;
  totalVolumeKg?: number;
}

const setSchema = new Schema<ISet>(
  {
    reps: { type: Number, required: true, min: 1 },
    weightKg: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const workoutExerciseSchema = new Schema<IWorkoutExercise>(
  {
    exercise: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
    // Puede estar vacío mientras entrena: las series se van añadiendo una a una.
    sets: { type: [setSchema], default: [] },
  },
  { _id: false }
);

const workoutSchema = new Schema<IWorkout>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    objective: { type: String, enum: Object.values(Objective) },
    status: {
      type: String,
      enum: Object.values(WorkoutStatus),
      default: WorkoutStatus.IN_PROGRESS,
      required: true,
    },
    startedAt: { type: Date, required: true, default: Date.now },
    finishedAt: {
      type: Date,
      required: function (this: IWorkout) {
        return this.status === WorkoutStatus.FINISHED;
      },
    },
    exercises: { type: [workoutExerciseSchema], default: [] },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// No se puede terminar un entrenamiento sin ninguna serie registrada.
workoutSchema.pre("validate", function (this: any) {
  if (this.status !== WorkoutStatus.FINISHED) return;
  const total = this.exercises.reduce((acc: number, e: any) => acc + e.sets.length, 0);
  if (total === 0) {
    this.invalidate("exercises", "No puedes terminar un entrenamiento sin ninguna serie");
  }
});

// Para el feed y el historial: entrenamientos de un usuario, los más recientes primero.
workoutSchema.index({ user: 1, status: 1, finishedAt: -1 });

// Solo un entrenamiento en curso por usuario.
workoutSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: WorkoutStatus.IN_PROGRESS } }
);

// "64 min"
workoutSchema.virtual("durationMinutes").get(function (this: IWorkout) {
  if (!this.finishedAt) return null;
  return Math.round((this.finishedAt.getTime() - this.startedAt.getTime()) / 60000);
});

// "18 series"
workoutSchema.virtual("totalSets").get(function (this: IWorkout) {
  return this.exercises.reduce((acc, e) => acc + e.sets.length, 0);
});

// "6.240 kg" = suma de reps × peso de todas las series
workoutSchema.virtual("totalVolumeKg").get(function (this: IWorkout) {
  return this.exercises.reduce(
    (acc, e) => acc + e.sets.reduce((s, set) => s + set.reps * set.weightKg, 0),
    0
  );
});

export const Workout = model<IWorkout>("Workout", workoutSchema);