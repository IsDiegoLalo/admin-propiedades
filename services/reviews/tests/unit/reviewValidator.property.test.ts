import fc from 'fast-check';
import { createReviewSchema } from '../../src/validators/reviewValidator';

/**
 * Property 12: Validación de score de reseña
 * Validates: Requirements 6.2
 *
 * Verifica que el schema de validación de reseñas acepta únicamente scores
 * enteros en el rango [1, 5] y rechaza cualquier otro valor numérico.
 */

const validReviewBase = {
  propertyId: '550e8400-e29b-41d4-a716-446655440000',
  guestName: 'Juan Pérez',
  comment: 'Excelente propiedad, muy recomendable.',
};

describe('Property 12: Validación de score de reseña', () => {
  it('acepta scores enteros en [1, 5]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (score) => {
        const result = createReviewSchema.safeParse({
          ...validReviewBase,
          score,
        });
        expect(result.success).toBe(true);
      }),
    );
  });

  it('rechaza scores enteros fuera de [1, 5]', () => {
    fc.assert(
      fc.property(
        fc.integer().filter((n) => n < 1 || n > 5),
        (score) => {
          const result = createReviewSchema.safeParse({
            ...validReviewBase,
            score,
          });
          expect(result.success).toBe(false);
        },
      ),
    );
  });

  it('rechaza scores decimales (no enteros) en [1, 5]', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 5, noNaN: true, noDefaultInfinity: true }).filter(
          (n) => !Number.isInteger(n),
        ),
        (score) => {
          const result = createReviewSchema.safeParse({
            ...validReviewBase,
            score,
          });
          expect(result.success).toBe(false);
        },
      ),
    );
  });

  it('rechaza scores NaN e Infinity', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(NaN, Infinity, -Infinity),
        (score) => {
          const result = createReviewSchema.safeParse({
            ...validReviewBase,
            score,
          });
          expect(result.success).toBe(false);
        },
      ),
    );
  });
});
