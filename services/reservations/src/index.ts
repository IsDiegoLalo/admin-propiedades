import express from 'express';
import cors from 'cors';
import { PORT } from './config/env';
import { db, checkPostgresConnection } from './db/postgres';
import { requestLogger, logger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import bookingsRouter from './routes/bookings';
import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: { title: 'Reservations Service API', version: '1.0.0', description: 'Reservas y pagos simulados' },
  paths: {
    '/bookings': {
      post: {
        summary: 'Crear reserva (atómica con pago)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateBookingDto' } } } },
        responses: {
          '201': { description: 'Reserva creada y pago confirmado', content: { 'application/json': { schema: { $ref: '#/components/schemas/BookingResponseDto' } } } },
          '402': { description: 'Pago rechazado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Fechas solapadas', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '422': { description: 'Error de validación', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
        },
      },
      get: {
        summary: 'Listar reservas por propiedad',
        parameters: [{ name: 'propertyId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Lista de reservas', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/BookingResponseDto' } } } } },
        },
      },
    },
    '/bookings/{id}': {
      get: {
        summary: 'Obtener reserva por ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Reserva encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/BookingResponseDto' } } } },
          '404': { description: 'No encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        summary: 'Cancelar reserva',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Reserva cancelada', content: { 'application/json': { schema: { $ref: '#/components/schemas/BookingResponseDto' } } } },
          '404': { description: 'No encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Ya cancelada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': { description: 'Servicio saludable', content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } } },
          '503': { description: 'DB no disponible', content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } } },
        },
      },
    },
  },
  components: {
    schemas: {
      CreateBookingDto: {
        type: 'object',
        required: ['propertyId', 'guestName', 'checkIn', 'checkOut', 'totalAmountUSD', 'bookingType'],
        properties: {
          propertyId: { type: 'string', format: 'uuid' },
          guestName: { type: 'string', minLength: 1 },
          checkIn: { type: 'string', format: 'date', example: '2025-01-15' },
          checkOut: { type: 'string', format: 'date', example: '2025-01-20' },
          totalAmountUSD: { type: 'number', minimum: 0.01 },
          bookingType: { type: 'string', enum: ['refundable', 'non_refundable'] },
        },
      },
      BookingResponseDto: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          propertyId: { type: 'string', format: 'uuid' },
          guestName: { type: 'string' },
          checkIn: { type: 'string', format: 'date' },
          checkOut: { type: 'string', format: 'date' },
          totalAmountUSD: { type: 'number' },
          bookingType: { type: 'string', enum: ['refundable', 'non_refundable'] },
          cancellationPenaltyPercent: { type: 'number' },
          bookingStatus: { type: 'string', enum: ['confirmed', 'cancelled'] },
          paymentStatus: { type: 'string', enum: ['paid', 'unpaid', 'refunded', 'partial_refund'] },
          cancelledAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'error'] },
          reason: { type: 'string' },
        },
      },
    },
  },
};

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/bookings', bookingsRouter);
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
      logger.info({ port: PORT }, 'Reservations Service escuchando');
    });
  } catch (err) {
    logger.error({ err }, 'Error al iniciar el servicio');
    process.exit(1);
  }
}

void start();

export { app };
