import { Document, Schema, Types, model } from "mongoose";

// Notificaciones que los administradores envían a todos los usuarios (la campanita).
// Para saber cuáles ha leído cada usuario no se guarda nada aquí: el usuario tiene
// `notificationsSeenAt` y son "nuevas" las publicadas después de esa fecha.
// `publicarEn` permite programarlas: hasta esa fecha no las ve nadie más que los administradores.
export const NOTIFICATION_TYPES = ["aviso", "hito", "reto"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  titulo: string;
  mensaje: string;
  enlace?: string;
  tipo: NotificationType;
  publicarEn: Date;
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
    publicarEn: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ publicarEn: -1 });

// Las notificaciones creadas antes de existir `publicarEn` no lo tienen: cuenta su createdAt.
export const fechaPublicacion = (n: { publicarEn?: Date | null; createdAt: Date }) => new Date(n.publicarEn ?? n.createdAt);

// Filtro de las ya publicadas (las programadas para más adelante no se ven).
export const publicadas = (ahora = new Date()) => ({ $or: [{ publicarEn: { $lte: ahora } }, { publicarEn: null }] });

// Filtro de las publicadas después de `desde` (las "nuevas" para un usuario).
export const publicadasDesde = (desde: Date, ahora = new Date()) => ({
  $or: [{ publicarEn: { $gt: desde, $lte: ahora } }, { publicarEn: null, createdAt: { $gt: desde } }],
});

export const Notification = model<INotification>("Notification", notificationSchema);
