import { Document, Schema, Types, model } from "mongoose";

// Notificaciones de la campanita. Pueden ser para todos (las envía un administrador, sin `destinatario`)
// o personales para un usuario: "Ana te ha dado ánimos", "Pablo te sigue", "Te quedan 2 series del reto"...
// Para saber cuáles ha leído cada usuario no se guarda nada aquí: el usuario tiene
// `notificationsSeenAt` y son "nuevas" las publicadas después de esa fecha.
// `publicarEn` permite programarlas: hasta esa fecha no las ve nadie más que los administradores.
export const NOTIFICATION_TYPES = ["aviso", "hito", "reto", "kudos", "comentario", "seguidor", "progreso"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  titulo: string;
  mensaje: string;
  enlace?: string;
  tipo: NotificationType;
  publicarEn: Date;
  destinatario?: Types.ObjectId | null; // null = para todos
  clave?: string; // evita duplicados en las personales (p. ej. "kudos:<post>:<usuario>")
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
    destinatario: { type: Schema.Types.ObjectId, ref: "User", default: null },
    clave: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ publicarEn: -1 });
notificationSchema.index({ destinatario: 1, publicarEn: -1 });
// Una misma notificación personal (misma clave) no se repite para el mismo usuario.
notificationSchema.index({ destinatario: 1, clave: 1 }, { unique: true, partialFilterExpression: { clave: { $type: "string" } } });

// Las que puede ver un usuario: las de todos y las suyas.
export const paraUsuario = (userId: string) => ({ $or: [{ destinatario: null }, { destinatario: userId }] });

// Las notificaciones creadas antes de existir `publicarEn` no lo tienen: cuenta su createdAt.
export const fechaPublicacion = (n: { publicarEn?: Date | null; createdAt: Date }) => new Date(n.publicarEn ?? n.createdAt);

// Filtro de las ya publicadas (las programadas para más adelante no se ven).
export const publicadas = (ahora = new Date()) => ({ $or: [{ publicarEn: { $lte: ahora } }, { publicarEn: null }] });

// Filtro de las publicadas después de `desde` (las "nuevas" para un usuario).
export const publicadasDesde = (desde: Date, ahora = new Date()) => ({
  $or: [{ publicarEn: { $gt: desde, $lte: ahora } }, { publicarEn: null, createdAt: { $gt: desde } }],
});

export const Notification = model<INotification>("Notification", notificationSchema);
