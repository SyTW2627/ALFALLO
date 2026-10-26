import { Request, Response } from 'express';
import { User } from '../models/user';
import { generateToken } from '../utils/jwt';

// POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

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

    res.status(201).json({
      message: 'Usuario registrado con éxito',
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor', error });
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