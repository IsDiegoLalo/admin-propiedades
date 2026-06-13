import fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

/**
 * Property 1: Round-trip de creación de propiedad
 *
 * Para cualquier conjunto válido de campos obligatorios de una propiedad,
 * crear la propiedad y luego recuperarla por su ID debe devolver exactamente
 * los mismos valores de campo.
 *
 * **Validates: Requirements 1.2, 1.7**
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock de variables de entorno para evitar process.exit
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

// Mock del reviewsClient: siempre devuelve null
jest.mock('../../src/services/reviewsClient', () => ({
  getRating: jest.fn().mockResolvedValue(null),
}));

// Estado interno que simula la BD
let propertiesStore: Record<string, any> = {};
let roomsStore: any[] = [];
let mongoDocsStore: Record<string, any> = {};

// Mock de Knex
const mockReturning = jest.fn();
const mockInsert = jest.fn();
const mockWhere = jest.fn();
const mockFirst = jest.fn();

const createMockDb = () => {
  const dbFn = jest.fn((tableName: string) => {
    if (tableName === 'properties') {
      return {
        insert: (data: any) => {
          const now = new Date();
          const id = uuidv4();
          const property = {
            id,
            ...data,
            deleted: false,
            created_at: now,
            updated_at: now,
          };
          propertiesStore[id] = property;
          return {
            returning: (_cols: string) => Promise.resolve([property]),
          };
        },
        where: (filter: any) => ({
          first: () => Promise.resolve(propertiesStore[filter.id] ?? undefined),
        }),
      };
    }
    if (tableName === 'rooms') {
      return {
        where: (_filter: any) => Promise.resolve(roomsStore),
      };
    }
    if (tableName === 'property_currency_rates') {
      return {
        insert: (_data: any) => Promise.resolve(),
        where: (filter: any) => ({
          first: () => Promise.resolve(undefined),
        }),
      };
    }
    return {
      insert: () => ({ returning: () => Promise.resolve([]) }),
      where: () => ({ first: () => Promise.resolve(undefined) }),
    };
  });
  return dbFn;
};

jest.mock('../../src/db/postgres', () => ({
  db: createMockDb(),
}));

// Mock de PropertyDocumentModel (Mongoose)
jest.mock('../../src/models/propertyDoc', () => {
  return {
    PropertyDocumentModel: {
      create: jest.fn(async (data: any) => {
        mongoDocsStore[data.propertyId] = {
          propertyId: data.propertyId,
          extendedAttributes: data.extendedAttributes ?? {},
          photos: data.photos ?? [],
        };
        return mongoDocsStore[data.propertyId];
      }),
      findOne: jest.fn((filter: any) => ({
        lean: () =>
          Promise.resolve(mongoDocsStore[filter.propertyId] ?? null),
      })),
    },
  };
});

// Importar después de los mocks
import { createProperty, getPropertyById } from '../../src/services/propertyService';
import type { CreatePropertyInput } from '../../src/validators/propertyValidator';

// ── Arbitrarios ────────────────────────────────────────────────────────────────

const validCreatePropertyInputArb: fc.Arbitrary<CreatePropertyInput> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).map((s) => s.trim() || 'Default'),
  type: fc.constantFrom('house' as const, 'apartment' as const),
  address: fc.string({ minLength: 1, maxLength: 200 }).map((s) => s.trim() || 'Default Addr'),
  pricePerDayUSD: fc.double({ min: 0.01, max: 99999.99, noNaN: true }),
  currency: fc.constantFrom('USD', 'EUR', 'ARS', 'BRL'),
  rooms: fc.integer({ min: 1, max: 50 }),
  maxGuests: fc.integer({ min: 1, max: 100 }),
  cancellationPenaltyPercent: fc.double({ min: 0, max: 100, noNaN: true }),
  services: fc.array(
    fc.string({ minLength: 1, maxLength: 30 }).map((s) => s.trim() || 'wifi'),
    { minLength: 0, maxLength: 5 },
  ),
  currencyRates: fc.constant(undefined),
  extendedAttributes: fc.constant(undefined),
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Property 1: Round-trip de creación de propiedad', () => {
  beforeEach(() => {
    propertiesStore = {};
    roomsStore = [];
    mongoDocsStore = {};
  });

  it('createProperty retorna un DTO con los mismos campos del input', () => {
    fc.assert(
      fc.asyncProperty(validCreatePropertyInputArb, async (input) => {
        const result = await createProperty(input);

        // Verificar igualdad campo a campo entre input y response dto
        expect(result.name).toBe(input.name);
        expect(result.type).toBe(input.type);
        expect(result.address).toBe(input.address);
        expect(result.pricePerDayUSD).toBe(input.pricePerDayUSD);
        expect(result.currency).toBe(input.currency);
        expect(result.maxGuests).toBe(input.maxGuests);
        expect(result.cancellationPenaltyPercent).toBe(input.cancellationPenaltyPercent);
        expect(result.services).toEqual(input.services);

        // Campos derivados
        expect(result.id).toBeDefined();
        expect(result.deleted).toBe(false);
        expect(result.starRating).toBeNull();
        expect(result.rooms).toEqual([]);
        expect(result.photos).toEqual([]);
        expect(result.extendedAttributes).toEqual({});
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
      }),
      { numRuns: 50 },
    );
  });

  it('getPropertyById retorna los mismos campos que fueron creados', () => {
    fc.assert(
      fc.asyncProperty(validCreatePropertyInputArb, async (input) => {
        const created = await createProperty(input);
        const retrieved = await getPropertyById(created.id);

        // Round-trip: crear y recuperar debe ser consistente
        expect(retrieved.id).toBe(created.id);
        expect(retrieved.name).toBe(input.name);
        expect(retrieved.type).toBe(input.type);
        expect(retrieved.address).toBe(input.address);
        expect(retrieved.pricePerDayUSD).toBe(input.pricePerDayUSD);
        expect(retrieved.currency).toBe(input.currency);
        expect(retrieved.maxGuests).toBe(input.maxGuests);
        expect(retrieved.cancellationPenaltyPercent).toBe(input.cancellationPenaltyPercent);
        expect(retrieved.services).toEqual(input.services);
        expect(retrieved.deleted).toBe(false);
        expect(retrieved.starRating).toBeNull();
        expect(retrieved.extendedAttributes).toEqual({});
      }),
      { numRuns: 50 },
    );
  });
});
