import { Document, Schema, model } from "mongoose";

export enum BodyParts {
  BACK = "Back",
  DORSAL = "Dorsal",
  LUMBAR = "Lumbar",
  BICEPS = "Biceps",
  TRICEPS = "Triceps",
  QUADRICEPS = "Quadriceps",
  FEMORAL = "Femoral",
  GLUTEUS = "Gluteus",
  ABDOMINAL = "Abdominal",
  CHEST = "Chest",
  ABDUCTORS = "Abductors",
  ADDUCTORS = "Adductors",
  LATERAL_SHOULDER = "Lateral Shoulder",
  POSTERIOR_SHOULDER = "Posterior Shoulder",
  FRONT_SHOULDER = "Front Shoulder",
}

export interface IExercise extends Document {
  name: string,
  description: string,
  bodyPart: BodyParts,
  difficulty: number, // 1 (fácil) – 5 (muy difícil).
}

const exerciseSchema = new Schema<IExercise>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    bodyPart: {
      type: String,
      enum: Object.values(BodyParts),
      required: true,
    },
    difficulty: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true }
);

export const Exercise = model<IExercise>("Exercise", exerciseSchema);