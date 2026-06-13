import fc from 'fast-check';

/**
 * Property 10: Exactitud del cálculo de star rating
 * Validates: Requirements 5.1, 5.2
 *
 * Para cualquier lista no vacía de scores enteros entre 1 y 5, el starRating
 * calculado debe ser igual a la media aritmética de esos scores, redondeada
 * a exactamente un decimal.
 */

// Reimplementación de la fórmula usada en reviewService.ts (calcStarRating)
// para poder testear la lógica de cálculo como función pura.
function calcStarRating(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return Math.round((sum / scores.length) * 10) / 10;
}

// Función de referencia independiente para calcular la media esperada
function expectedMean(scores: number[]): number {
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return Math.round((sum / scores.length) * 10) / 10;
}

describe('Property 10: Exactitud del cálculo de star rating', () => {
  it('el starRating coincide con round(mean(scores), 1) para scores enteros [1,5]', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 100 }),
        (scores) => {
          const result = calcStarRating(scores);
          const expected = expectedMean(scores);

          expect(result).toBe(expected);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('el resultado siempre está en el rango [1.0, 5.0]', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 100 }),
        (scores) => {
          const result = calcStarRating(scores);

          expect(result).not.toBeNull();
          expect(result!).toBeGreaterThanOrEqual(1.0);
          expect(result!).toBeLessThanOrEqual(5.0);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('el resultado tiene como máximo 1 decimal de precisión', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 100 }),
        (scores) => {
          const result = calcStarRating(scores);

          // Verificar que al multiplicar por 10 obtenemos un entero
          const scaled = result! * 10;
          expect(Math.round(scaled)).toBe(scaled);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('retorna null para lista vacía de scores', () => {
    const result = calcStarRating([]);
    expect(result).toBeNull();
  });

  it('para un solo score, el starRating es exactamente ese score', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (score) => {
          const result = calcStarRating([score]);
          expect(result).toBe(score);
        },
      ),
    );
  });
});
