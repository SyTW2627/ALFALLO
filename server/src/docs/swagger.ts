import path from 'path';
import { Express, Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

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