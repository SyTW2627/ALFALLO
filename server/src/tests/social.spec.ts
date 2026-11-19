import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { User } from '../models/user';
import { connectDB } from '../db/mongoose';
import app from '../app';
import { generateToken } from '../utils/jwt';

describe('Seguidores y perfil público (/api/users/:id)', () => {
  const fixtureId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  let aliceId = '';
  let aliceToken = '';
  let bobId = '';
  let bobToken = '';

  beforeAll(async () => {
    await connectDB();
    const [alice, bob] = await User.create([
      { name: 'Alice Social', email: `alice_${fixtureId}@example.com`, password: 'Password123!' },
      { name: 'Bob Social', email: `bob_${fixtureId}@example.com`, password: 'Password123!' },
    ]);
    aliceId = alice._id.toString();
    bobId = bob._id.toString();
    aliceToken = generateToken(aliceId, alice.role);
    bobToken = generateToken(bobId, bob.role);
  });

  afterAll(async () => {
    await User.deleteMany({ _id: { $in: [aliceId, bobId] } });
    await mongoose.connection.close();
  });

  it('POST /api/users/:id/follow - Seguir a otro usuario', async () => {
    const res = await request(app)
      .post(`/api/users/${bobId}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ following: true, followersCount: 1 });
  });

  it('POST /api/users/:id/follow - Seguir dos veces no duplica', async () => {
    const res = await request(app)
      .post(`/api/users/${bobId}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body.followersCount).toBe(1);
  });

  it('GET /api/users/:id/followers y /following - Listas de seguidores y seguidos', async () => {
    const followers = await request(app)
      .get(`/api/users/${bobId}/followers`)
      .set('Authorization', `Bearer ${aliceToken}`);
    const following = await request(app)
      .get(`/api/users/${aliceId}/following`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(followers.status).toBe(200);
    expect(followers.body).toEqual([expect.objectContaining({ _id: aliceId, name: 'Alice Social' })]);
    expect(following.status).toBe(200);
    expect(following.body).toEqual([expect.objectContaining({ _id: bobId, name: 'Bob Social' })]);
  });

  it('GET /api/users/:id - Perfil público con estadísticas y sin datos privados', async () => {
    const res = await request(app)
      .get(`/api/users/${bobId}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ _id: bobId, name: 'Bob Social' });
    expect(res.body.user).not.toHaveProperty('email');
    expect(res.body.user).not.toHaveProperty('password');
    expect(res.body.stats).toEqual({ workouts: 0, posts: 0, followers: 1, following: 0 });
    expect(res.body.isFollowing).toBe(true);
    expect(res.body.isMe).toBe(false);
    expect(res.body.posts).toEqual([]);
  });

  it('GET /api/users/:id - Desde la otra cuenta no aparece como seguido', async () => {
    const res = await request(app)
      .get(`/api/users/${aliceId}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isFollowing).toBe(false);
    expect(res.body.stats.following).toBe(1);
  });

  it('DELETE /api/users/:id/follow - Dejar de seguir', async () => {
    const res = await request(app)
      .delete(`/api/users/${bobId}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ following: false, followersCount: 0 });
  });

  it('POST /api/users/:id/follow - No puedes seguirte a ti mismo (400)', async () => {
    const res = await request(app)
      .post(`/api/users/${aliceId}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(400);
  });

  it('POST /api/users/:id/follow - Usuario inexistente (404) e id no válido (400)', async () => {
    const inexistente = new mongoose.Types.ObjectId().toString();
    const r404 = await request(app)
      .post(`/api/users/${inexistente}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`);
    const r400 = await request(app)
      .get('/api/users/no-es-un-id')
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(r404.status).toBe(404);
    expect(r400.status).toBe(400);
  });

  it('GET /api/users/profile - Sigue funcionando (no lo captura /:id)', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(`alice_${fixtureId}@example.com`);
  });

  it('GET /api/users/:id - Sin token devuelve 401', async () => {
    const res = await request(app).get(`/api/users/${bobId}`);
    expect(res.status).toBe(401);
  });
});