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

export const PORT = parseInt(optionalEnv('PORT', '3003'), 10);
export const LOG_LEVEL = optionalEnv('LOG_LEVEL', 'info');

export const POSTGRES_HOST = requireEnv('POSTGRES_HOST');
export const POSTGRES_PORT = parseInt(optionalEnv('POSTGRES_PORT', '5432'), 10);
export const POSTGRES_DB = requireEnv('POSTGRES_DB');
export const POSTGRES_USER = requireEnv('POSTGRES_USER');
export const POSTGRES_PASSWORD = requireEnv('POSTGRES_PASSWORD');
