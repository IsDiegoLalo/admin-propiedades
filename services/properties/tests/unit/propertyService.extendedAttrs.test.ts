import fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

/**
 * Property 4: Round-trip de atributos extendidos y servicios
 *
 * Para cualquier conjunto arbitrario de pares clave-valor como `extendedAttributes`
 * y cualquier array de strings como `services`, persistirlos y luego recuperarlos
 * debe devolver exactamente los mismos valores sin pérdida ni transformación inesperada.
 *
 * **Validates: Requirements 1.6, 1.7, 11.1, 11.2, 11.3, 12.1, 12.2**
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

// Estado in-memory que simula las bases de datos
let propertiesStore: Record<string, any> = {};
let roomsStore: any[] = [];
let mongoDocsStore: Record<string, any> = {};

// Mock de Knex
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

// Generador de extendedAttributes: objetos JSON arbitrarios con claves string
const extendedAttributesArb: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }),
  fc.jsonValue(),
);

// Generador de services: array de strings no vacíos
const servicesArb: fc.Arbitrary<string[]> = fc.array(
  fc.string({ minLength: 1, maxLength: 50 }),
  { minLength: 0, maxLength: 10 },
);

// Input base válido con extendedAttributes y services inyectados
const createInputWithExtAttrsArb = (
  extAttrs: Record<string, unknown>,
  services: string[],
): CreatePropertyInput => ({
  name: 'Test Property',
  type: 'house',
  address: '123 Test St',
  pricePerDayUSD: 100,
  currency: 'USD',
  rooms: 2,
  maxGuests: 4,
  cancellationPenaltyPercent: 10,
  services,
  currencyRates: undefined,
  extendedAttributes: extAttrs,
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Property 4: Round-trip de atributos extendidos y servicios', () => {
  beforeEach(() => {
    propertiesStore = {};
    roomsStore = [];
    mongoDocsStore = {};
  });

  it('extendedAttributes persisten y se recuperan sin pérdida (deep-equal)', () => {
    return fc.assert(
      fc.asyncProperty(extendedAttributesArb, servicesArb, async (extAttrs, services) => {
        const input = createInputWithExtAttrsArb(extAttrs, services);
        const created = await createProperty(input);

        // Verificar que createProperty devuelve los atributos extendidos exactos
        expect(created.extendedAttributes).toEqual(extAttrs);
      }),
      { numRuns: 50 },
    );
  });

  it('services persisten y se recuperan sin pérdida (deep-equal)', () => {
    return fc.assert(
      fc.asyncProperty(extendedAttributesArb, servicesArb, async (extAttrs, services) => {
        const input = createInputWithExtAttrsArb(extAttrs, services);
        const created = await createProperty(input);

        // Verificar que createProperty devuelve el array de services exacto
        expect(created.services).toEqual(services);
      }),
      { numRuns: 50 },
    );
  });

  it('getPropertyById devuelve extendedAttributes idénticos a los creados', () => {
    return fc.assert(
      fc.asyncProperty(extendedAttributesArb, servicesArb, async (extAttrs, services) => {
        const input = createInputWithExtAttrsArb(extAttrs, services);
        const created = await createProperty(input);
        const retrieved = await getPropertyById(created.id);

        // Round-trip completo: crear → recuperar → comparar
        expect(retrieved.extendedAttributes).toEqual(extAttrs);
      }),
      { numRuns: 50 },
    );
  });

  it('getPropertyById devuelve services idénticos a los creados', () => {
    return fc.assert(
      fc.asyncProperty(extendedAttributesArb, servicesArb, async (extAttrs, services) => {
        const input = createInputWithExtAttrsArb(extAttrs, services);
        const created = await createProperty(input);
        const retrieved = await getPropertyById(created.id);

        // Round-trip completo: crear → recuperar → comparar
        expect(retrieved.services).toEqual(services);
      }),
      { numRuns: 50 },
    );
  });
});
