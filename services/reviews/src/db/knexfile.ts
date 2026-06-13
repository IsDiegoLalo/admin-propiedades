import type { Knex } from 'knex';

// eslint-disable-next-line @typescript-eslint/no-require-imports
try { require('dotenv').config(); } catch { /* dotenv es opcional en contenedores */ }

const config: Record<string, Knex.Config> = {
  development: {
    client: 'pg',
    connection: {
      host: process.env['POSTGRES_HOST'] ?? 'localhost',
      port: parseInt(process.env['POSTGRES_PORT'] ?? '5432', 10),
      database: process.env['POSTGRES_DB'] ?? 'reviews_db',
      user: process.env['POSTGRES_USER'] ?? 'reviews_user',
      password: process.env['POSTGRES_PASSWORD'] ?? 'changeme_reviews',
    },
    migrations: {
      directory: './src/db/migrations',
      extension: 'ts',
    },
  },
  test: {
    client: 'pg',
    connection: {
      host: process.env['POSTGRES_HOST'] ?? 'localhost',
      port: parseInt(process.env['POSTGRES_PORT'] ?? '5432', 10),
      database: process.env['POSTGRES_DB'] ?? 'reviews_test_db',
      user: process.env['POSTGRES_USER'] ?? 'test_user',
      password: process.env['POSTGRES_PASSWORD'] ?? 'test_password',
    },
    migrations: {
      directory: './src/db/migrations',
      extension: 'ts',
    },
  },
};

export default config;
