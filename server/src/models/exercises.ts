import { Document, Schema, model } from "mongoose";

enum BodyParts {

  BACK = "Back",
  DORSAL = "Dorsal",
  LUMBAAR = "Lumbar",
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
  difficulty: number,
}

const exerciseSchema = new Schema<IExercise>({
  name: {
    type: String, 
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  bodyPart: {
    type: String,
    enum: Object.values(BodyParts),
    required: true,
    trim: true,
  },
  difficulty: {
    type: Number,
    required: true,
    trim: true,
  },
});

export const Exercise = model<IExercise>('Exercise', exerciseSchema);