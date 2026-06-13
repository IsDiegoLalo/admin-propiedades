import fc from 'fast-check';

/**
 * Property 13: Invariante de orden en listado de reseñas
 * Validates: Requirements 6.4
 *
 * Para cualquier conjunto de reseñas de una propiedad, el endpoint de listado
 * siempre debe devolverlas ordenadas por `createdAt` de manera estrictamente
 * descendente.
 */

// Capturamos las llamadas a orderBy para verificar el parámetro 'desc'
let orderByArgs: unknown[] = [];
let whereArgs: unknown[] = [];
let mockResult: unknown[] = [];

jest.mock('../../src/db/postgres', () => ({
  db: new Proxy(() => {}, {
    apply(_target, _thisArg, args) {
      // db('reviews') — retorna un query builder falso
      return {
        where(...wArgs: unknown[]) {
          whereArgs = wArgs;
          return {
            orderBy(...oArgs: unknown[]) {
              orderByArgs = oArgs;
              return Promise.resolve(mockResult);
            },
          };
        },
      };
    },
    get(_target, prop) {
      // Para db<Review>(...) — TypeScript generics se eliminan en runtime,
      // pero knex usa db como función directamente
      if (prop === 'apply' || prop === 'call' || prop === 'bind') {
        return undefined;
      }
      return undefined;
    },
  }),
}));

import { listReviews } from '../../src/services/reviewService';

// Arbitrary para generar timestamps aleatorios dentro de un rango razonable
const timestampArb = fc.date({
  min: new Date('2020-01-01T00:00:00Z'),
  max: new Date('2025-12-31T23:59:59Z'),
});

// Arbitrary para generar un review con created_at aleatorio
const reviewArb = fc.record({
  id: fc.uuid(),
  property_id: fc.uuid(),
  guest_name: fc.string({ minLength: 1, maxLength: 50 }),
  score: fc.integer({ min: 1, max: 5 }),
  comment: fc.string({ minLength: 1, maxLength: 200 }),
  created_at: timestampArb,
});

describe('Property 13: Invariante de orden en listado de reseñas', () => {
  beforeEach(() => {
    orderByArgs = [];
    whereArgs = [];
    mockResult = [];
  });

  it('listReviews aplica orderBy("created_at", "desc") y devuelve resultados en orden descendente', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(reviewArb, { minLength: 0, maxLength: 30 }),
        fc.uuid(),
        async (reviews, propertyId) => {
          // Simular que Knex ordena los reviews desc por created_at
          // (como haría la BD al recibir .orderBy('created_at', 'desc'))
          const sortedDesc = [...reviews].sort(
            (a, b) => b.created_at.getTime() - a.created_at.getTime(),
          );

          mockResult = sortedDesc;

          const result = await listReviews(propertyId);

          // Verificar que se pidió orderBy con 'created_at' y 'desc'
          expect(orderByArgs).toEqual(['created_at', 'desc']);

          // Verificar que el resultado está en orden descendente por created_at
          for (let i = 1; i < result.length; i++) {
            const prev = new Date(result[i - 1]!.created_at).getTime();
            const curr = new Date(result[i]!.created_at).getTime();
            expect(prev).toBeGreaterThanOrEqual(curr);
          }

          // Verificar que el resultado coincide con el array ordenado
          expect(result).toEqual(sortedDesc);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('listReviews filtra por property_id correcto', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (propertyId) => {
        mockResult = [];

        await listReviews(propertyId);

        expect(whereArgs).toEqual([{ property_id: propertyId }]);
      }),
      { numRuns: 100 },
    );
  });

  it('para lista vacía, listReviews devuelve array vacío manteniendo el invariante de orden', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (propertyId) => {
        mockResult = [];

        const result = await listReviews(propertyId);

        expect(result).toEqual([]);
        expect(orderByArgs).toEqual(['created_at', 'desc']);
      }),
      { numRuns: 50 },
    );
  });
});
