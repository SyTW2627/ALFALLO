import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../models/user';
import { connectDB } from '../db/mongoose';

describe('Pruebas de Autenticación (/api/auth)', () => {
  const testUser = {
    name: 'Usuario Auth Test',
    email: `auth_test_${Date.now()}@example.com`,
    password: 'Password123!',
  };

  beforeAll(async () => {
    await connectDB();
  });

  const otroEmail = `auth_limite_${Date.now()}@example.com`;

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [testUser.email, otroEmail, `corta_${testUser.email}`] } });
    await mongoose.connection.close();
  });

  it('POST /api/auth/register - Registrar un nuevo usuario correctamente', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', testUser.email);
  });

  it('POST /api/auth/register - Rechazar registro con email duplicado', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'El correo electrónico ya está registrado');
  });

  it('POST /api/auth/login - Iniciar sesión correctamente con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('POST /api/auth/login - Rechazar inicio de sesión con contraseña errónea', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Credenciales inválidas');
  });

  it('POST /api/auth/login - El email no distingue mayúsculas ni espacios', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: `  ${testUser.email.toUpperCase()} `, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('POST /api/auth/register - Email repetido con otras mayúsculas → 400 (no 500)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, email: testUser.email.toUpperCase() });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'El correo electrónico ya está registrado');
  });

  it('POST /api/auth/register - Contraseña demasiado corta → 400 con el motivo', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Corta', email: `corta_${testUser.email}`, password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/al menos 6 caracteres/);
  });

  it('POST /api/auth/login - Rechaza operadores de MongoDB en lugar de textos', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password: testUser.password });

    expect(res.status).toBe(400);
    expect(res.body).not.toHaveProperty('token');
  });

  it('POST /api/auth/login - Bloquea tras demasiados intentos fallidos', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Límite', email: otroEmail, password: 'Password123!' });

    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/login').send({ email: otroEmail, password: 'mal' });
    }
    // Ni siquiera la contraseña correcta entra mientras dura el bloqueo
    const res = await request(app).post('/api/auth/login').send({ email: otroEmail, password: 'Password123!' });
    expect(res.status).toBe(429);
  });

  it('JSON mal formado → 400 en JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('Ruta de la API inexistente → 404 en JSON', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'Ruta no encontrada');
  });
});
