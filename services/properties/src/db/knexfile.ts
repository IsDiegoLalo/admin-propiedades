import type { Knex } from 'knex';
import dotenv from 'dotenv';
dotenv.config();

const config: Record<string, Knex.Config> = {
  development: {
    client: 'pg',
    connection: {
      host: process.env['POSTGRES_HOST'] ?? 'localhost',
      port: parseInt(process.env['POSTGRES_PORT'] ?? '5432', 10),
      database: process.env['POSTGRES_DB'] ?? 'properties_db',
      user: process.env['POSTGRES_USER'] ?? 'properties_user',
      password: process.env['POSTGRES_PASSWORD'] ?? 'changeme_properties',
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
      database: process.env['POSTGRES_DB'] ?? 'properties_test_db',
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
