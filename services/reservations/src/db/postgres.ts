import knex, { Knex } from 'knex';
import {
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
} from '../config/env';

import path from 'path';

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    database: POSTGRES_DB,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
  },
  pool: { min: 2, max: 10 },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    loadExtensions: ['.js'],
  },
};

export const db = knex(config);

export async function checkPostgresConnection(): Promise<void> {
  await db.raw('SELECT 1');
}
