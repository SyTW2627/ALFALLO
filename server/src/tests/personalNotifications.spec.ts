import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import app from '../app';
import { User } from '../models/user';
import { Post } from '../models/post';
import { Notification } from '../models/notification';
import { connectDB } from '../db/mongoose';
import { generateToken } from '../utils/jwt';
import { avisarRetosCasi } from '../notifications/personal';

describe('Notificaciones personales', () => {
  const ids: string[] = [];
  let tokenAna = '';
  let tokenPablo = '';
  let postId = '';

  const deAna = async () =>
    (await request(app).get('/api/notifications').set('Authorization', `Bearer ${tokenAna}`)).body.notificaciones.filter(
      (n: any) => n.tipo !== 'aviso' && n.tipo !== 'hito' && n.tipo !== 'reto'
    );

  beforeAll(async () => {
    await connectDB();
    const stamp = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const [ana, pablo] = await User.create([
      { name: 'Ana', email: `pn_ana_${stamp}@example.com`, password: 'Password123!' },
      { name: 'Pablo', email: `pn_pablo_${stamp}@example.com`, password: 'Password123!' },
    ]);
    ids.push(ana._id.toString(), pablo._id.toString());
    tokenAna = generateToken(ids[0], 'user');
    tokenPablo = generateToken(ids[1], 'user');
    const post = await Post.create({ user: ana._id, workout: new Types.ObjectId(), caption: 'Pierna' });
    postId = post._id.toString();
  });

  afterAll(async () => {
    await Notification.deleteMany({ destinatario: { $in: ids } });
    await Post.deleteMany({ user: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
    await mongoose.connection.close();
  });

  it('Dar ánimos avisa al autor una sola vez aunque se quiten y se vuelvan a dar', async () => {
    const auth = { Authorization: `Bearer ${tokenPablo}` };
    await request(app).post(`/api/posts/${postId}/kudos`).set(auth).expect(200);
    await request(app).delete(`/api/posts/${postId}/kudos`).set(auth).expect(200);
    await request(app).post(`/api/posts/${postId}/kudos`).set(auth).expect(200);

    const avisos = (await deAna()).filter((n: any) => n.tipo === 'kudos');
    expect(avisos).toHaveLength(1);
    expect(avisos[0].titulo).toBe('Pablo te ha dado ánimos');
    expect(avisos[0].leida).toBe(false);
  });

  it('Darte ánimos a ti mismo no genera aviso', async () => {
    await request(app).post(`/api/posts/${postId}/kudos`).set('Authorization', `Bearer ${tokenAna}`).expect(200);
    expect((await deAna()).filter((n: any) => n.tipo === 'kudos')).toHaveLength(1);
  });

  it('Comentar y seguir avisan al otro usuario', async () => {
    const auth = { Authorization: `Bearer ${tokenPablo}` };
    await request(app).post(`/api/posts/${postId}/comments`).set(auth).send({ text: '¡Qué máquina!' }).expect(201);
    await request(app).post(`/api/users/${ids[0]}/follow`).set(auth).expect(200);

    const avisos = await deAna();
    expect(avisos.some((n: any) => n.tipo === 'comentario' && n.mensaje.includes('Qué máquina'))).toBe(true);
    expect(avisos.some((n: any) => n.tipo === 'seguidor' && n.titulo === 'Pablo te sigue' && n.enlace.includes(ids[1]))).toBe(true);
  });

  it('Las notificaciones personales solo las ve su destinatario', async () => {
    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${tokenPablo}`);
    expect(res.body.notificaciones.some((n: any) => ['kudos', 'comentario', 'seguidor'].includes(n.tipo))).toBe(false);
  });

  it('Avisa una vez cuando falta poco para un reto', async () => {
    const reto = { key: `test-${Date.now()}`, titulo: 'Haz 20 series de pierna', unidad: 'series', objetivo: 20, actual: 18, completado: false };
    await avisarRetosCasi(ids[0], [reto, { ...reto, key: 'lejos', actual: 3 }]);
    await avisarRetosCasi(ids[0], [reto]);

    const casi = (await deAna()).filter((n: any) => n.tipo === 'progreso');
    expect(casi).toHaveLength(1);
    expect(casi[0].mensaje).toBe('Te has quedado a 2 series del reto «Haz 20 series de pierna».');
  });

  it('Al borrar la publicación desaparecen sus avisos de ánimos y comentarios', async () => {
    await request(app).delete(`/api/posts/${postId}`).set('Authorization', `Bearer ${tokenAna}`).expect(200);
    const avisos = await deAna();
    expect(avisos.some((n: any) => n.tipo === 'kudos' || n.tipo === 'comentario')).toBe(false);
    expect(avisos.some((n: any) => n.tipo === 'seguidor')).toBe(true);
  });
});
