import { Document, Schema, Types, model } from "mongoose";
import { ACHIEVEMENT_CATEGORIES, CUSTOM_ACHIEVEMENT_METRICS } from "../progress/custom";

// Hitos creados por los administradores. Aparecen a todos los usuarios junto a los hitos fijos
// (los de src/progress/engine.ts). Cuando un usuario lo consigue se guarda en Achievement con
// la clave `custom-<id>`, igual que el resto.
export interface ICustomAchievement extends Document {
  titulo: string;
  descripcion: string;
  categoria: string;
  metrica: string;
  objetivo: number;
  activo: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const customAchievementSchema = new Schema<ICustomAchievement>(
  {
    titulo: {
      type: String,
      required: [true, "El título es obligatorio"],
      trim: true,
      maxlength: [60, "El título no puede tener más de 60 caracteres"],
    },
    descripcion: {
      type: String,
      required: [true, "La descripción es obligatoria"],
      trim: true,
      maxlength: [200, "La descripción no puede tener más de 200 caracteres"],
    },
    categoria: {
      type: String,
      enum: { values: ACHIEVEMENT_CATEGORIES.map((c) => c.key), message: "Categoría no válida" },
      default: "especial",
    },
    metrica: {
      type: String,
      required: [true, "La métrica es obligatoria"],
      enum: { values: Object.keys(CUSTOM_ACHIEVEMENT_METRICS), message: "Métrica no válida" },
    },
    objetivo: {
      type: Number,
      required: [true, "El objetivo es obligatorio"],
      min: [0.01, "El objetivo debe ser mayor que 0"],
    },
    activo: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const CustomAchievement = model<ICustomAchievement>("CustomAchievement", customAchievementSchema);
