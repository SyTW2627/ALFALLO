import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../models/user';
import { Exercise, BodyParts } from '../models/exercises';
import { Workout, WorkoutStatus } from '../models/workout';
import { Versus } from '../models/versus';
import { Notification } from '../models/notification';
import { connectDB } from '../db/mongoose';
import { generateToken } from '../utils/jwt';
import { ganadorDe, mejorMarcaEnDuelo } from '../versus/engine';

const DAY = 86400000;

/* ---------- Motor (funciones puras) ---------- */

describe('Versus: motor', () => {
  const banca = (kg: number, reps: number, dias: number) => ({
    id: `w${kg}_${reps}_${dias}`,
    startedAt: new Date(Date.UTC(2026, 0, dias)),
    finishedAt: new Date(Date.UTC(2026, 0, dias)),
    exercises: [{ id: 'e', name: 'Press de banca', bodyPart: 'chest', rankingKey: 'bench', sets: [{ reps, weightKg: kg }] }],
  });
  const inicio = new Date(Date.UTC(2026, 0, 10));
  const fin = new Date(Date.UTC(2026, 0, 17));

  it('Solo cuentan las marcas dentro del duelo', () => {
    const m = mejorMarcaEnDuelo([banca(200, 1, 5), banca(100, 1, 12)], [], 'bench', 'kg', inicio, fin);
    expect(m?.e1rm).toBe(100);
  });

  it('Descarta un salto imposible respecto a la marca previa (error al teclear)', () => {
    const m = mejorMarcaEnDuelo([banca(80, 1, 5), banca(800, 1, 12), banca(85, 1, 13)], [], 'bench', 'kg', inicio, fin);
    expect(m?.kg).toBe(85);
  });

  it('Por fuerza relativa gana quien levanta más en proporción a su peso', () => {
    const ligero = mejorMarcaEnDuelo([banca(100, 1, 12)], [{ kg: 60, date: new Date(Date.UTC(2026, 0, 1)) }], 'bench', 'relativa', inicio, fin);
    const pesado = mejorMarcaEnDuelo([banca(120, 1, 12)], [{ kg: 100, date: new Date(Date.UTC(2026, 0, 1)) }], 'bench', 'relativa', inicio, fin);
    expect(ganadorDe(ligero, pesado, 'relativa')).toBe('retador');
    expect(ganadorDe(ligero, pesado, 'kg')).toBe('rival');
    expect(ganadorDe(null, null, 'kg')).toBeNull();
  });
});

/* ---------- API ---------- */

describe('Versus (/api/versus)', () => {
  const ids: string[] = [];
  let yo = '';
  let amigo = '';
  let desconocido = '';
  let tokenYo = '';
  let tokenAmigo = '';
  let ejercicioId = '';
  let dueloId = '';

  beforeAll(async () => {
    await connectDB();
    const stamp = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const usuarios = await User.create([
      { name: 'Yo', email: `vs_yo_${stamp}@example.com`, password: 'Password123!', bodyWeights: [{ kg: 70 }] },
      { name: 'Amigo', email: `vs_amigo_${stamp}@example.com`, password: 'Password123!', bodyWeights: [{ kg: 90 }] },
      { name: 'Desconocido', email: `vs_otro_${stamp}@example.com`, password: 'Password123!' },
    ]);
    ids.push(...usuarios.map((u) => u._id.toString()));
    [yo, amigo, desconocido] = ids;
    await User.updateOne({ _id: yo }, { following: [amigo] });
    await User.updateOne({ _id: amigo }, { following: [yo] });
    tokenYo = generateToken(yo, 'user');
    tokenAmigo = generateToken(amigo, 'user');

    const ejercicio = await Exercise.create({
      name: `Press de banca versus ${stamp}`,
      description: 'Para el test',
      bodyPart: BodyParts.CHEST,
      difficulty: 2,
      rankingKey: 'bench',
    });
    ejercicioId = ejercicio._id.toString();
  });

  afterAll(async () => {
    await Versus.deleteMany({ $or: [{ retador: { $in: ids } }, { rival: { $in: ids } }] });
    await Notification.deleteMany({ destinatario: { $in: ids } });
    await Workout.deleteMany({ user: { $in: ids } });
    await Exercise.findByIdAndDelete(ejercicioId);
    await User.deleteMany({ _id: { $in: ids } });
    await mongoose.connection.close();
  });

  const entreno = (user: string, kg: number, haceMin: number) => ({
    user,
    title: 'Torso',
    status: WorkoutStatus.FINISHED,
    startedAt: new Date(Date.now() - (haceMin + 30) * 60000),
    finishedAt: new Date(Date.now() - haceMin * 60000),
    exercises: [{ exercise: ejercicioId, sets: [{ reps: 1, weightKg: kg }] }],
  });

  it('No se puede retar a alguien a quien no sigues', async () => {
    const res = await request(app)
      .post('/api/versus')
      .set('Authorization', `Bearer ${tokenYo}`)
      .send({ rival: desconocido, ejercicio: 'bench' });
    expect(res.status).toBe(403);
  });

  it('Valida ejercicio y duración', async () => {
    const malEjercicio = await request(app).post('/api/versus').set('Authorization', `Bearer ${tokenYo}`).send({ rival: amigo, ejercicio: 'curl' });
    expect(malEjercicio.status).toBe(400);
    const malDias = await request(app).post('/api/versus').set('Authorization', `Bearer ${tokenYo}`).send({ rival: amigo, ejercicio: 'bench', dias: 5 });
    expect(malDias.status).toBe(400);
  });

  it('Crea un versus pendiente y avisa al rival', async () => {
    const res = await request(app)
      .post('/api/versus')
      .set('Authorization', `Bearer ${tokenYo}`)
      .send({ rival: amigo, ejercicio: 'bench', modalidad: 'relativa', dias: 7, mensaje: 'A ver qué tienes' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ estado: 'pendiente', soyRetador: true, modalidad: 'relativa', marcador: null });
    dueloId = res.body.id;

    const aviso = await Notification.findOne({ destinatario: amigo, tipo: 'versus' });
    expect(aviso?.titulo).toMatch(/te reta/);

    const repetido = await request(app).post('/api/versus').set('Authorization', `Bearer ${tokenYo}`).send({ rival: amigo, ejercicio: 'bench' });
    expect(repetido.status).toBe(409);
  });

  it('Solo el rival puede aceptarlo; al aceptar empieza el marcador', async () => {
    const yoAcepto = await request(app).post(`/api/versus/${dueloId}/accept`).set('Authorization', `Bearer ${tokenYo}`);
    expect(yoAcepto.status).toBe(403);

    const res = await request(app).post(`/api/versus/${dueloId}/accept`).set('Authorization', `Bearer ${tokenAmigo}`);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('activo');
    expect(new Date(res.body.fin).getTime() - new Date(res.body.inicio).getTime()).toBe(7 * DAY);

    const cancelar = await request(app).delete(`/api/versus/${dueloId}`).set('Authorization', `Bearer ${tokenYo}`);
    expect(cancelar.status).toBe(409);
  });

  it('Por fuerza relativa, 80 kg con 70 kg de peso gana a 90 kg con 90 kg', async () => {
    // Los entrenamientos se terminan "ahora", después de aceptar el versus
    await Workout.create([entreno(yo, 80, 0), entreno(amigo, 90, 0)]);
    const res = await request(app).get('/api/versus').set('Authorization', `Bearer ${tokenYo}`);
    expect(res.status).toBe(200);
    const d = res.body.duelos.find((x: any) => x.id === dueloId);
    expect(d.marcador.retador).toMatchObject({ e1rm: 80, ratio: 1.14 });
    expect(d.marcador.rival).toMatchObject({ e1rm: 90, ratio: 1 });
    expect(d.marcador.ganador).toBe('retador');
    expect(res.body.amigos).toEqual([{ id: amigo, nombre: 'Amigo', mutuo: true }]);
  });

  it('Al pasar la fecha de fin se cierra, se congela el resultado y se avisa a los dos', async () => {
    // Se adelanta el reloj: empezó hace un día, terminó hace 1 s y los entrenamientos fueron hace 5 s
    await Versus.updateOne({ _id: dueloId }, { inicio: new Date(Date.now() - DAY), fin: new Date(Date.now() - 1000) });
    await Workout.updateMany({ user: { $in: [yo, amigo] } }, { finishedAt: new Date(Date.now() - 5000) });
    const res = await request(app).get('/api/versus').set('Authorization', `Bearer ${tokenAmigo}`);
    const d = res.body.duelos.find((x: any) => x.id === dueloId);
    expect(d.estado).toBe('terminado');
    expect(d.marcador.ganador).toBe('retador');

    const avisos = await Notification.find({ clave: `versus:${dueloId}:fin` });
    expect(avisos.map((a) => String(a.destinatario)).sort()).toEqual([yo, amigo].sort());
    expect(avisos.find((a) => String(a.destinatario) === yo)?.titulo).toMatch(/Has ganado/);
  });

  it('El rival puede rechazar y el retador retirar uno pendiente', async () => {
    const a = await request(app).post('/api/versus').set('Authorization', `Bearer ${tokenYo}`).send({ rival: amigo, ejercicio: 'squat' });
    const rechazo = await request(app).post(`/api/versus/${a.body.id}/decline`).set('Authorization', `Bearer ${tokenAmigo}`);
    expect(rechazo.body.estado).toBe('rechazado');

    const b = await request(app).post('/api/versus').set('Authorization', `Bearer ${tokenYo}`).send({ rival: amigo, ejercicio: 'squat' });
    const retiro = await request(app).delete(`/api/versus/${b.body.id}`).set('Authorization', `Bearer ${tokenYo}`);
    expect(retiro.body.estado).toBe('cancelado');
  });

  it('Cara a cara: solo entre amigos y sin revelar el peso corporal', async () => {
    const noAmigo = await request(app).get(`/api/versus/head-to-head/${desconocido}`).set('Authorization', `Bearer ${tokenYo}`);
    expect(noAmigo.status).toBe(403);

    const res = await request(app).get(`/api/versus/head-to-head/${amigo}`).set('Authorization', `Bearer ${tokenYo}`);
    expect(res.status).toBe(200);
    const banca = res.body.ejercicios.find((e: any) => e.key === 'bench');
    expect(banca).toMatchObject({ ganadorKg: 'rival', ganadorRelativa: 'yo' });
    expect(res.body.resumen.kg).toMatchObject({ yo: 0, rival: 1 });
    expect(JSON.stringify(res.body)).not.toMatch(/bodyWeight|pesoCorporal/);
  });
});
