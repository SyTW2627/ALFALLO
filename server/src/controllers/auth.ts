import { Request, Response } from 'express';
import { User } from '../models/user';
import { generateToken } from '../utils/jwt';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Validación limpia sin espacios invisibles
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
    }

    const user = new User({ name, email, password });
    await user.save();

    const token = generateToken(user._id.toString(), user.role);

    return res.status(201).json({
      message: 'Usuario registrado con éxito',
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor', error });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'Esta cuenta usa Google para iniciar sesión' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const token = generateToken(user._id.toString(), user.role);

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor', error });
  }
};

// POST /api/auth/google
// Sirve tanto para iniciar sesión como para registrarse: si el email no existe, crea la cuenta.
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Falta el token de Google' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: 'Token de Google no válido' });
    }

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ message: 'La cuenta de Google no tiene un email verificado' });
    }

    let user = await User.findOne({ email: payload.email.toLowerCase() });
    let status = 200;

    if (!user) {
      user = new User({
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        googleId: payload.sub,
      });
      await user.save();
      status = 201;
    } else if (!user.googleId) {
      // Ya tenía cuenta con ese email: se vincula con Google
      user.googleId = payload.sub;
      await user.save();
    }

    const token = generateToken(user._id.toString(), user.role);

    return res.status(status).json({
      message: status === 201 ? 'Usuario registrado con Google' : 'Inicio de sesión con Google exitoso',
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor', error });
  }
};