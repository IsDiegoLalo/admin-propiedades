import fc from 'fast-check';
import { createBookingSchema } from '../../src/validators/bookingValidator';

/**
 * Property 2 (Reservations) — Rechazo universal de reservas inválidas
 * Validates: Requirements 8.1, 8.2
 *
 * Para cualquier request de creación de reserva con al menos un campo inválido,
 * el schema debe rechazar con error de validación (equivalente a HTTP 422).
 */

// Helper: genera una fecha ISO válida YYYY-MM-DD
const isoDateArb = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map((d) => d.toISOString().slice(0, 10));

// Helper: genera un request de booking completamente válido
const validBookingArb = fc
  .tuple(
    fc.uuid(),
    fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    isoDateArb,
    fc.integer({ min: 1, max: 30 }),
    fc.double({ min: 0.01, max: 100000, noNaN: true }),
    fc.constantFrom('refundable' as const, 'non_refundable' as const)
  )
  .map(([propertyId, guestName, checkIn, daysAhead, totalAmountUSD, bookingType]) => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + daysAhead);
    const checkOut = checkOutDate.toISOString().slice(0, 10);
    return { propertyId, guestName, checkIn, checkOut, totalAmountUSD, bookingType };
  });

describe('Property 2 (Reservations) — Booking Validator Property Tests', () => {
  /**
   * Test 1: propertyId no UUID → safeParse falla
   * **Validates: Requirements 8.1, 8.2**
   */
  it('should reject any propertyId that is not a valid UUID', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => {
          // Excluir strings que casualmente sean UUIDs válidos
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return !uuidRegex.test(s);
        }),
        (invalidId) => {
          const result = createBookingSchema.safeParse({
            propertyId: invalidId,
            guestName: 'Valid Guest',
            checkIn: '2025-06-01',
            checkOut: '2025-06-05',
            totalAmountUSD: 100,
            bookingType: 'refundable',
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test 2: guestName vacío → safeParse falla
   * **Validates: Requirements 8.1, 8.2**
   */
  it('should reject empty guestName', () => {
    fc.assert(
      fc.property(fc.constant(''), (emptyName) => {
        const result = createBookingSchema.safeParse({
          propertyId: '550e8400-e29b-41d4-a716-446655440000',
          guestName: emptyName,
          checkIn: '2025-06-01',
          checkOut: '2025-06-05',
          totalAmountUSD: 100,
          bookingType: 'refundable',
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 1 }
    );
  });

  /**
   * Test 3: checkIn no es fecha ISO → safeParse falla
   * **Validates: Requirements 8.1, 8.2**
   */
  it('should reject checkIn that is not a valid ISO date (YYYY-MM-DD)', () => {
    const nonIsoDateArb = fc.string({ minLength: 1 }).filter((s) => {
      return !/^\d{4}-\d{2}-\d{2}$/.test(s);
    });

    fc.assert(
      fc.property(nonIsoDateArb, (invalidDate) => {
        const result = createBookingSchema.safeParse({
          propertyId: '550e8400-e29b-41d4-a716-446655440000',
          guestName: 'Valid Guest',
          checkIn: invalidDate,
          checkOut: '2025-06-05',
          totalAmountUSD: 100,
          bookingType: 'refundable',
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test 4: checkOut <= checkIn → safeParse falla
   * **Validates: Requirements 8.1, 8.2**
   */
  it('should reject when checkOut is equal to or before checkIn', () => {
    fc.assert(
      fc.property(
        isoDateArb,
        fc.integer({ min: 0, max: 365 }),
        (checkIn, daysBefore) => {
          const checkInDate = new Date(checkIn);
          const checkOutDate = new Date(checkInDate);
          // checkOut == checkIn (daysBefore=0) o checkOut < checkIn (daysBefore > 0)
          checkOutDate.setDate(checkOutDate.getDate() - daysBefore);
          const checkOut = checkOutDate.toISOString().slice(0, 10);

          const result = createBookingSchema.safeParse({
            propertyId: '550e8400-e29b-41d4-a716-446655440000',
            guestName: 'Valid Guest',
            checkIn,
            checkOut,
            totalAmountUSD: 100,
            bookingType: 'refundable',
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test 5: totalAmountUSD negativo o cero → safeParse falla
   * **Validates: Requirements 8.1, 8.2**
   */
  it('should reject totalAmountUSD that is negative or zero', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100000, max: 0, noNaN: true }),
        (invalidAmount) => {
          const result = createBookingSchema.safeParse({
            propertyId: '550e8400-e29b-41d4-a716-446655440000',
            guestName: 'Valid Guest',
            checkIn: '2025-06-01',
            checkOut: '2025-06-05',
            totalAmountUSD: invalidAmount,
            bookingType: 'refundable',
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test 6: bookingType no es 'refundable' ni 'non_refundable' → safeParse falla
   * **Validates: Requirements 8.1, 8.2**
   */
  it('should reject bookingType that is not refundable or non_refundable', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(
          (s) => s !== 'refundable' && s !== 'non_refundable'
        ),
        (invalidType) => {
          const result = createBookingSchema.safeParse({
            propertyId: '550e8400-e29b-41d4-a716-446655440000',
            guestName: 'Valid Guest',
            checkIn: '2025-06-01',
            checkOut: '2025-06-05',
            totalAmountUSD: 100,
            bookingType: invalidType,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test 7: request completamente válido → safeParse éxito (round-trip)
   * **Validates: Requirements 8.1, 8.2**
   */
  it('should accept any fully valid booking request', () => {
    fc.assert(
      fc.property(validBookingArb, (validRequest) => {
        const result = createBookingSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.propertyId).toBe(validRequest.propertyId);
          expect(result.data.guestName).toBe(validRequest.guestName);
          expect(result.data.checkIn).toBe(validRequest.checkIn);
          expect(result.data.checkOut).toBe(validRequest.checkOut);
          expect(result.data.totalAmountUSD).toBe(validRequest.totalAmountUSD);
          expect(result.data.bookingType).toBe(validRequest.bookingType);
        }
      }),
      { numRuns: 100 }
    );
  });
});
