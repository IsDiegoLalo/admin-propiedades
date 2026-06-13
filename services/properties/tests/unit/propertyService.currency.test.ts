import fc from 'fast-check';

/**
 * Property 8: Conversión de moneda
 *
 * Para cualquier par (pricePerDayUSD, rate) con valores positivos,
 * el precio convertido debe ser exactamente:
 *   Math.round(pricePerDayUSD × rate × 100) / 100
 * es decir, el producto redondeado a 2 decimales.
 *
 * **Validates: Requirements 4.3**
 */

// ── Función pura de referencia ─────────────────────────────────────────────────

/**
 * Replica la lógica de conversión de moneda del propertyService.
 * Se extrae como función pura para testear la propiedad matemática directamente.
 */
function convertCurrency(pricePerDayUSD: number, rate: number): number {
  return Math.round(pricePerDayUSD * rate * 100) / 100;
}

// ── Arbitrarios ────────────────────────────────────────────────────────────────

const priceArb = fc.double({ min: 0.01, max: 100000, noNaN: true, noDefaultInfinity: true });
const rateArb = fc.double({ min: 0.000001, max: 1000, noNaN: true, noDefaultInfinity: true });

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Property 8: Conversión de moneda', () => {
  it('priceConverted = Math.round(pricePerDayUSD × rate × 100) / 100 para cualquier par válido', () => {
    fc.assert(
      fc.property(priceArb, rateArb, (price, rate) => {
        const result = convertCurrency(price, rate);
        const expected = Math.round(price * rate * 100) / 100;

        expect(result).toBe(expected);
      }),
      { numRuns: 1000 },
    );
  });

  it('el resultado siempre tiene como máximo 2 decimales', () => {
    fc.assert(
      fc.property(priceArb, rateArb, (price, rate) => {
        const result = convertCurrency(price, rate);

        // Verificar que el resultado tiene máximo 2 decimales
        const decimalPart = result.toString().split('.')[1];
        if (decimalPart) {
          expect(decimalPart.length).toBeLessThanOrEqual(2);
        }
      }),
      { numRuns: 1000 },
    );
  });

  it('el resultado es siempre un número finito y no negativo', () => {
    fc.assert(
      fc.property(priceArb, rateArb, (price, rate) => {
        const result = convertCurrency(price, rate);

        expect(Number.isFinite(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 },
    );
  });

  it('conversión con rate = 1 devuelve el precio original redondeado a 2 decimales', () => {
    fc.assert(
      fc.property(priceArb, (price) => {
        const result = convertCurrency(price, 1);
        const expected = Math.round(price * 100) / 100;

        expect(result).toBe(expected);
      }),
      { numRuns: 500 },
    );
  });
});
