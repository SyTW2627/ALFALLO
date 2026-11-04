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

  afterAll(async () => {
    await User.deleteOne({ email: testUser.email });
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
});