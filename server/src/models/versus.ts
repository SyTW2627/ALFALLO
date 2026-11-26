import { Document, Schema, Types, model } from "mongoose";
import { LIFT_KEYS, LiftKey } from "../progress/standards";
import { DURACIONES_DIAS, MODALIDADES, Modalidad } from "../versus/engine";

// Versus (beta): un usuario reta a otro a ver quién levanta más en un ejercicio durante unos días.
// Ciclo: pendiente → (el rival acepta) activo → al llegar `fin`, terminado (se guarda el resultado).
//        pendiente → rechazado (el rival no quiere) o cancelado (el retador lo retira).
export const VERSUS_STATES = ["pendiente", "activo", "terminado", "rechazado", "cancelado"] as const;
export type VersusState = (typeof VERSUS_STATES)[number];

interface IMarcaGuardada {
  fecha: Date;
  kg: number;
  reps: number;
  e1rm: number;
  ratio: number | null;
}

export interface IVersus extends Document {
  retador: Types.ObjectId;
  rival: Types.ObjectId;
  ejercicio: LiftKey;
  modalidad: Modalidad;
  dias: number;
  mensaje?: string;
  estado: VersusState;
  inicio?: Date; // al aceptarse
  fin?: Date;
  // Resultado congelado al terminar: editar el historial después ya no lo cambia.
  resultado?: {
    retador: IMarcaGuardada | null;
    rival: IMarcaGuardada | null;
    ganador: "retador" | "rival" | "empate" | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const marcaSchema = new Schema<IMarcaGuardada>(
  { fecha: Date, kg: Number, reps: Number, e1rm: Number, ratio: { type: Number, default: null } },
  { _id: false }
);

const versusSchema = new Schema<IVersus>(
  {
    retador: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rival: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ejercicio: { type: String, enum: { values: LIFT_KEYS, message: "Ejercicio no válido" }, required: [true, "Elige un ejercicio"] },
    modalidad: { type: String, enum: { values: MODALIDADES, message: "Modalidad no válida" }, required: true, default: "kg" },
    dias: {
      type: Number,
      required: true,
      enum: { values: DURACIONES_DIAS as unknown as number[], message: "Duración no válida" },
      default: 7,
    },
    mensaje: { type: String, trim: true, maxlength: [140, "El mensaje no puede tener más de 140 caracteres"] },
    estado: { type: String, enum: VERSUS_STATES, default: "pendiente", required: true },
    inicio: { type: Date },
    fin: { type: Date },
    resultado: {
      type: new Schema(
        { retador: { type: marcaSchema, default: null }, rival: { type: marcaSchema, default: null }, ganador: { type: String, default: null } },
        { _id: false }
      ),
      default: undefined,
    },
  },
  { timestamps: true }
);

versusSchema.index({ retador: 1, createdAt: -1 });
versusSchema.index({ rival: 1, createdAt: -1 });

export const Versus = model<IVersus>("Versus", versusSchema);
