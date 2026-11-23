import { Document, Schema, Types, model } from "mongoose";

// Reportes de publicaciones o comentarios del feed que un usuario considera inapropiados.
// Los revisa un administrador desde el panel (pestaña Moderación).
export const REPORT_REASONS = ["spam", "ofensivo", "inapropiado", "acoso", "otro"] as const;
export const REPORT_STATES = ["pendiente", "eliminado", "descartado"] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportState = (typeof REPORT_STATES)[number];

export interface IReport extends Document {
  post: Types.ObjectId;
  comment: Types.ObjectId | null; // null = se reporta la publicación entera
  autor?: Types.ObjectId; // quién escribió el contenido reportado
  contenido: string; // copia del texto, por si después se borra
  reportadoPor: Types.ObjectId;
  motivo: ReportReason;
  detalle?: string;
  estado: ReportState;
  resueltoPor?: Types.ObjectId;
  resueltoEn?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    comment: { type: Schema.Types.ObjectId, default: null },
    autor: { type: Schema.Types.ObjectId, ref: "User" },
    contenido: { type: String, default: "", maxlength: 500 },
    reportadoPor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    motivo: {
      type: String,
      enum: { values: REPORT_REASONS, message: "Motivo no válido" },
      required: [true, "El motivo es obligatorio"],
    },
    detalle: { type: String, trim: true, maxlength: [300, "El detalle no puede superar los 300 caracteres"] },
    estado: { type: String, enum: REPORT_STATES, default: "pendiente" },
    resueltoPor: { type: Schema.Types.ObjectId, ref: "User" },
    resueltoEn: { type: Date },
  },
  { timestamps: true }
);

// Cada usuario puede reportar una vez cada publicación y cada comentario.
reportSchema.index({ reportadoPor: 1, post: 1, comment: 1 }, { unique: true });
reportSchema.index({ estado: 1, createdAt: -1 });

export const Report = model<IReport>("Report", reportSchema);

// Al borrar contenido (su autor o un administrador) sus reportes pendientes quedan resueltos.
// Sin `comment` se resuelven los de la publicación y los de todos sus comentarios.
export function resolveReportsFor(post: Types.ObjectId | string, comment?: Types.ObjectId | string | null, by?: string) {
  const filtro: Record<string, unknown> = { post, estado: "pendiente" };
  if (comment) filtro.comment = comment;
  return Report.updateMany(filtro, { estado: "eliminado", resueltoEn: new Date(), ...(by ? { resueltoPor: by } : {}) });
}
