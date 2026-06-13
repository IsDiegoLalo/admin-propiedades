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

export const PORT = parseInt(optionalEnv('PORT', '3002'), 10);
export const LOG_LEVEL = optionalEnv('LOG_LEVEL', 'info');

export const POSTGRES_HOST = requireEnv('POSTGRES_HOST');
export const POSTGRES_PORT = parseInt(optionalEnv('POSTGRES_PORT', '5432'), 10);
export const POSTGRES_DB = requireEnv('POSTGRES_DB');
export const POSTGRES_USER = requireEnv('POSTGRES_USER');
export const POSTGRES_PASSWORD = requireEnv('POSTGRES_PASSWORD');

export const PROPERTIES_SERVICE_URL = requireEnv('PROPERTIES_SERVICE_URL');

export const PAYMENT_MOCK_FAILURE_RATE = (() => {
  const raw = optionalEnv('PAYMENT_MOCK_FAILURE_RATE', '0');
  const value = parseFloat(raw);
  if (isNaN(value) || value < 0 || value > 1) {
    logger.error(
      `PAYMENT_MOCK_FAILURE_RATE debe ser un número entre 0.0 y 1.0, recibido: "${raw}"`,
    );
    process.exit(1);
  }
  return value;
})();
