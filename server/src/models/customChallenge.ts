import { Document, Schema, Types, model } from "mongoose";
import { BodyParts } from "./exercises";
import { CUSTOM_CHALLENGE_METRICS } from "../progress/custom";

// Retos especiales creados por los administradores. A diferencia de los semanales (que se generan
// solos cada lunes), tienen una fecha de inicio y de fin, y cuentan lo que el usuario haga entre ellas.
export interface ICustomChallenge extends Document {
  titulo: string;
  descripcion: string;
  metrica: string;
  zonas: string[]; // solo para la métrica "series"
  objetivo: number;
  inicio: Date;
  fin: Date; // exclusivo
  activo: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const customChallengeSchema = new Schema<ICustomChallenge>(
  {
    titulo: {
      type: String,
      required: [true, "El título es obligatorio"],
      trim: true,
      maxlength: [80, "El título no puede tener más de 80 caracteres"],
    },
    descripcion: {
      type: String,
      trim: true,
      default: "",
      maxlength: [200, "La descripción no puede tener más de 200 caracteres"],
    },
    metrica: {
      type: String,
      required: [true, "La métrica es obligatoria"],
      enum: { values: Object.keys(CUSTOM_CHALLENGE_METRICS), message: "Métrica no válida" },
    },
    zonas: {
      type: [{ type: String, enum: { values: Object.values(BodyParts), message: "Zona muscular no válida" } }],
      default: [],
    },
    objetivo: {
      type: Number,
      required: [true, "El objetivo es obligatorio"],
      min: [1, "El objetivo debe ser al menos 1"],
    },
    inicio: { type: Date, required: [true, "La fecha de inicio es obligatoria"] },
    fin: { type: Date, required: [true, "La fecha de fin es obligatoria"] },
    activo: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

customChallengeSchema.index({ activo: 1, inicio: 1, fin: 1 });

customChallengeSchema.pre("validate", function () {
  if (this.inicio && this.fin && this.fin.getTime() <= this.inicio.getTime()) {
    this.invalidate("fin", "La fecha de fin debe ser posterior a la de inicio");
  }
  if (this.metrica === "series" && !this.zonas?.length) {
    this.invalidate("zonas", "Elige al menos una zona muscular para un reto de series");
  }
});

export const CustomChallenge = model<ICustomChallenge>("CustomChallenge", customChallengeSchema);
