import fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

/**
 * Property 6: Preservación parcial en updates de habitación
 *
 * Para cualquier subconjunto arbitrario de campos enviados en un update,
 * los campos NO incluidos en el input deben mantener sus valores originales.
 *
 * **Validates: Requirements 2.4**
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../../src/config/env', () => ({
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: 5432,
  POSTGRES_DB: 'test_db',
  POSTGRES_USER: 'test_user',
  POSTGRES_PASSWORD: 'test_pass',
  MONGO_URI: 'mongodb://localhost:27017/test',
  REVIEWS_SERVICE_URL: 'http://localhost:3003',
  PORT: 3001,
  LOG_LEVEL: 'silent',
  PHOTO_MAX_SIZE_BYTES: 10485760,
}));

// In-memory store para rooms
let roomsStore: Record<string, any> = {};

const createMockDb = () => {
  const dbFn = jest.fn((tableName: string) => {
    if (tableName === 'rooms') {
      return {
        insert: (data: any) => {
          const now = new Date();
          const id = uuidv4();
          const room = {
            id,
            ...data,
            active: true,
            created_at: now,
            updated_at: now,
          };
          roomsStore[id] = room;
          return {
            returning: (_cols: string) => Promise.resolve([room]),
          };
        },
        where: (filter: any) => ({
          first: () => {
            // Buscar por id y property_id
            const room = Object.values(roomsStore).find(
              (r: any) => r.id === filter.id && r.property_id === filter.property_id,
            );
            return Promise.resolve(room ?? undefined);
          },
          update: (updates: any) => ({
            returning: (_cols: string) => {
              const room = roomsStore[filter.id];
              if (!room) return Promise.resolve([]);
              const updatedRoom = { ...room, ...updates };
              roomsStore[filter.id] = updatedRoom;
              return Promise.resolve([updatedRoom]);
            },
          }),
        }),
      };
    }
    return {
      insert: () => ({ returning: () => Promise.resolve([]) }),
      where: () => ({
        first: () => Promise.resolve(undefined),
        update: () => ({ returning: () => Promise.resolve([]) }),
      }),
    };
  });
  return dbFn;
};

jest.mock('../../src/db/postgres', () => ({
  db: createMockDb(),
}));

// Importar después de los mocks
import { createRoom, updateRoom } from '../../src/services/roomService';
import type { UpdateRoomInput } from '../../src/validators/roomValidator';

// ── Arbitrarios ────────────────────────────────────────────────────────────────

const UPDATABLE_FIELDS = ['name', 'type', 'beds', 'description', 'active'] as const;
type UpdatableField = (typeof UPDATABLE_FIELDS)[number];

/** Genera un subconjunto no vacío de campos actualizables */
const fieldSubsetArb: fc.Arbitrary<UpdatableField[]> = fc
  .subarray([...UPDATABLE_FIELDS], { minLength: 1 })
  .filter((arr) => arr.length > 0);

/** Genera valores válidos para cada campo */
const fieldValueArb = (field: UpdatableField): fc.Arbitrary<any> => {
  switch (field) {
    case 'name':
      return fc.string({ minLength: 1, maxLength: 100 }).map((s) => s.trim() || 'Room');
    case 'type':
      return fc.constantFrom('single', 'double', 'suite', 'deluxe');
    case 'beds':
      return fc.integer({ min: 1, max: 10 });
    case 'description':
      return fc.string({ minLength: 1, maxLength: 500 }).map((s) => s.trim() || 'Description');
    case 'active':
      return fc.boolean();
  }
};

/** Genera un objeto UpdateRoomInput con solo los campos del subconjunto dado */
const partialUpdateArb = (fields: UpdatableField[]): fc.Arbitrary<UpdateRoomInput> => {
  const entries = fields.map((field) => [field, fieldValueArb(field)] as const);
  const record: Record<string, fc.Arbitrary<any>> = {};
  for (const [key, arb] of entries) {
    record[key] = arb;
  }
  return fc.record(record) as fc.Arbitrary<UpdateRoomInput>;
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Property 6: Preservación parcial en updates de habitación', () => {
  const propertyId = uuidv4();

  beforeEach(() => {
    roomsStore = {};
  });

  it('los campos NO incluidos en el update mantienen sus valores originales', () => {
    return fc.assert(
      fc.asyncProperty(fieldSubsetArb, async (fieldsToUpdate) => {
        // 1. Crear una room con valores iniciales conocidos
        const initialRoom = await createRoom(propertyId, {
          name: 'Original Room',
          type: 'standard',
          beds: 2,
          description: 'Original description',
        });

        // 2. Generar valores para el subconjunto de campos a actualizar
        const updateInput = await fc.sample(partialUpdateArb(fieldsToUpdate), 1)[0];

        // 3. Aplicar el update parcial
        const updatedRoom = await updateRoom(propertyId, initialRoom.id, updateInput);

        // 4. Verificar que los campos NO enviados conservan valores originales
        const fieldsNotUpdated = UPDATABLE_FIELDS.filter(
          (f) => !fieldsToUpdate.includes(f),
        );

        for (const field of fieldsNotUpdated) {
          expect(updatedRoom[field]).toEqual(
            initialRoom[field],
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it('los campos incluidos en el update sí cambian al valor enviado', () => {
    return fc.assert(
      fc.asyncProperty(fieldSubsetArb, async (fieldsToUpdate) => {
        // 1. Crear una room con valores iniciales
        const initialRoom = await createRoom(propertyId, {
          name: 'Original Room',
          type: 'standard',
          beds: 2,
          description: 'Original description',
        });

        // 2. Generar valores para el subconjunto
        const updateInput = await fc.sample(partialUpdateArb(fieldsToUpdate), 1)[0];

        // 3. Aplicar el update parcial
        const updatedRoom = await updateRoom(propertyId, initialRoom.id, updateInput);

        // 4. Verificar que los campos enviados tienen los nuevos valores
        for (const field of fieldsToUpdate) {
          expect(updatedRoom[field]).toEqual(updateInput[field]);
        }
      }),
      { numRuns: 100 },
    );
  });
});
