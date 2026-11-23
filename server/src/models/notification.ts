import { Document, Schema, Types, model } from "mongoose";

// Notificaciones que los administradores envían a todos los usuarios (la campanita).
// Para saber cuáles ha leído cada usuario no se guarda nada aquí: el usuario tiene
// `notificationsSeenAt` y son "nuevas" las creadas después de esa fecha.
export const NOTIFICATION_TYPES = ["aviso", "hito", "reto"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  titulo: string;
  mensaje: string;
  enlace?: string;
  tipo: NotificationType;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    titulo: {
      type: String,
      required: [true, "El título es obligatorio"],
      trim: true,
      maxlength: [80, "El título no puede tener más de 80 caracteres"],
    },
    mensaje: {
      type: String,
      required: [true, "El mensaje es obligatorio"],
      trim: true,
      maxlength: [500, "El mensaje no puede tener más de 500 caracteres"],
    },
    enlace: {
      type: String,
      trim: true,
      // Ruta interna (/progreso) o web externa segura (https://...)
      match: [/^(\/[^\s]*|https:\/\/[^\s]+)$/, "El enlace debe empezar por / o por https://"],
    },
    tipo: { type: String, enum: NOTIFICATION_TYPES, default: "aviso" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });

export const Notification = model<INotification>("Notification", notificationSchema);
