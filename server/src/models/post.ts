import { Document, Schema, Types, model } from "mongoose";

// Comentario dentro de un post
export interface IComment {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
}

// Un post es un entrenamiento terminado que el usuario publica en el feed
export interface IPost extends Document {
  user: Types.ObjectId;
  workout: Types.ObjectId;
  caption?: string;
  kudos: Types.ObjectId[]; // usuarios que han dado kudos
  comments: Types.DocumentArray<IComment & Document>;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: {
      type: String,
      required: [true, "El comentario no puede estar vacío"],
      trim: true,
      maxlength: [500, "El comentario no puede superar los 500 caracteres"],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const postSchema = new Schema<IPost>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Un entrenamiento solo se puede publicar una vez
    workout: { type: Schema.Types.ObjectId, ref: "Workout", required: true, unique: true },
    caption: {
      type: String,
      trim: true,
      maxlength: [280, "El texto no puede superar los 280 caracteres"],
    },
    kudos: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    comments: { type: [commentSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Para el feed: los posts más recientes primero
postSchema.index({ createdAt: -1 });

postSchema.virtual("kudosCount").get(function (this: IPost) {
  return this.kudos.length;
});

postSchema.virtual("commentsCount").get(function (this: IPost) {
  return this.comments.length;
});

export const Post = model<IPost>("Post", postSchema);