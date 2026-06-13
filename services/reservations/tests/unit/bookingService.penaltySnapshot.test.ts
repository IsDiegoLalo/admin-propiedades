import fc from 'fast-check';

/**
 * Property 17: Snapshot de cancellation penalty en reserva
 * **Validates: Requirements 8.3, 10.4**
 *
 * Al crear una reserva, el cancellationPenaltyPercent se copia como snapshot
 * desde el Properties Service. Cambios posteriores en la propiedad no afectan
 * la reserva ya creada.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock paymentGatewayMock: charge siempre éxito
jest.mock('../../src/services/paymentGatewayMock', () => ({
  paymentGateway: {
    charge: jest.fn().mockResolvedValue({ success: true, transactionId: 'txn-snap' }),
    refund: jest.fn(),
  },
}));

// Mock propertiesClient: se configura dinámicamente por test
const mockGetPropertyInfo = jest.fn();
jest.mock('../../src/services/propertiesClient', () => ({
  getPropertyInfo: (...args: unknown[]) => mockGetPropertyInfo(...args),
}));

// ── In-memory store que simula transacciones Knex ──────────────────────────────

interface BookingRow {
  id: string;
  property_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  total_amount_usd: number;
  booking_type: string;
  cancellation_penalty_pct: number;
  booking_status: string;
  payment_status: string;
  created_at: Date;
  updated_at: Date;
}

const bookingsStore: BookingRow[] = [];

function createTrxMock() {
  let pendingRow: BookingRow | null = null;

  const trxChain: Record<string, unknown> = {
    insert: jest.fn((data: Record<string, unknown>) => {
      pendingRow = {
        id: `booking-${bookingsStore.length + 1}`,
        property_id: data['property_id'] as string,
        guest_name: data['guest_name'] as string,
        check_in: data['check_in'] as string,
        check_out: data['check_out'] as string,
        total_amount_usd: data['total_amount_usd'] as number,
        booking_type: data['booking_type'] as string,
        cancellation_penalty_pct: data['cancellation_penalty_pct'] as number,
        booking_status: data['booking_status'] as string,
        payment_status: data['payment_status'] as string,
        created_at: new Date(),
        updated_at: new Date(),
      };
      return trxChain;
    }),
    returning: jest.fn(() => {
      return Promise.resolve(pendingRow ? [pendingRow] : []);
    }),
  };

  const trx = jest.fn((_tableName: string) => trxChain);

  const transactionImpl = async (callback: (t: typeof trx) => Promise<unknown>) => {
    try {
      const result = await callback(trx);
      if (pendingRow) {
        bookingsStore.push(pendingRow);
        pendingRow = null;
      }
      return result;
    } catch (err) {
      pendingRow = null;
      throw err;
    }
  };

  return transactionImpl;
}

// Mock db (knex): overlap check (sin solapamiento) + transaction
jest.mock('../../src/db/postgres', () => {
  const overlapChain = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
  };

  const dbMock = jest.fn((_tableName: string) => {
    return {
      where: jest.fn((...args: unknown[]) => {
        if (typeof args[0] === 'function') {
          const subCtx = {
            where: jest.fn().mockReturnValue({ andWhere: jest.fn().mockReturnValue(overlapChain) }),
          };
          (args[0] as (this: typeof subCtx) => void).call(subCtx);
          return overlapChain;
        }
        return {
          where: jest.fn((...innerArgs: unknown[]) => {
            if (typeof innerArgs[0] === 'function') {
              const subCtx = {
                where: jest.fn().mockReturnValue({ andWhere: jest.fn().mockReturnValue(overlapChain) }),
              };
              (innerArgs[0] as (this: typeof subCtx) => void).call(subCtx);
              return overlapChain;
            }
            return overlapChain;
          }),
          first: jest.fn().mockResolvedValue(null),
        };
      }),
    };
  });

  (dbMock as unknown as Record<string, unknown>)['transaction'] = jest.fn(
    (callback: (trx: unknown) => Promise<unknown>) => {
      return createTrxMock()(callback as (t: unknown) => Promise<unknown>);
    }
  );

  return { db: dbMock };
});

// Mock logger
jest.mock('../../src/middleware/requestLogger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Importar después de los mocks
import { createBooking } from '../../src/services/bookingService';

// ── Arbitrarios ────────────────────────────────────────────────────────────────

const isoDateArb = fc
  .date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
  .map((d) => d.toISOString().slice(0, 10));

const validBookingInputArb = fc
  .tuple(
    fc.uuid(),
    fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    isoDateArb,
    fc.integer({ min: 1, max: 30 }),
    fc.double({ min: 0.01, max: 100000, noNaN: true }).map((n) => Math.round(n * 100) / 100),
    fc.constantFrom('refundable' as const, 'non_refundable' as const)
  )
  .map(([propertyId, guestName, checkIn, daysAhead, totalAmountUSD, bookingType]) => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + daysAhead);
    const checkOut = checkOutDate.toISOString().slice(0, 10);
    return { propertyId, guestName, checkIn, checkOut, totalAmountUSD, bookingType };
  });

// Genera pares de penalidades diferentes (0-100)
const penaltyPairArb = fc
  .tuple(
    fc.integer({ min: 0, max: 100 }),
    fc.integer({ min: 0, max: 100 })
  )
  .filter(([a, b]) => a !== b);

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Property 17: Snapshot de cancellation penalty en reserva', () => {
  beforeEach(() => {
    bookingsStore.length = 0;
    mockGetPropertyInfo.mockReset();
  });

  /**
   * Al crear una reserva, el cancellationPenaltyPercent del response debe ser
   * exactamente el valor que retornó getPropertyInfo en ese momento.
   * **Validates: Requirements 8.3, 10.4**
   */
  it('debe copiar el cancellationPenaltyPercent de la propiedad al crear la reserva', () => {
    return fc.assert(
      fc.asyncProperty(
        validBookingInputArb,
        fc.integer({ min: 0, max: 100 }),
        async (input, penalty) => {
          mockGetPropertyInfo.mockResolvedValue({ cancellationPenaltyPercent: penalty });

          const result = await createBooking(input);

          expect(result.cancellationPenaltyPercent).toBe(penalty);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Si después de crear la reserva la propiedad cambia su penalty, la reserva
   * existente conserva el valor original (snapshot independiente).
   * **Validates: Requirements 8.3, 10.4**
   */
  it('debe conservar el penalty original sin importar cambios posteriores en la propiedad', () => {
    return fc.assert(
      fc.asyncProperty(
        validBookingInputArb,
        penaltyPairArb,
        async (input, [penalty1, penalty2]) => {
          // Al momento de crear, la propiedad tiene penalty1
          mockGetPropertyInfo.mockResolvedValue({ cancellationPenaltyPercent: penalty1 });

          const result = await createBooking(input);

          // Verificar que el snapshot es penalty1
          expect(result.cancellationPenaltyPercent).toBe(penalty1);

          // Simular que la propiedad cambia a penalty2
          mockGetPropertyInfo.mockResolvedValue({ cancellationPenaltyPercent: penalty2 });

          // El booking ya creado conserva penalty1 (almacenado en su propia columna)
          const storedBooking = bookingsStore[bookingsStore.length - 1];
          expect(storedBooking).toBeDefined();
          expect(storedBooking!.cancellation_penalty_pct).toBe(penalty1);
          // El valor almacenado es independiente del nuevo valor de la propiedad
          expect(storedBooking!.cancellation_penalty_pct).not.toBe(penalty2);
        }
      ),
      { numRuns: 50 }
    );
  });
});
