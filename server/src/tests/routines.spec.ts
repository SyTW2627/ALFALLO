import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { BodyParts, Exercise } from '../models/exercises';
import { Objective, Routine } from '../models/routines';
import { User } from '../models/user';
import { connectDB } from '../db/mongoose';
import app from '../app';
import mongoose from 'mongoose';
import { generateToken } from '../utils/jwt';

describe('Pruebas de rutinas (/api/routines)', () => {
  let userId = '';
  let token = '';
  let exerciseIds: string[] = [];

  const fixtureId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const exerciseFixtures = [
    {
      name: `Curl parado con barra ${fixtureId}`,
      description: 'Una barra con peso en los extremos, codos pegados al costado.',
      bodyPart: BodyParts.BICEPS,
      difficulty: 1,
    },
    {
      name: `Press de banca plano con barra ${fixtureId}`,
      description: 'Tumbado, subir y bajar una barra con peso.',
      bodyPart: BodyParts.CHEST,
      difficulty: 3,
    },
    {
      name: `Sentadilla ${fixtureId}`,
      description: 'Bajar lentamente hasta acabar casi sentado y subir.',
      bodyPart: BodyParts.QUADRICEPS,
      difficulty: 1,
    },
  ];

  const routineInput = (name: string) => ({
    name,
    days: [
      {
        name: 'Día de fuerza',
        objective: Objective.FORCE,
        exercises: [
          {
            exercise: exerciseIds[0],
            sets: 4,
            reps: 6,
            restInSeconds: 240,
          },
        ],
      },
      {
        name: 'Día de hipertrofia',
        objective: Objective.HYPERTROPHY,
        exercises: [
          {
            exercise: exerciseIds[1],
            sets: 3,
            reps: 10,
            restInSeconds: 120,
          },
        ],
      },
    ],
  });

  const createRoutineForUser = async (name: string) => {
    return Routine.create({
      user: userId,
      ...routineInput(name),
    });
  };

  beforeAll(async () => {
    await connectDB();

    const exercises = await Exercise.create(exerciseFixtures);
    exerciseIds = exercises.map((exercise) => exercise._id.toString());

    const user = new User({
      name: 'Usuario Routine Test',
      email: `routine_test_${fixtureId}@example.com`,
      password: 'Password123!',
    });
    await user.save();

    userId = user._id.toString();
    token = generateToken(userId, user.role);
  });

  afterAll(async () => {
    if (userId) {
      await Routine.deleteMany({ user: userId });
      await User.findByIdAndDelete(userId);
    }
    if (exerciseIds.length > 0) {
      await Exercise.deleteMany({ _id: { $in: exerciseIds } });
    }
    await mongoose.connection.close();
  });

  it('POST /api/routines - Crear una nueva rutina', async () => {
    const input = routineInput(`Rutina de prueba ${fixtureId}`);
    const res = await request(app)
      .post('/api/routines')
      .set('Authorization', `Bearer ${token}`)
      .send(input);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: input.name,
      user: userId,
      days: [
        {
          name: 'Día de fuerza',
          objective: Objective.FORCE,
          exercises: [
            {
              sets: 4,
              reps: 6,
              restInSeconds: 240,
              exercise: { name: exerciseFixtures[0].name },
            },
          ],
        },
        {
          name: 'Día de hipertrofia',
          objective: Objective.HYPERTROPHY,
          exercises: [
            {
              sets: 3,
              reps: 10,
              restInSeconds: 120,
              exercise: { name: exerciseFixtures[1].name },
            },
          ],
        },
      ],
    });
  });

  it('GET /api/routines - Obtener todas las rutinas de un usuario', async () => {
    const firstRoutine = await createRoutineForUser(`Rutina A ${fixtureId}`);
    const secondRoutine = await createRoutineForUser(`Rutina B ${fixtureId}`);

    const res = await request(app)
      .get('/api/routines')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: firstRoutine._id.toString() }),
        expect.objectContaining({ _id: secondRoutine._id.toString() }),
      ]),
    );
    expect(res.body[0].days[0].exercises[0].exercise).toHaveProperty(
      'name',
      exerciseFixtures[0].name,
    );
  });

  it('GET /api/routines/:id - Obtener una rutina concreta', async () => {
    const routine = await createRoutineForUser(`Rutina individual ${fixtureId}`);

    const res = await request(app)
      .get(`/api/routines/${routine._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      _id: routine._id.toString(),
      name: routine.name,
      user: userId,
    });
    expect(res.body.days[0].exercises[0].exercise).toHaveProperty(
      'name',
      exerciseFixtures[0].name,
    );
  });

  it('PUT /api/routines/:id - Editar una rutina concreta', async () => {
    const routine = await createRoutineForUser(`Rutina sin editar ${fixtureId}`);
    const updatedDays = [
      {
        name: 'Día de resistencia',
        objective: Objective.RESISTANCE,
        exercises: [
          {
            exercise: exerciseIds[2],
            sets: 3,
            reps: 20,
            restInSeconds: 45,
          },
        ],
      },
    ];

    const res = await request(app)
      .put(`/api/routines/${routine._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Rutina editada ${fixtureId}`, days: updatedDays });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      _id: routine._id.toString(),
      name: `Rutina editada ${fixtureId}`,
      days: [
        {
          name: 'Día de resistencia',
          objective: Objective.RESISTANCE,
          exercises: [
            {
              sets: 3,
              reps: 20,
              restInSeconds: 45,
              exercise: { name: exerciseFixtures[2].name },
            },
          ],
        },
      ],
    });
  });

  it('DELETE /api/routines/:id - Eliminar una rutina de un usuario', async () => {
    const routine = await createRoutineForUser(`Rutina para eliminar ${fixtureId}`);

    const res = await request(app)
      .delete(`/api/routines/${routine._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Rutina eliminada correctamente');
    await expect(Routine.findById(routine._id)).resolves.toBeNull();
  });

  // ---------- Casos de error ----------

  it('GET /api/routines - Sin token devuelve 401', async () => {
    const res = await request(app).get('/api/routines');

    expect(res.status).toBe(401);
  });

  it('GET /api/routines/:id - Un id con formato no válido devuelve 400', async () => {
    const res = await request(app)
      .get('/api/routines/no-es-un-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('GET /api/routines/:id - No se puede ver la rutina de otro usuario (404)', async () => {
    const routine = await createRoutineForUser(`Rutina privada ${fixtureId}`);
    const otherUser = await new User({
      name: 'Otro usuario Routine Test',
      email: `routine_other_${fixtureId}@example.com`,
      password: 'Password123!',
    }).save();

    try {
      const otherToken = generateToken(otherUser._id.toString(), otherUser.role);
      const res = await request(app)
        .get(`/api/routines/${routine._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    } finally {
      await User.findByIdAndDelete(otherUser._id);
    }
  });

  it('PUT /api/routines/:id - Rechaza valores fuera del rango del objetivo (400)', async () => {
    const routine = await createRoutineForUser(`Rutina fuera de rango ${fixtureId}`);

    const res = await request(app)
      .put(`/api/routines/${routine._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        days: [
          {
            name: 'Día de fuerza',
            objective: Objective.FORCE,
            // En fuerza las repeticiones van de 4 a 8: 15 no es válido
            exercises: [{ exercise: exerciseIds[0], sets: 4, reps: 15, restInSeconds: 240 }],
          },
        ],
      });

    expect(res.status).toBe(400);

    // La rutina guardada no ha cambiado
    const saved = await Routine.findById(routine._id);
    expect(saved?.days[0].exercises[0].reps).toBe(6);
  });

  it('DELETE /api/routines/:id - Borrar una rutina que no existe devuelve 404', async () => {
    const res = await request(app)
      .delete(`/api/routines/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});