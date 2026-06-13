import { checkPostgresConnection } from './postgres';
import { checkMongoConnection } from './mongo';

/**
 * Verifica la conexión a PostgreSQL y MongoDB.
 * Lanza error si alguna de las bases de datos no está disponible.
 * Usada por el health check del servicio.
 */
export async function checkConnections(): Promise<void> {
  await checkPostgresConnection();
  await checkMongoConnection();
}

export { db, checkPostgresConnection } from './postgres';
export { connectMongo, checkMongoConnection, mongoose } from './mongo';
