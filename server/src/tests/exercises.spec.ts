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
  let normalId = '';
  let tokenNormal = '';
  let exerciseId = '';

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

    // Modificar el catálogo es cosa de administradores; consultarlo, de cualquier usuario
    const user = new User({
      name: 'Usuario Exercise Test',
      email: `exercise_test_${fixtureId}@example.com`,
      password: 'Password123!',
      role: 'admin',
    });
    await user.save();
    const normal = await new User({
      name: 'Usuario Normal Exercise Test',
      email: `exercise_normal_${fixtureId}@example.com`,
      password: 'Password123!',
    }).save();

    userId = user._id.toString();
    token = generateToken(userId, user.role);
    normalId = normal._id.toString();
    tokenNormal = generateToken(normalId, normal.role);
  });

  afterAll(async () => {
    await Exercise.deleteMany({ name: { $regex: fixtureId } });
    await User.deleteMany({ _id: { $in: [userId, normalId].filter(Boolean) } });
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
    exerciseId = res.body._id;
  });

  it('POST /api/exercises - Un usuario normal no puede crear ejercicios', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .set('Authorization', `Bearer ${tokenNormal}`)
      .send({ ...testExercise, name: `Ejercicio de usuario ${fixtureId}` });

    expect(res.status).toBe(403);
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

  it('PUT /api/exercises/:id - El administrador edita un ejercicio', async () => {
    const res = await request(app)
      .put(`/api/exercises/${exerciseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ difficulty: 2, rankingKey: 'row' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ difficulty: 2, rankingKey: 'row' });
  });

  it('PUT /api/exercises/:id - Un usuario normal no puede editar', async () => {
    const res = await request(app)
      .put(`/api/exercises/${exerciseId}`)
      .set('Authorization', `Bearer ${tokenNormal}`)
      .send({ difficulty: 5 });

    expect(res.status).toBe(403);
  });

  it('GET /api/admin/exercises - Incluye cuántos entrenamientos y rutinas lo usan', async () => {
    const res = await request(app).get('/api/admin/exercises').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const mio = res.body.find((e: any) => e._id === exerciseId);
    expect(mio.uso).toEqual({ entrenamientos: 0, rutinas: 0 });
  });

  it('DELETE /api/exercises/:id - El administrador elimina un ejercicio sin uso', async () => {
    const res = await request(app).delete(`/api/exercises/${exerciseId}`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await Exercise.findById(exerciseId)).toBeNull();
  });
});
