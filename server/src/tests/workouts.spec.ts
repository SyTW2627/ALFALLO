import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { BodyParts, Exercise } from '../models/exercises';
import { Workout, WorkoutStatus, Objective } from '../models/workout';
import { Post } from '../models/post';
import { User } from '../models/user';
import { connectDB } from '../db/mongoose';
import app from '../app';
import { generateToken } from '../utils/jwt';

describe('Pruebas del historial de entrenamientos (/api/workouts/:id)', () => {
  let userId = '';
  let token = '';
  let otherUserId = '';
  let otherToken = '';
  let exerciseIds: string[] = [];

  const fixtureId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const HORA = 60 * 60 * 1000;

  const crearTerminado = (user = userId, extra: Record<string, unknown> = {}) => {
    const fin = new Date(Date.now() - 24 * HORA);
    return Workout.create({
      user,
      title: 'Torso',
      objective: Objective.HYPERTROPHY,
      status: WorkoutStatus.FINISHED,
      startedAt: new Date(fin.getTime() - HORA),
      finishedAt: fin,
      exercises: [{ exercise: exerciseIds[0], sets: [{ reps: 8, weightKg: 60 }] }],
      ...extra,
    });
  };

  beforeAll(async () => {
    await connectDB();

    const exercises = await Exercise.create([
      { name: `Press banca ${fixtureId}`, description: 'Press', bodyPart: BodyParts.CHEST, difficulty: 3 },
      { name: `Sentadilla ${fixtureId}`, description: 'Sentadilla', bodyPart: BodyParts.QUADRICEPS, difficulty: 2 },
    ]);
    exerciseIds = exercises.map((e) => e._id.toString());

    const user = await new User({
      name: 'Usuario Historial',
      email: `historial_${fixtureId}@example.com`,
      password: 'Password123!',
    }).save();
    userId = user._id.toString();
    token = generateToken(userId, user.role);

    const other = await new User({
      name: 'Otro Usuario',
      email: `historial_otro_${fixtureId}@example.com`,
      password: 'Password123!',
    }).save();
    otherUserId = other._id.toString();
    otherToken = generateToken(otherUserId, other.role);
  });

  afterAll(async () => {
    const users = [userId, otherUserId].filter(Boolean);
    await Post.deleteMany({ user: { $in: users } });
    await Workout.deleteMany({ user: { $in: users } });
    await User.deleteMany({ _id: { $in: users } });
    if (exerciseIds.length) await Exercise.deleteMany({ _id: { $in: exerciseIds } });
    await mongoose.connection.close();
  });

  it('GET /api/workouts/:id - Devuelve un entrenamiento terminado propio', async () => {
    const w = await crearTerminado();
    const res = await request(app).get(`/api/workouts/${w._id}`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Torso');
    expect(res.body.exercises[0].exercise.name).toContain('Press banca');
  });

  it('GET /api/workouts/history sigue funcionando (no se confunde con un id)', async () => {
    const res = await request(app).get('/api/workouts/history').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PUT /api/workouts/:id - Edita título, objetivo, notas, fechas y series', async () => {
    const w = await crearTerminado();
    const inicio = new Date(Date.now() - 48 * HORA);
    const fin = new Date(inicio.getTime() + 75 * 60 * 1000);

    const res = await request(app)
      .put(`/api/workouts/${w._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Pierna',
        objective: null,
        notes: 'Me equivoqué de día',
        startedAt: inicio.toISOString(),
        finishedAt: fin.toISOString(),
        exercises: [
          { exercise: exerciseIds[1], sets: [{ reps: 5, weightKg: 100 }, { reps: 5, weightKg: 105 }] },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Pierna', notes: 'Me equivoqué de día', durationMinutes: 75, totalSets: 2 });
    expect(res.body.objective).toBeUndefined();
    expect(res.body.exercises[0].exercise.name).toContain('Sentadilla');
  });

  it('PUT /api/workouts/:id - No permite dejarlo sin series', async () => {
    const w = await crearTerminado();
    const res = await request(app)
      .put(`/api/workouts/${w._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ exercises: [] });

    expect(res.status).toBe(400);
    const guardado = await Workout.findById(w._id);
    expect(guardado?.exercises).toHaveLength(1);
  });

  it('PUT /api/workouts/:id - Rechaza fechas incoherentes o futuras', async () => {
    const w = await crearTerminado();
    const alReves = await request(app)
      .put(`/api/workouts/${w._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startedAt: new Date(Date.now() - HORA).toISOString(), finishedAt: new Date(Date.now() - 2 * HORA).toISOString() });
    expect(alReves.status).toBe(400);

    const futura = await request(app)
      .put(`/api/workouts/${w._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ finishedAt: new Date(Date.now() + 24 * HORA).toISOString() });
    expect(futura.status).toBe(400);
  });

  it('PUT/DELETE /api/workouts/:id - No se puede tocar el entrenamiento de otro usuario', async () => {
    const w = await crearTerminado(otherUserId);

    const put = await request(app).put(`/api/workouts/${w._id}`).set('Authorization', `Bearer ${token}`).send({ title: 'Hack' });
    expect(put.status).toBe(404);

    const del = await request(app).delete(`/api/workouts/${w._id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(404);

    expect((await Workout.findById(w._id))?.title).toBe('Torso');
  });

  it('PUT /api/workouts/:id - Un entrenamiento en curso no se edita por esta ruta', async () => {
    const enCurso = await Workout.create({ user: otherUserId, title: 'En curso', status: WorkoutStatus.IN_PROGRESS });
    const res = await request(app)
      .put(`/api/workouts/${enCurso._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Otro' });
    expect(res.status).toBe(404);
    await enCurso.deleteOne();
  });

  it('DELETE /api/workouts/:id - Elimina el entrenamiento y su publicación', async () => {
    const w = await crearTerminado();
    await Post.create({ user: userId, workout: w._id, caption: 'Hoy tocaba torso' });

    const res = await request(app).delete(`/api/workouts/${w._id}`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await Workout.findById(w._id)).toBeNull();
    expect(await Post.findOne({ workout: w._id })).toBeNull();
  });

  it('DELETE /api/workouts/:id - Id no válido o inexistente', async () => {
    const malo = await request(app).delete('/api/workouts/no-es-un-id').set('Authorization', `Bearer ${token}`);
    expect(malo.status).toBe(400);

    const noExiste = await request(app)
      .delete(`/api/workouts/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(noExiste.status).toBe(404);
  });
});
