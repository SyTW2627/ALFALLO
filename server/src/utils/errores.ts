import { Response } from 'express';
import { Error as MongooseError } from 'mongoose';

// Errores de validación de Mongoose → 400 con un mensaje legible; email/campo único repetido → 409;
// el resto → 500 (el detalle se registra en el servidor, ver app.ts).
export function responderError(res: Response, error: unknown, mensaje500: string) {
  if (error instanceof MongooseError.ValidationError) {
    const primero = Object.values(error.errors)[0];
    return res.status(400).json({ message: primero?.message ?? 'Datos no válidos' });
  }
  if (error instanceof MongooseError.CastError) {
    return res.status(400).json({ message: `Valor no válido en "${error.path}"` });
  }
  return res.status(500).json({ message: mensaje500, error });
}

// ¿Es un error de clave duplicada de MongoDB (índice unique)?
export const esDuplicado = (error: unknown) => (error as { code?: number })?.code === 11000;
