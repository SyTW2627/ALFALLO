import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { BodyParts, Exercise } from '../models/exercises';
import { connectDB } from '../db/mongoose';
import app from '../app';
import test from 'node:test';

describe('Pruebas de ejercicios (/api/exercises)', ()=>{
  const testExercise = {
    name: "Curl parado con barra",
    description: "Una barra con peso en los extremos, codos pegados al costado y subir y bajar lentamente.",
    bodyPart: BodyParts.BICEPS,
    difficulty: 1,
  };

  beforeAll(async () => {
    await connectDB();
  });

  it('POST /api/exercises - Insertar ejercicio en la base de datos', async() => {
    const res = await request(app)
      .post('/api/exercises')
      .send(testExercise);

    expect(res.status).toBe(201);
  });

  it('POST /api/exercises - Insertar ejercicio ya existente en la base de datos', async() =>{
    const res = await request(app)
      .post('/api/exercises')
      .send(testExercise);
    expect(res.status).toBe(400)
  });

  it('GET /api/exercises - Encontrar ejercicio existente en la base de datos', async() =>{
    const res = await request(app)
      .get('/api/exercises')
      .send('Curl parado con barra');

    expect(res.status).toBe(200);
    // Cuando le devuelva el json, comprueba que en la lista de elementos devuelta, los elementos que conozco sean iguales
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: testExercise.name,
          description: testExercise.description,
          bodyPart: testExercise.bodyPart,
          difficulty: testExercise.difficulty
        })
      ])
    )
  });

  it('GET /api/exercises - Intentar encontrar un ejercicio que no existe', async() => {
    const res = await request(app)
      .get('/api/exercises')
      .send('Doce');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Error al obtener los ejercicios');
  });
})