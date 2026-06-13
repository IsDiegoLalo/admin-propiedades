import pino from 'pino';

const logger = pino({ level: 'info' });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    logger.error(`Variable de entorno requerida faltante: ${name}`);
    process.exit(1);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export const PORT = parseInt(optionalEnv('PORT', '3001'), 10);
export const LOG_LEVEL = optionalEnv('LOG_LEVEL', 'info');

// PostgreSQL
export const POSTGRES_HOST = requireEnv('POSTGRES_HOST');
export const POSTGRES_PORT = parseInt(optionalEnv('POSTGRES_PORT', '5432'), 10);
export const POSTGRES_DB = requireEnv('POSTGRES_DB');
export const POSTGRES_USER = requireEnv('POSTGRES_USER');
export const POSTGRES_PASSWORD = requireEnv('POSTGRES_PASSWORD');

// MongoDB
export const MONGO_URI = requireEnv('MONGO_URI');

// Servicios externos
export const REVIEWS_SERVICE_URL = requireEnv('REVIEWS_SERVICE_URL');

// Fotos
export const PHOTO_MAX_SIZE_BYTES = parseInt(
  optionalEnv('PHOTO_MAX_SIZE_BYTES', String(10 * 1024 * 1024)),
  10,
);
