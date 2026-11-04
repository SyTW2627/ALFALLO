import path from 'path';
import { Express, Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { BodyParts } from '../models/exercises';
import { Objective } from '../models/routines';
import { WorkoutStatus } from '../models/workout';

const PORT = process.env.PORT || 3000;

// Definición base de la especificación OpenAPI.
// Los endpoints se documentan con comentarios @openapi en cada fichero de src/routes.
const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'AlFallo API',
            version: '1.0.0',
            description: 'Documentación de la API REST de AlFallo - Fitness App',
        },
        servers: [{ url: `http://localhost:${PORT}`, description: 'Servidor local' }],
        tags: [
            { name: 'Health', description: 'Estado de la API' },
            { name: 'Auth', description: 'Registro e inicio de sesión' },
            { name: 'Users', description: 'Perfil del usuario autenticado' },
            { name: 'Exercises', description: 'Catálogo de ejercicios' },
            { name: 'Routines', description: 'Rutinas del usuario' },
            { name: 'Workouts', description: 'Entrenamientos en curso e historial' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
            responses: {
                Unauthorized: {
                    description: 'No se proporcionó un token válido',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } },
                },
                Forbidden: {
                    description: 'Token inválido o expirado',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } },
                },
            },
            schemas: {
                Message: {
                    type: 'object',
                    properties: { message: { type: 'string' } },
                },
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '665f1c2e8b3e4a0012345678' },
                        name: { type: 'string', example: 'Iker' },
                        email: { type: 'string', format: 'email', example: 'iker@example.com' },
                        role: { type: 'string', enum: ['user', 'admin'] },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        token: { type: 'string' },
                        user: { $ref: '#/components/schemas/User' },
                    },
                },
                Exercise: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', example: 'Press de banca' },
                        description: { type: 'string', example: 'Empuje horizontal con barra' },
                        bodyPart: { type: 'string', enum: Object.values(BodyParts) },
                        difficulty: { type: 'integer', minimum: 1, maximum: 5, example: 3 },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                ExerciseInput: {
                    type: 'object',
                    required: ['name', 'description', 'bodyPart', 'difficulty'],
                    properties: {
                        name: { type: 'string', example: 'Press de banca' },
                        description: { type: 'string', example: 'Empuje horizontal con barra' },
                        bodyPart: { type: 'string', enum: Object.values(BodyParts) },
                        difficulty: { type: 'integer', minimum: 1, maximum: 5, example: 3 },
                    },
                },
                RoutineExerciseInput: {
                    type: 'object',
                    required: ['exercise'],
                    description: 'Si se omiten sets, reps o restInSeconds se usan los valores por defecto del objetivo',
                    properties: {
                        exercise: { type: 'string', description: 'Id del ejercicio del catálogo' },
                        sets: { type: 'integer', example: 4 },
                        reps: { type: 'integer', example: 6 },
                        restInSeconds: { type: 'integer', example: 240 },
                    },
                },
                RoutineDayInput: {
                    type: 'object',
                    required: ['name', 'objective', 'exercises'],
                    properties: {
                        name: { type: 'string', example: 'Torso' },
                        objective: { type: 'string', enum: Object.values(Objective) },
                        exercises: {
                            type: 'array',
                            minItems: 1,
                            items: { $ref: '#/components/schemas/RoutineExerciseInput' },
                        },
                    },
                },
                RoutineInput: {
                    type: 'object',
                    required: ['name', 'days'],
                    properties: {
                        name: { type: 'string', example: 'Torso / Pierna' },
                        days: {
                            type: 'array',
                            minItems: 1,
                            maxItems: 7,
                            items: { $ref: '#/components/schemas/RoutineDayInput' },
                        },
                    },
                },
                Routine: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        user: { type: 'string' },
                        name: { type: 'string' },
                        days: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: { type: 'string' },
                                    name: { type: 'string' },
                                    objective: { type: 'string', enum: Object.values(Objective) },
                                    exercises: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                exercise: { $ref: '#/components/schemas/Exercise' },
                                                sets: { type: 'integer' },
                                                reps: { type: 'integer' },
                                                restInSeconds: { type: 'integer' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Set: {
                    type: 'object',
                    required: ['reps', 'weightKg'],
                    properties: {
                        reps: { type: 'integer', minimum: 1, example: 8 },
                        weightKg: { type: 'number', minimum: 0, example: 80 },
                    },
                },
                WorkoutExerciseInput: {
                    type: 'object',
                    required: ['exercise'],
                    properties: {
                        exercise: { type: 'string', description: 'Id del ejercicio del catálogo' },
                        sets: { type: 'array', items: { $ref: '#/components/schemas/Set' } },
                    },
                },
                Workout: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        user: { type: 'string' },
                        title: { type: 'string', example: 'Torso' },
                        objective: { type: 'string', enum: Object.values(Objective) },
                        status: { type: 'string', enum: Object.values(WorkoutStatus) },
                        startedAt: { type: 'string', format: 'date-time' },
                        finishedAt: { type: 'string', format: 'date-time' },
                        exercises: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    exercise: { $ref: '#/components/schemas/Exercise' },
                                    sets: { type: 'array', items: { $ref: '#/components/schemas/Set' } },
                                },
                            },
                        },
                        notes: { type: 'string' },
                        durationMinutes: { type: 'integer', nullable: true, example: 64 },
                        totalSets: { type: 'integer', example: 18 },
                        totalVolumeKg: { type: 'number', example: 6240 },
                    },
                },
            },
        },
    },
    // Se leen tanto .ts (desarrollo con tsx) como .js (build en dist/)
    apis: [path.join(__dirname, '../routes/*.{ts,js}'), path.join(__dirname, '../app.{ts,js}')],
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
    // Interfaz visual de la documentación
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Especificación en JSON (útil para Postman, generadores de clientes, etc.)
    app.get('/api-docs.json', (_req: Request, res: Response) => {
        res.json(swaggerSpec);
    });
};