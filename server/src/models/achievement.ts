import { Document, Schema, Types, model } from "mongoose";

// Hitos desbloqueados. La definición de cada hito vive en src/progress/engine.ts;
// aquí solo se guarda cuándo lo consiguió cada usuario (así no se pierde aunque borre entrenamientos).
export interface IAchievement extends Document {
  user: Types.ObjectId;
  key: string;
  unlockedAt: Date;
}

const achievementSchema = new Schema<IAchievement>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  key: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now },
});

achievementSchema.index({ user: 1, key: 1 }, { unique: true });

export const Achievement = model<IAchievement>("Achievement", achievementSchema);