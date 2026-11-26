import { Request, Response } from 'express';
import { User } from '../models/user';
import { generateToken } from '../utils/jwt';
import { OAuth2Client } from 'google-auth-library';
import { responderError, esDuplicado } from '../utils/errores';
import { crearLimiteIntentos } from '../utils/limiteIntentos';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Los emails se guardan en minúsculas (ver models/user.ts): se normalizan también al buscarlos,
// así "Ana@Mail.com" encuentra la cuenta de "ana@mail.com".
const normalizarEmail = (email: string) => email.trim().toLowerCase();

// Solo se aceptan textos: un objeto como { "$ne": null } no debe llegar a una consulta de MongoDB.
const sonTextos = (...valores: unknown[]) => valores.every((v) => typeof v === 'string' && v.trim() !== '');

// Máximo de inicios de sesión fallidos por email e IP antes de bloquear un rato.
const limiteLogin = crearLimiteIntentos(10, 15 * 60 * 1000);

// POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Validación limpia sin espacios invisibles
    if (!sonTextos(name, email, password)) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const existingUser = await User.findOne({ email: normalizarEmail(email) });
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
    // Dos registros simultáneos con el mismo email: lo frena el índice único
    if (esDuplicado(error)) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
    }
    // Contraseña demasiado corta, email con formato incorrecto...
    return responderError(res, error, 'Error interno del servidor');
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!sonTextos(email, password)) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    const claveLimite = `${normalizarEmail(email)}|${req.ip}`;
    if (limiteLogin.bloqueado(claveLimite)) {
      return res.status(429).json({ message: 'Demasiados intentos fallidos. Prueba de nuevo en unos minutos.' });
    }

    const user = await User.findOne({ email: normalizarEmail(email) });
    if (!user) {
      limiteLogin.registrarFallo(claveLimite);
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'Esta cuenta usa Google para iniciar sesión' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      limiteLogin.registrarFallo(claveLimite);
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }
    limiteLogin.limpiar(claveLimite);

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
    if (!sonTextos(credential)) {
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