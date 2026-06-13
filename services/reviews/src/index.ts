import express from 'express';
import cors from 'cors';
import { PORT } from './config/env';
import { db, checkPostgresConnection } from './db/postgres';
import { requestLogger, logger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import reviewsRouter from './routes/reviews';
import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: { title: 'Reviews Service API', version: '1.0.0', description: 'Reseñas y calificaciones de propiedades' },
  paths: {
    '/reviews': {
      post: {
        summary: 'Crear reseña',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateReviewDto' } } } },
        responses: { '201': { description: 'Reseña creada' }, '422': { description: 'Error de validación' } },
      },
      get: {
        summary: 'Listar reseñas de una propiedad',
        parameters: [{ name: 'propertyId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Lista de reseñas en orden descendente' } },
      },
    },
    '/reviews/ratings/{propertyId}': {
      get: {
        summary: 'Obtener star rating de una propiedad',
        parameters: [{ name: 'propertyId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Rating de la propiedad' } },
      },
    },
    '/health': {
      get: { summary: 'Health check', responses: { '200': { description: 'Servicio saludable' }, '503': { description: 'Base de datos no disponible' } } },
    },
  },
  components: {
    schemas: {
      CreateReviewDto: {
        type: 'object',
        required: ['propertyId', 'guestName', 'score', 'comment'],
        properties: {
          propertyId: { type: 'string', format: 'uuid' },
          guestName: { type: 'string', maxLength: 255 },
          score: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string', minLength: 1 },
        },
      },
    },
  },
};

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/reviews', reviewsRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', async (_req, res) => {
  try {
    await checkPostgresConnection();
    res.status(200).json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', reason: 'database unavailable' });
  }
});

app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await db.migrate.latest();
    logger.info('Migraciones PostgreSQL aplicadas');

    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Reviews Service escuchando');
    });
  } catch (err) {
    logger.error({ err }, 'Error al iniciar el servicio');
    process.exit(1);
  }
}

void start();

export { app };
