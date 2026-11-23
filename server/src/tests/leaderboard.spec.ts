import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../models/user';
import { Exercise, BodyParts } from '../models/exercises';
import { Workout, WorkoutStatus } from '../models/workout';
import { CustomChallenge } from '../models/customChallenge';
import { connectDB } from '../db/mongoose';
import { generateToken } from '../utils/jwt';
import { weekStart } from '../progress/engine';

describe('Clasificaciones (/api/leaderboard)', () => {
  const ids: string[] = [];
  let token = '';
  let ejercicioId = '';
  let retoId = '';

  beforeAll(async () => {
    await connectDB();
    const stamp = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const [yo, amigo, desconocido] = await User.create([
      { name: 'Yo', email: `lb_yo_${stamp}@example.com`, password: 'Password123!' },
      { name: 'Amigo', email: `lb_amigo_${stamp}@example.com`, password: 'Password123!' },
      { name: 'Desconocido', email: `lb_otro_${stamp}@example.com`, password: 'Password123!' },
    ]);
    ids.push(...[yo, amigo, desconocido].map((u) => u._id.toString()));
    await User.updateOne({ _id: yo._id }, { following: [amigo._id] });
    token = generateToken(ids[0], 'user');

    const ejercicio = await Exercise.create({
      name: `Ejercicio clasificación ${stamp}`,
      description: 'Para el test',
      bodyPart: BodyParts.CHEST,
      difficulty: 2,
    });
    ejercicioId = ejercicio._id.toString();

    // Dentro de esta semana: el amigo termina antes que yo.
    const base = Math.max(Date.now() - 20 * 60000, weekStart(new Date()).getTime() + 1000);
    const entreno = (user: unknown, fin: number, kg: number) => ({
      user,
      title: 'Torso',
      status: WorkoutStatus.FINISHED,
      startedAt: new Date(fin - 1000),
      finishedAt: new Date(fin),
      exercises: [{ exercise: ejercicio._id, sets: [{ reps: 5, weightKg: kg }] }],
    });
    await Workout.create([entreno(yo._id, base + 2000, 100), entreno(amigo._id, base + 1000, 200), entreno(desconocido._id, base, 500)]);

    const reto = await CustomChallenge.create({
      titulo: `Reto clasificación ${stamp}`,
      metrica: 'entrenos',
      objetivo: 1,
      inicio: new Date(base - 86400000),
      fin: new Date(Date.now() + 7 * 86400000),
    });
    retoId = reto._id.toString();
  });

  afterAll(async () => {
    await Workout.deleteMany({ user: { $in: ids } });
    await CustomChallenge.findByIdAndDelete(retoId);
    await Exercise.findByIdAndDelete(ejercicioId);
    await User.deleteMany({ _id: { $in: ids } });
    await mongoose.connection.close();
  });

  it('Solo incluye a los usuarios que sigues (y a ti), ordenados por volumen', async () => {
    const res = await request(app).get('/api/leaderboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.siguiendo).toBe(1);
    const nombres = res.body.semana.porVolumen.map((f: any) => f.usuario.nombre);
    expect(nombres).toEqual(['Amigo', 'Yo']);
    expect(res.body.semana.porVolumen[0]).toMatchObject({ volumen: 1000, posicion: 1, esYo: false });
    expect(res.body.semana.porVolumen[1]).toMatchObject({ volumen: 500, posicion: 2, esYo: true });
  });

  it('En los retos especiales gana quien lo completó antes', async () => {
    const res = await request(app).get('/api/leaderboard').set('Authorization', `Bearer ${token}`);
    const reto = res.body.retos.find((r: any) => r.id === retoId);
    expect(reto.ranking.map((f: any) => f.usuario.nombre)).toEqual(['Amigo', 'Yo']);
    expect(reto.ranking.every((f: any) => f.completado)).toBe(true);
  });
});
