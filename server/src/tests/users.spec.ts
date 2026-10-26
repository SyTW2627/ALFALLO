import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../models/user';
import { connectDB } from '../db/mongoose';
import { generateToken } from '../utils/jwt';

describe('Pruebas de Gestión de Usuarios (/api/users)', () => {
  let userId = '';
  let token = '';

  const initialUser = {
    name: 'Usuario User Test',
    email: `user_test_${Date.now()}@example.com`,
    password: 'Password123!',
  };

  const updatedName = 'Nombre Actualizado';
  const newPassword = 'NewPassword456!';

  beforeAll(async () => {
    await connectDB();

    // Creamos directamente un usuario en BD
    const user = new User(initialUser);
    await user.save();

    userId = user._id.toString();
    token = generateToken(userId, user.role);
  });

  afterAll(async () => {
    await User.findByIdAndDelete(userId);
    await mongoose.connection.close();
  });

  it('GET /api/users/profile - Denegar acceso si no se envía token', async () => {
    const res = await request(app).get('/api/users/profile');

    expect(res.status).toBe(401);
  });

  it('GET /api/users/profile - Obtener datos del perfil con token válido', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('email', initialUser.email);
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('PUT /api/users/profile - Actualizar el nombre del usuario', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: updatedName, email: initialUser.email });

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('name', updatedName);
  });

  it('PATCH /api/users/change-password - Cambiar la contraseña del usuario', async () => {
    const res = await request(app)
      .patch('/api/users/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: initialUser.password,
        newPassword: newPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Contraseña actualizada correctamente');
  });

  it('DELETE /api/users/account - Eliminar la cuenta del usuario', async () => {
    const res = await request(app)
      .delete('/api/users/account')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Cuenta eliminada con éxito');
  });

  it('GET /api/users/profile - Confirmar que el usuario eliminado devuelve 404', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});