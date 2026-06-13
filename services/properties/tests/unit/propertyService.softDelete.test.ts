import fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

/**
 * Property 3: Soft delete — invisibilidad en listados
 *
 * Para cualquier propiedad existente, después de procesarse una solicitud de eliminación,
 * esa propiedad no debe aparecer en el listado activo, pero su registro debe seguir
 * presente en la base de datos con `deleted = true`.
 *
 * **Validates: Requirements 1.5**
 */

// ── In-memory store para simular la BD ────────────────────────────────────────

interface InMemoryProperty {
  id: string;
  name: string;
  type: 'house' | 'apartment';
  address: string;
  price_per_day_usd: number;
  currency: string;
  max_guests: number;
  cancellation_penalty_pct: number;
  services: string[];
  deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

let propertiesStore: InMemoryProperty[] = [];

// ── Mock de Knex (../db/postgres) ─────────────────────────────────────────────

function createKnexMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbMock = (table: string): any => {
    let whereConditions: Record<string, unknown> = {};

    const builder = {
      where(conditions: Record<string, unknown>) {
        whereConditions = { ...whereConditions, ...conditions };
        return builder;
      },
      first() {
        if (table === 'properties') {
          const found = propertiesStore.find((p) =>
            Object.entries(whereConditions).every(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ([k, v]) => (p as any)[k] === v,
            ),
          );
          return Promise.resolve(found || null);
        }
        return Promise.resolve(null);
      },
      insert(data: Record<string, unknown>) {
        if (table === 'properties') {
          const now = new Date();
          const record: InMemoryProperty = {
            id: uuidv4(),
            name: data.name as string,
            type: data.type as 'house' | 'apartment',
            address: data.address as string,
            price_per_day_usd: data.price_per_day_usd as number,
            currency: (data.currency as string) || 'USD',
            max_guests: data.max_guests as number,
            cancellation_penalty_pct: (data.cancellation_penalty_pct as number) || 0,
            services: (data.services as string[]) || [],
            deleted: false,
            created_at: now,
            updated_at: now,
          };
          propertiesStore.push(record);
          return {
            returning: () => Promise.resolve([record]),
          };
        }
        return { returning: () => Promise.resolve([]) };
      },
      update(data: Record<string, unknown>) {
        if (table === 'properties') {
          const idx = propertiesStore.findIndex((p) =>
            Object.entries(whereConditions).every(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ([k, v]) => (p as any)[k] === v,
            ),
          );
          if (idx >= 0) {
            propertiesStore[idx] = { ...propertiesStore[idx], ...data } as InMemoryProperty;
          }
        }
        return Promise.resolve(1);
      },
      returning() {
        return builder;
      },
      // Hacer el builder thenable para que `await db('properties').where(...)` resuelva
      then(
        resolve: (val: unknown) => void,
        _reject?: (err: unknown) => void,
      ) {
        if (table === 'properties') {
          const results = propertiesStore.filter((p) =>
            Object.entries(whereConditions).every(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ([k, v]) => (p as any)[k] === v,
            ),
          );
          resolve(results);
        } else {
          resolve([]);
        }
      },
    };

    return builder;
  };

  return dbMock;
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../src/db/postgres', () => ({
  db: createKnexMock(),
}));

jest.mock('../../src/models/propertyDoc', () => ({
  PropertyDocumentModel: {
    create: jest.fn().mockResolvedValue({}),
    findOne: jest.fn().mockReturnValue({
      lean: () => Promise.resolve({ extendedAttributes: {}, photos: [] }),
    }),
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../src/services/reviewsClient', () => ({
  getRating: jest.fn().mockResolvedValue(null),
}));

// Importar DESPUÉS de mockear
import {
  createProperty,
  listProperties,
  getPropertyById,
  softDeleteProperty,
} from '../../src/services/propertyService';

describe('Property 3: Soft delete — invisibilidad en listados', () => {
  beforeEach(() => {
    propertiesStore = [];
  });

  it('tras softDeleteProperty la propiedad no aparece en listProperties pero getPropertyById retorna deleted: true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          type: fc.constantFrom('house' as const, 'apartment' as const),
          address: fc.string({ minLength: 1, maxLength: 100 }),
          pricePerDayUSD: fc.double({ min: 0.01, max: 100000, noNaN: true }),
          currency: fc.constant('USD'),
          rooms: fc.integer({ min: 1, max: 10 }),
          maxGuests: fc.integer({ min: 1, max: 50 }),
        }),
        async (input) => {
          // Reset store para cada iteración
          propertiesStore = [];

          // 1. Crear la propiedad
          const created = await createProperty({
            ...input,
            cancellationPenaltyPercent: 0,
            services: [],
          });

          // 2. Verificar que aparece en listado
          const listBefore = await listProperties();
          expect(listBefore.some((p) => p.id === created.id)).toBe(true);

          // 3. Soft delete
          await softDeleteProperty(created.id);

          // 4. Verificar que NO aparece en listado (deleted = true excluido)
          const listAfter = await listProperties();
          expect(listAfter.some((p) => p.id === created.id)).toBe(false);

          // 5. Verificar que getPropertyById retorna deleted: true
          const retrieved = await getPropertyById(created.id);
          expect(retrieved.deleted).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });
});
