import express from 'express';
import cors from 'cors';
import { PORT } from './config/env';
import { connectMongo, db, checkConnections } from './db';
import { requestLogger, logger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import propertiesRouter from './routes/properties';
import roomsRouter from './routes/rooms';
import photosRouter from './routes/photos';
import swaggerRouter from './swagger';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Rutas
app.use('/properties', propertiesRouter);
app.use('/properties/:id/rooms', roomsRouter);
app.use('/properties/:id/photos', photosRouter);
app.use('/api-docs', swaggerRouter);

// Health check
app.get('/health', async (_req, res) => {
  try {
    await checkConnections();
    res.status(200).json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', reason: 'database unavailable' });
  }
});

app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await connectMongo();
    logger.info('Conexión MongoDB establecida');

    await db.migrate.latest();
    logger.info('Migraciones PostgreSQL aplicadas');

    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Properties Service escuchando');
    });
  } catch (err) {
    logger.error({ err }, 'Error al iniciar el servicio');
    process.exit(1);
  }
}

void start();

export { app };
