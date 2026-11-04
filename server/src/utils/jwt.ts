import jwt from 'jsonwebtoken';

export const generateToken = (userId: string, role: string): string => {
  const secret = process.env.JWT_SECRET || 'secret_key_fallback';
  return jwt.sign({ id: userId, role }, secret, {
    expiresIn: '24h',
  });
};