import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import app from '../app';
import { User } from '../models/user';
import { Post } from '../models/post';
import { Report } from '../models/report';
import { connectDB } from '../db/mongoose';
import { generateToken } from '../utils/jwt';

describe('Moderación del feed (reportes)', () => {
  const ids: string[] = [];
  let tokenAutor = '';
  let tokenOtro = '';
  let tokenAdmin = '';
  let postId = '';
  let otroPostId = '';
  let commentId = '';

  beforeAll(async () => {
    await connectDB();
    const stamp = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const [autor, otro, admin] = await User.create([
      { name: 'Autor', email: `mod_autor_${stamp}@example.com`, password: 'Password123!' },
      { name: 'Otro', email: `mod_otro_${stamp}@example.com`, password: 'Password123!' },
      { name: 'Admin', email: `mod_admin_${stamp}@example.com`, password: 'Password123!', role: 'admin' },
    ]);
    ids.push(...[autor, otro, admin].map((u) => u._id.toString()));
    tokenAutor = generateToken(ids[0], 'user');
    tokenOtro = generateToken(ids[1], 'user');
    tokenAdmin = generateToken(ids[2], 'admin');

    // El entrenamiento no hace falta para moderar: basta con un id.
    const post = await Post.create({
      user: autor._id,
      workout: new Types.ObjectId(),
      caption: 'Texto inapropiado',
      comments: [{ user: otro._id, text: 'Comentario ofensivo' }],
    });
    const otroPost = await Post.create({ user: autor._id, workout: new Types.ObjectId(), caption: 'Otro post' });
    postId = post._id.toString();
    otroPostId = otroPost._id.toString();
    commentId = post.comments[0]._id.toString();
  });

  afterAll(async () => {
    await Report.deleteMany({ reportadoPor: { $in: ids } });
    await Post.deleteMany({ user: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
    await mongoose.connection.close();
  });

  it('POST /api/posts/:id/report - Un usuario reporta una publicación', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/report`)
      .set('Authorization', `Bearer ${tokenOtro}`)
      .send({ motivo: 'ofensivo', detalle: 'Insulta' });
    expect(res.status).toBe(201);
  });

  it('No se puede reportar dos veces lo mismo', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/report`)
      .set('Authorization', `Bearer ${tokenOtro}`)
      .send({ motivo: 'spam' });
    expect(res.status).toBe(409);
  });

  it('No se puede reportar el contenido propio ni con un motivo inventado', async () => {
    const propio = await request(app)
      .post(`/api/posts/${postId}/report`)
      .set('Authorization', `Bearer ${tokenAutor}`)
      .send({ motivo: 'spam' });
    expect(propio.status).toBe(400);

    const motivo = await request(app)
      .post(`/api/posts/${otroPostId}/report`)
      .set('Authorization', `Bearer ${tokenOtro}`)
      .send({ motivo: 'me-cae-mal' });
    expect(motivo.status).toBe(400);
  });

  it('POST /api/posts/:id/comments/:commentId/report - Se reporta un comentario', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/comments/${commentId}/report`)
      .set('Authorization', `Bearer ${tokenAutor}`)
      .send({ motivo: 'acoso' });
    expect(res.status).toBe(201);
  });

  it('GET /api/admin/reports - El administrador ve los reportes agrupados', async () => {
    const noAdmin = await request(app).get('/api/admin/reports').set('Authorization', `Bearer ${tokenOtro}`);
    expect(noAdmin.status).toBe(403);

    const res = await request(app).get('/api/admin/reports').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    const delPost = res.body.find((g: any) => g.post === postId && g.comment === null);
    const delComentario = res.body.find((g: any) => g.comment === commentId);
    expect(delPost).toMatchObject({ tipo: 'publicacion', total: 1, existe: true, contenido: 'Texto inapropiado' });
    expect(delComentario).toMatchObject({ tipo: 'comentario', total: 1, existe: true });
  });

  it('POST /api/admin/reports/resolve - Eliminar un comentario reportado', async () => {
    const res = await request(app)
      .post('/api/admin/reports/resolve')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ post: postId, comment: commentId, accion: 'eliminar' });
    expect(res.status).toBe(200);

    const post = await Post.findById(postId);
    expect(post?.comments.id(commentId)).toBeNull();
    expect(await Report.countDocuments({ comment: commentId, estado: 'eliminado' })).toBe(1);
  });

  it('DELETE /api/posts/:id - Un administrador puede borrar una publicación ajena', async () => {
    const otro = await request(app).delete(`/api/posts/${postId}`).set('Authorization', `Bearer ${tokenOtro}`);
    expect(otro.status).toBe(404);

    const res = await request(app).delete(`/api/posts/${postId}`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    expect(await Post.findById(postId)).toBeNull();
    // Sus reportes pendientes quedan resueltos.
    expect(await Report.countDocuments({ post: postId, estado: 'pendiente' })).toBe(0);
  });

  it('Descartar reportes deja el contenido', async () => {
    await request(app)
      .post(`/api/posts/${otroPostId}/report`)
      .set('Authorization', `Bearer ${tokenOtro}`)
      .send({ motivo: 'spam' })
      .expect(201);

    const res = await request(app)
      .post('/api/admin/reports/resolve')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ post: otroPostId, accion: 'descartar' });
    expect(res.status).toBe(200);
    expect(res.body.actualizados).toBe(1);
    expect(await Post.findById(otroPostId)).not.toBeNull();

    const resueltos = await request(app).get('/api/admin/reports?estado=resuelto').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(resueltos.body.some((g: any) => g.post === otroPostId && g.estado === 'descartado')).toBe(true);
  });
});
