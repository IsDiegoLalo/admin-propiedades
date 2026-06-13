import fc from 'fast-check';

/**
 * Property 11: Star rating null para propiedades sin reseñas
 * Validates: Requirements 5.4
 *
 * Para cualquier propertyId (UUID) que no tenga reseñas (es decir, no existe
 * fila en property_ratings), getRating debe retornar starRating: null y
 * reviewCount: 0.
 */

const mockFirst = jest.fn();
const mockWhere = jest.fn(() => ({ first: mockFirst }));
const mockDb = jest.fn(() => ({ where: mockWhere }));

// Mock completo del módulo de base de datos para evitar la carga de env.ts
jest.mock('../../src/db/postgres', () => ({
  __esModule: true,
  db: mockDb,
}));

import { getRating } from '../../src/services/reviewService';

describe('Property 11: Star rating null para propiedades sin reseñas', () => {
  beforeEach(() => {
    mockFirst.mockResolvedValue(undefined);
    mockWhere.mockReturnValue({ first: mockFirst });
    mockDb.mockReturnValue({ where: mockWhere });
  });

  it('getRating retorna starRating: null y reviewCount: 0 para cualquier propertyId sin reseñas', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (propertyId) => {
        const result = await getRating(propertyId);

        expect(result.propertyId).toBe(propertyId);
        expect(result.starRating).toBeNull();
        expect(result.reviewCount).toBe(0);
      }),
      { numRuns: 100 },
    );
  });
});
