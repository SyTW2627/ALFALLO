import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { BodyParts, Exercise } from '../models/exercises';
import { User } from '../models/user';
import { connectDB } from '../db/mongoose';
import app from '../app';
import { generateToken } from '../utils/jwt';

describe('Pruebas de ejercicios (/api/exercises)', () => {
  let userId = '';
  let token = '';

  // Sufijo único: cada ejecución usa un nombre nuevo y no choca con datos de ejecuciones anteriores
  const fixtureId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const testExercise = {
    name: `Curl parado con barra ${fixtureId}`,
    description: 'Una barra con peso en los extremos, codos pegados al costado y subir y bajar lentamente.',
    bodyPart: BodyParts.BICEPS,
    difficulty: 1,
  };

  beforeAll(async () => {
    await connectDB();

    // Las rutas de ejercicios están protegidas: hace falta un usuario y su token
    const user = new User({
      name: 'Usuario Exercise Test',
      email: `exercise_test_${fixtureId}@example.com`,
      password: 'Password123!',
    });
    await user.save();

    userId = user._id.toString();
    token = generateToken(userId, user.role);
  });

  afterAll(async () => {
    await Exercise.deleteMany({ name: { $regex: fixtureId } });
    if (userId) {
      await User.findByIdAndDelete(userId);
    }
    await mongoose.connection.close();
  });

  it('POST /api/exercises - Insertar ejercicio en la base de datos', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .set('Authorization', `Bearer ${token}`)
      .send(testExercise);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(testExercise);
    expect(res.body).toHaveProperty('_id');
  });

  it('POST /api/exercises - Insertar ejercicio ya existente en la base de datos', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .set('Authorization', `Bearer ${token}`)
      .send(testExercise);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Ya existe un ejercicio con ese nombre');
  });

  it('GET /api/exercises - El catálogo incluye el ejercicio creado', async () => {
    const res = await request(app)
      .get('/api/exercises')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(
      expect.arrayContaining([expect.objectContaining(testExercise)]),
    );
  });

  it('GET /api/exercises - El catálogo viene ordenado por nombre', async () => {
    const res = await request(app)
      .get('/api/exercises')
      .set('Authorization', `Bearer ${token}`);

    const names: string[] = res.body.map((e: { name: string }) => e.name);
    const sorted = [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(names).toEqual(sorted);
  });

  it('GET /api/exercises - Sin token devuelve 401', async () => {
    const res = await request(app).get('/api/exercises');

    expect(res.status).toBe(401);
  });

  it('POST /api/exercises - Con un token falso devuelve 403', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .set('Authorization', 'Bearer token-falso')
      .send({ ...testExercise, name: `Otro ejercicio ${fixtureId}` });

    expect(res.status).toBe(403);
  });
});