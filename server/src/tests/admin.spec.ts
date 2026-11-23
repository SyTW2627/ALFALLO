import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../models/user';
import { CustomAchievement } from '../models/customAchievement';
import { CustomChallenge } from '../models/customChallenge';
import { Notification } from '../models/notification';
import { connectDB } from '../db/mongoose';
import { generateToken } from '../utils/jwt';

describe('Zona de administración (/api/admin) y notificaciones (/api/notifications)', () => {
  let userId = '';
  let otroId = '';
  let token = '';
  let tokenOtro = '';
  let hitoId = '';
  let retoId = '';
  let notificacionId = '';

  beforeAll(async () => {
    await connectDB();
    const stamp = Date.now();
    const user = await new User({ name: 'Admin Test', email: `admin_${stamp}@example.com`, password: 'Password123!' }).save();
    const otro = await new User({ name: 'Usuario Normal', email: `normal_${stamp}@example.com`, password: 'Password123!' }).save();
    userId = user._id.toString();
    otroId = otro._id.toString();
    token = generateToken(userId, user.role);
    tokenOtro = generateToken(otroId, otro.role);
  });

  afterAll(async () => {
    await CustomAchievement.deleteMany({ createdBy: userId });
    await CustomChallenge.deleteMany({ createdBy: userId });
    await Notification.deleteMany({ createdBy: userId });
    await User.deleteMany({ _id: { $in: [userId, otroId] } });
    await mongoose.connection.close();
  });

  it('Un usuario normal no puede usar el panel', async () => {
    const res = await request(app).get('/api/admin/achievements').set('Authorization', `Bearer ${tokenOtro}`);
    expect(res.status).toBe(403);
  });

  it('POST /api/admin/access - Rechaza una contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/api/admin/access')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'no-es-esta' });
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/access - Con la contraseña correcta pasa a ser administrador', async () => {
    const res = await request(app)
      .post('/api/admin/access')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: process.env.ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('POST /api/admin/achievements - Crea un hito y notifica a todos', async () => {
    const res = await request(app)
      .post('/api/admin/achievements')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Primer entreno (test)', descripcion: 'Termina un entrenamiento.', metrica: 'entrenos', objetivo: 1, notificar: true });
    expect(res.status).toBe(201);
    hitoId = res.body._id;
  });

  it('POST /api/admin/achievements - Valida la métrica', async () => {
    const res = await request(app)
      .post('/api/admin/achievements')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Malo', descripcion: 'x', metrica: 'no-existe', objetivo: 1 });
    expect(res.status).toBe(400);
  });

  it('POST /api/admin/challenges - Un reto de series necesita zonas', async () => {
    const inicio = new Date(Date.now() - 86400000).toISOString();
    const fin = new Date(Date.now() + 7 * 86400000).toISOString();
    const sinZonas = await request(app)
      .post('/api/admin/challenges')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Series de pecho', metrica: 'series', objetivo: 10, inicio, fin });
    expect(sinZonas.status).toBe(400);

    const res = await request(app)
      .post('/api/admin/challenges')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Series de pecho', metrica: 'series', zonas: ['Chest'], objetivo: 10, inicio, fin });
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('en-curso');
    retoId = res.body._id;
  });

  it('GET /api/progress - Los usuarios ven el hito y el reto creados', async () => {
    const res = await request(app).get('/api/progress').set('Authorization', `Bearer ${tokenOtro}`);
    expect(res.status).toBe(200);
    expect(res.body.hitos.some((h: any) => h.key === `custom-${hitoId}`)).toBe(true);
    expect(res.body.retos.some((r: any) => r.key === `custom-${retoId}` && r.tipo === 'especial')).toBe(true);
  });

  it('GET /api/admin/stats - Devuelve el resumen de actividad', async () => {
    const noAdmin = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${tokenOtro}`);
    expect(noAdmin.status).toBe(403);

    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.usuarios.total).toBeGreaterThanOrEqual(2);
    expect(res.body.semanas).toHaveLength(8);
    expect(res.body.retosEspeciales.some((r: any) => r._id === retoId && r.enCurso)).toBe(true);
    expect(res.body.hitos.some((h: any) => h.key === `custom-${hitoId}`)).toBe(true);
    expect(res.body.hitos.some((h: any) => h.key === 'primer-entreno')).toBe(true);
  });

  it('POST /api/admin/notifications - Envía una notificación', async () => {
    const res = await request(app)
      .post('/api/admin/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Hola a todos', mensaje: 'Mensaje de prueba', enlace: '/progreso' });
    expect(res.status).toBe(201);
    notificacionId = res.body._id;
  });

  it('GET /api/notifications - El resto de usuarios la ven como no leída', async () => {
    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${tokenOtro}`);
    expect(res.status).toBe(200);
    expect(res.body.noLeidas).toBeGreaterThan(0);
    expect(res.body.notificaciones.some((n: any) => n._id === notificacionId && n.leida === false)).toBe(true);
  });

  it('POST /api/notifications/read - Las marca como leídas', async () => {
    await request(app).post('/api/notifications/read').set('Authorization', `Bearer ${tokenOtro}`).expect(200);
    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${tokenOtro}`);
    expect(res.body.noLeidas).toBe(0);
  });

  it('Notificación programada: no se ve hasta su fecha y "publicar ahora" la muestra', async () => {
    const manana = new Date(Date.now() + 86400000).toISOString();
    const creada = await request(app)
      .post('/api/admin/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Programada', mensaje: 'Para mañana', publicarEn: manana });
    expect(creada.status).toBe(201);
    expect(creada.body.estado).toBe('programada');
    const id = creada.body._id;

    const antes = await request(app).get('/api/notifications').set('Authorization', `Bearer ${tokenOtro}`);
    expect(antes.body.notificaciones.some((n: any) => n._id === id)).toBe(false);
    expect(antes.body.noLeidas).toBe(0);

    const admin = await request(app).get('/api/admin/notifications').set('Authorization', `Bearer ${token}`);
    expect(admin.body.some((n: any) => n._id === id && n.estado === 'programada')).toBe(true);

    const ahora = await request(app)
      .put(`/api/admin/notifications/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ publicarEn: null });
    expect(ahora.body.estado).toBe('publicada');

    const despues = await request(app).get('/api/notifications').set('Authorization', `Bearer ${tokenOtro}`);
    expect(despues.body.notificaciones.some((n: any) => n._id === id && n.leida === false)).toBe(true);
    expect(despues.body.noLeidas).toBe(1);
  });

  it('DELETE - Elimina el hito, el reto y la notificación', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).delete(`/api/admin/achievements/${hitoId}`).set(auth).expect(200);
    await request(app).delete(`/api/admin/challenges/${retoId}`).set(auth).expect(200);
    await request(app).delete(`/api/admin/notifications/${notificacionId}`).set(auth).expect(200);
  });

  it('POST /api/admin/leave - Vuelve a ser un usuario normal', async () => {
    const res = await request(app).post('/api/admin/leave').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('user');
  });
});
