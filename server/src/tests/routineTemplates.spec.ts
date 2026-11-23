import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../models/user';
import { Routine, OBJECTIVE_PROFILES } from '../models/routines';
import { Exercise, BodyParts } from '../models/exercises';
import { connectDB } from '../db/mongoose';
import { generateToken } from '../utils/jwt';
import { ROUTINE_TEMPLATES } from '../routines/templates';

describe('Rutinas por defecto (/api/routines/templates)', () => {
  let userId = '';
  let token = '';
  const creados: string[] = [];

  beforeAll(async () => {
    await connectDB();
    const stamp = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const user = await User.create({ name: 'Plantillas', email: `tpl_${stamp}@example.com`, password: 'Password123!' });
    userId = user._id.toString();
    token = generateToken(userId, 'user');

    // La base de datos de test puede no tener el catálogo: se crean los ejercicios que falten.
    const nombres = [...new Set(ROUTINE_TEMPLATES.flatMap((t) => t.dias.flatMap((d) => d.exercises.map((e) => e.ejercicio))))];
    const existentes = new Set((await Exercise.find({ name: { $in: nombres } }).select('name').lean()).map((e) => e.name));
    for (const name of nombres.filter((n) => !existentes.has(n))) {
      const e = await Exercise.create({ name, description: 'Creado por el test', bodyPart: BodyParts.CHEST, difficulty: 2 });
      creados.push(e._id.toString());
    }
  });

  afterAll(async () => {
    await Routine.deleteMany({ user: userId });
    await Exercise.deleteMany({ _id: { $in: creados } });
    await User.findByIdAndDelete(userId);
    await mongoose.connection.close();
  });

  it('Las plantillas respetan los rangos de series, repeticiones y descanso de su objetivo', () => {
    for (const t of ROUTINE_TEMPLATES) {
      for (const d of t.dias) {
        const p = OBJECTIVE_PROFILES[d.objective];
        for (const e of d.exercises) {
          expect(e.sets, `${t.nombre} · ${e.ejercicio}`).toBeGreaterThanOrEqual(p.sets.min);
          expect(e.sets).toBeLessThanOrEqual(p.sets.max);
          expect(e.reps, `${t.nombre} · ${e.ejercicio}`).toBeGreaterThanOrEqual(p.reps.min);
          expect(e.reps).toBeLessThanOrEqual(p.reps.max);
          expect(e.restInSeconds, `${t.nombre} · ${e.ejercicio}`).toBeGreaterThanOrEqual(p.restInSeconds.min);
          expect(e.restInSeconds).toBeLessThanOrEqual(p.restInSeconds.max);
        }
      }
    }
  });

  it('GET /api/routines/templates - Devuelve Heavy Duty, Push Pull Legs y Upper Lower', async () => {
    const res = await request(app).get('/api/routines/templates').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.map((t: any) => t.name)).toEqual(['Heavy Duty', 'Push Pull Legs', 'Upper Lower']);
    expect(res.body.every((t: any) => t.disponible && t.faltan.length === 0)).toBe(true);
    expect(res.body[0].days[0].exercises[0].exercise).toHaveProperty('name');
  });

  it('POST /api/routines/templates/:clave - Copia la rutina al usuario', async () => {
    const res = await request(app).post('/api/routines/templates/upper-lower').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Upper Lower');
    expect(res.body.days).toHaveLength(4);

    const mias = await request(app).get('/api/routines').set('Authorization', `Bearer ${token}`);
    expect(mias.body.some((r: any) => r._id === res.body._id)).toBe(true);
  });

  it('POST /api/routines/templates/:clave - 404 si no existe', async () => {
    const res = await request(app).post('/api/routines/templates/no-existe').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
