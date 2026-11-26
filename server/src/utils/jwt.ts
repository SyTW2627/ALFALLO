import jwt from 'jsonwebtoken';

// En producción el secreto es obligatorio: con uno por defecto cualquiera podría firmar tokens.
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('La variable de entorno JWT_SECRET no está definida.');
  }
  return 'secret_key_fallback';
}

export const generateToken = (userId: string, role: string): string => {
  return jwt.sign({ id: userId, role }, jwtSecret(), {
    expiresIn: '24h',
  });
};
