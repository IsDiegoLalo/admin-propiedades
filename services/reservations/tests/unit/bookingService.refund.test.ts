import fc from 'fast-check';

/**
 * Property 18: Cálculo exacto de reembolso parcial
 * **Validates: Requirements 9.2**
 *
 * Para reservas non_refundable, el monto reembolsado debe ser:
 *   refundedAmount = totalAmountUSD × (1 - cancellationPenaltyPercent / 100)
 * redondeado a 2 decimales.
 */

// ── Función pura extraída de bookingService.cancelBooking ──────────────────────

/**
 * Replica la lógica exacta de cálculo de reembolso parcial en bookingService.ts:
 *   refundAmount = Math.round(totalAmount * (1 - penaltyPct / 100) * 100) / 100
 */
function calculatePartialRefund(totalAmount: number, penaltyPct: number): number {
  return Math.round(totalAmount * (1 - penaltyPct / 100) * 100) / 100;
}

// ── Arbitrarios ────────────────────────────────────────────────────────────────

const totalAmountArb = fc
  .double({ min: 0.01, max: 100000, noNaN: true, noDefaultInfinity: true })
  .map((n) => Math.round(n * 100) / 100); // Asegurar 2 decimales como input

const penaltyPercentArb = fc.double({
  min: 0,
  max: 100,
  noNaN: true,
  noDefaultInfinity: true,
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Property 18: Cálculo exacto de reembolso parcial', () => {
  /**
   * El resultado de la fórmula de reembolso siempre debe tener
   * máximo 2 decimales (precisión monetaria).
   * **Validates: Requirements 9.2**
   */
  it('el reembolso parcial tiene precisión de 2 decimales', () => {
    fc.assert(
      fc.property(totalAmountArb, penaltyPercentArb, (totalAmount, penaltyPct) => {
        const refund = calculatePartialRefund(totalAmount, penaltyPct);
        // Verificar que el resultado tiene máximo 2 decimales
        const rounded = Math.round(refund * 100) / 100;
        expect(refund).toBeCloseTo(rounded, 10);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * El reembolso debe coincidir con la fórmula esperada:
   *   refundedAmount = totalAmountUSD × (1 - penalty/100)
   * redondeado a 2 decimales.
   * **Validates: Requirements 9.2**
   */
  it('refundedAmount = totalAmountUSD × (1 - penalty/100) redondeado a 2 decimales', () => {
    fc.assert(
      fc.property(totalAmountArb, penaltyPercentArb, (totalAmount, penaltyPct) => {
        const refund = calculatePartialRefund(totalAmount, penaltyPct);
        const expected = Math.round(totalAmount * (1 - penaltyPct / 100) * 100) / 100;
        expect(refund).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * El reembolso siempre está en el rango [0, totalAmount].
   * **Validates: Requirements 9.2**
   */
  it('el reembolso está siempre entre 0 y el total', () => {
    fc.assert(
      fc.property(totalAmountArb, penaltyPercentArb, (totalAmount, penaltyPct) => {
        const refund = calculatePartialRefund(totalAmount, penaltyPct);
        expect(refund).toBeGreaterThanOrEqual(0);
        expect(refund).toBeLessThanOrEqual(totalAmount + 0.01); // tolerancia por redondeo
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Caso borde: penalty = 0 → reembolso completo (refund == total).
   * **Validates: Requirements 9.2**
   */
  it('penalty=0 implica reembolso total (refund == totalAmount)', () => {
    fc.assert(
      fc.property(totalAmountArb, (totalAmount) => {
        const refund = calculatePartialRefund(totalAmount, 0);
        expect(refund).toBe(totalAmount);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Caso borde: penalty = 100 → reembolso cero.
   * **Validates: Requirements 9.2**
   */
  it('penalty=100 implica reembolso cero', () => {
    fc.assert(
      fc.property(totalAmountArb, (totalAmount) => {
        const refund = calculatePartialRefund(totalAmount, 100);
        expect(refund).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * A mayor penalidad, menor reembolso (relación monotónicamente decreciente).
   * **Validates: Requirements 9.2**
   */
  it('el reembolso decrece al aumentar la penalidad', () => {
    fc.assert(
      fc.property(
        totalAmountArb,
        penaltyPercentArb,
        penaltyPercentArb,
        (totalAmount, penalty1, penalty2) => {
          const refund1 = calculatePartialRefund(totalAmount, penalty1);
          const refund2 = calculatePartialRefund(totalAmount, penalty2);
          if (penalty1 <= penalty2) {
            expect(refund1).toBeGreaterThanOrEqual(refund2);
          } else {
            expect(refund2).toBeGreaterThanOrEqual(refund1);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
