import fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

/**
 * Property 9: Fallback de moneda desconocida
 *
 * Para cualquier código de moneda que no tenga tasa almacenada para una
 * propiedad dada, el endpoint debe devolver el precio en USD con el flag
 * `currencyFallback: true` en el response body.
 *
 * **Validates: Requirements 4.4**
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

jest.mock('../../src/services/reviewsClient', () => ({
  getRating: jest.fn().mockResolvedValue(null),
}));

// Estado interno que simula la BD
let propertiesStore: Record<string, any> = {};
let mongoDocsStore: Record<string, any> = {};

// Mock de Knex: property_currency_rates siempre devuelve undefined (no hay tasa)
const createMockDb = () => {
  const dbFn = jest.fn((tableName: string) => {
    if (tableName === 'properties') {
      return {
        where: (filter: any) => ({
          first: () => Promise.resolve(propertiesStore[filter.id] ?? undefined),
        }),
      };
    }
    if (tableName === 'rooms') {
      return {
        where: (_filter: any) => Promise.resolve([]),
      };
    }
    if (tableName === 'property_currency_rates') {
      return {
        where: (_filter: any) => ({
          first: () => Promise.resolve(undefined), // Sin tasa almacenada
        }),
      };
    }
    return {
      where: () => ({ first: () => Promise.resolve(undefined) }),
    };
  });
  return dbFn;
};

jest.mock('../../src/db/postgres', () => ({
  db: createMockDb(),
}));

jest.mock('../../src/models/propertyDoc', () => {
  return {
    PropertyDocumentModel: {
      findOne: jest.fn((filter: any) => ({
        lean: () =>
          Promise.resolve(mongoDocsStore[filter.propertyId] ?? null),
      })),
    },
  };
});

// Importar después de los mocks
import { getPropertyById } from '../../src/services/propertyService';

// ── Arbitrarios ────────────────────────────────────────────────────────────────

// Genera códigos de moneda arbitrarios que no sean la moneda base de la propiedad
const currencyCodeArb = fc
  .stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), {
    minLength: 3,
    maxLength: 5,
  })
  .filter((c) => c.length >= 3);

const pricePerDayUSDArb = fc.double({ min: 0.01, max: 99999.99, noNaN: true });

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Property 9: Fallback de moneda desconocida', () => {
  beforeEach(() => {
    propertiesStore = {};
    mongoDocsStore = {};
  });

  it('getPropertyById con moneda sin tasa almacenada retorna currencyFallback: true y priceConverted undefined', () => {
    fc.assert(
      fc.asyncProperty(
        pricePerDayUSDArb,
        currencyCodeArb,
        async (pricePerDayUSD, currencyCode) => {
          // Crear una propiedad en el store con moneda base USD
          const id = uuidv4();
          const now = new Date();
          propertiesStore[id] = {
            id,
            name: 'Test Property',
            type: 'house',
            address: '123 Main St',
            price_per_day_usd: pricePerDayUSD,
            currency: 'USD',
            max_guests: 4,
            cancellation_penalty_pct: 10,
            services: [],
            deleted: false,
            created_at: now,
            updated_at: now,
          };

          mongoDocsStore[id] = {
            propertyId: id,
            extendedAttributes: {},
            photos: [],
          };

          // Invocar con un código de moneda diferente a USD (sin tasa almacenada)
          const requestedCurrency = currencyCode === 'USD' ? 'XYZ' : currencyCode;
          const result = await getPropertyById(id, requestedCurrency);

          // Verificar que no se calcula priceConverted
          expect(result.priceConverted).toBeUndefined();

          // Verificar que se señala el fallback
          expect(result.currencyFallback).toBe(true);

          // El precio en USD se mantiene intacto
          expect(result.pricePerDayUSD).toBeCloseTo(pricePerDayUSD, 2);
        },
      ),
      { numRuns: 100 },
    );
  });
});
