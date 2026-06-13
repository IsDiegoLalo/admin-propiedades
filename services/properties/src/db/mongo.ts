import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env';

export async function connectMongo(): Promise<void> {
  await mongoose.connect(MONGO_URI);
}

export async function checkMongoConnection(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB no está conectado');
  }
  await mongoose.connection.db?.command({ ping: 1 });
}

export { mongoose };
