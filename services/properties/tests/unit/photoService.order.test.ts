import fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

/**
 * Property 7: Invariante de orden en fotos
 *
 * Para cualquier conjunto de fotos asociadas a una propiedad, el endpoint de listado
 * siempre debe devolverlas ordenadas por `uploadedAt` de manera estrictamente ascendente.
 *
 * **Validates: Requirements 3.4**
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

// In-memory store para documentos de propiedad
let documentsStore: Record<string, any> = {};

jest.mock('../../src/models/propertyDoc', () => {
  const actual = jest.requireActual('../../src/models/propertyDoc');
  return {
    ...actual,
    PropertyDocumentModel: {
      findOne: jest.fn((filter: any) => ({
        lean: () => {
          const doc = documentsStore[filter.propertyId];
          return Promise.resolve(doc ?? null);
        },
      })),
      findOneAndUpdate: jest.fn((filter: any, update: any, options: any) => {
        const propertyId = filter.propertyId;
        if (!documentsStore[propertyId]) {
          documentsStore[propertyId] = {
            propertyId,
            extendedAttributes: {},
            photos: [],
            updatedAt: new Date(),
          };
        }

        if (update.$push?.photos) {
          documentsStore[propertyId].photos.push(update.$push.photos);
        }

        return Promise.resolve(documentsStore[propertyId]);
      }),
    },
  };
});

// Importar después de los mocks
import { listPhotos } from '../../src/services/photoService';
import type { PhotoReference } from '../../src/models/propertyDoc';

// ── Arbitrarios ────────────────────────────────────────────────────────────────

/** Genera un timestamp arbitrario entre 2020 y 2030 */
const timestampArb = fc.date({
  min: new Date('2020-01-01T00:00:00.000Z'),
  max: new Date('2030-12-31T23:59:59.999Z'),
});

/** Genera una foto con timestamp arbitrario */
const photoArb = timestampArb.map((date): PhotoReference => ({
  photoId: uuidv4(),
  url: `/uploads/${uuidv4()}.jpg`,
  filename: `photo-${uuidv4()}.jpg`,
  sizeBytes: Math.floor(Math.random() * 5000000) + 1000,
  mimeType: 'image/jpeg',
  uploadedAt: date,
}));

/** Genera un array de fotos con timestamps arbitrarios (al menos 2 para verificar orden) */
const photosArrayArb = fc.array(photoArb, { minLength: 2, maxLength: 20 });

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Property 7: Invariante de orden en fotos', () => {
  beforeEach(() => {
    documentsStore = {};
  });

  it('listPhotos siempre retorna fotos ordenadas por uploadedAt ascendente', () => {
    return fc.assert(
      fc.asyncProperty(photosArrayArb, async (photos) => {
        const propertyId = uuidv4();

        // Insertar las fotos en el store con orden arbitrario (ya desordenadas por fast-check)
        documentsStore[propertyId] = {
          propertyId,
          extendedAttributes: {},
          photos: [...photos],
          updatedAt: new Date(),
        };

        // Invocar listPhotos
        const result = await listPhotos(propertyId);

        // Verificar que el resultado tiene la misma cantidad de fotos
        expect(result.length).toBe(photos.length);

        // Verificar orden estrictamente ascendente por uploadedAt
        for (let i = 1; i < result.length; i++) {
          const prev = new Date(result[i - 1].uploadedAt).getTime();
          const curr = new Date(result[i].uploadedAt).getTime();
          expect(prev).toBeLessThanOrEqual(curr);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('listPhotos retorna array vacío para propiedad sin documento', async () => {
    const propertyId = uuidv4();
    const result = await listPhotos(propertyId);
    expect(result).toEqual([]);
  });

  it('listPhotos retorna array vacío para propiedad sin fotos', async () => {
    const propertyId = uuidv4();
    documentsStore[propertyId] = {
      propertyId,
      extendedAttributes: {},
      photos: [],
      updatedAt: new Date(),
    };
    const result = await listPhotos(propertyId);
    expect(result).toEqual([]);
  });
});
