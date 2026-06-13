import fc from 'fast-check';
import { PaymentError } from '../../src/middleware/errors';

/**
 * Property 14: Atomicidad de creación de reserva
 * **Validates: Requirements 7.1, 7.2, 7.3**
 *
 * Si el Payment Gateway Mock devuelve fallo, no debe existir registro
 * de reserva en la base de datos (la transacción debe hacer rollback).
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock paymentGatewayMock: charge siempre falla
jest.mock('../../src/services/paymentGatewayMock', () => ({
  paymentGateway: {
    charge: jest.fn().mockResolvedValue({ success: false, errorCode: 'PAYMENT_DECLINED' }),
    refund: jest.fn(),
  },
}));

// Mock propertiesClient: siempre retorna penalidad válida
jest.mock('../../src/services/propertiesClient', () => ({
  getPropertyInfo: jest.fn().mockResolvedValue({ cancellationPenaltyPercent: 10 }),
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

// Builder para simular la cadena fluida de Knex dentro de una transacción
function createTrxMock() {
  let pendingRow: BookingRow | null = null;

  const trxChain: Record<string, unknown> = {
    insert: jest.fn((data: Record<string, unknown>) => {
      pendingRow = {
        id: 'generated-uuid',
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
      // Retorna la fila pendiente (aún no commitada al store)
      return Promise.resolve(pendingRow ? [pendingRow] : []);
    }),
  };

  // La función trx se comporta como knex('tableName')
  const trx = jest.fn((_tableName: string) => trxChain);

  // El callback de db.transaction recibe trx y:
  // - Si resuelve: commit → insertar en store
  // - Si lanza: rollback → no insertar
  const transactionImpl = async (callback: (t: typeof trx) => Promise<unknown>) => {
    try {
      const result = await callback(trx);
      // Commit: agregar fila pendiente al store
      if (pendingRow) {
        bookingsStore.push(pendingRow);
        pendingRow = null;
      }
      return result;
    } catch (err) {
      // Rollback: descartar fila pendiente
      pendingRow = null;
      throw err;
    }
  };

  return transactionImpl;
}

// Mock db (knex): overlap check + transaction
jest.mock('../../src/db/postgres', () => {
  const overlapChain = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null), // sin solapamiento
  };

  // Simular la cadena: db('bookings').where(...).where(...).where(fn).first()
  const dbMock = jest.fn((_tableName: string) => {
    return {
      where: jest.fn((...args: unknown[]) => {
        // Si el primer arg es una función, es el sub-where del overlap check
        if (typeof args[0] === 'function') {
          // Ejecutar la función con contexto mock para no fallar
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

  // Cada llamada a db.transaction crea un nuevo contexto de transacción
  (dbMock as unknown as Record<string, unknown>)['transaction'] = jest.fn(
    (callback: (trx: unknown) => Promise<unknown>) => {
      return createTrxMock()(callback as (t: unknown) => Promise<unknown>);
    }
  );

  return { db: dbMock };
});

// Mock logger para evitar output durante tests
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Property 14: Atomicidad de creación de reserva', () => {
  beforeEach(() => {
    // Limpiar store antes de cada test
    bookingsStore.length = 0;
  });

  /**
   * Cuando el pago falla, createBooking debe lanzar PaymentError
   * y NO debe haber filas en el store (rollback efectivo).
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  it('no debe persistir booking cuando el pago falla (rollback atómico)', () => {
    return fc.assert(
      fc.asyncProperty(validBookingInputArb, async (input) => {
        const initialCount = bookingsStore.length;

        // createBooking debe lanzar PaymentError
        await expect(createBooking(input)).rejects.toThrow(PaymentError);

        // No debe haber filas nuevas en el store
        expect(bookingsStore.length).toBe(initialCount);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * El error lanzado debe ser una instancia de PaymentError.
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  it('debe lanzar PaymentError cuando el pago es rechazado', () => {
    return fc.assert(
      fc.asyncProperty(validBookingInputArb, async (input) => {
        let caughtError: unknown;
        try {
          await createBooking(input);
        } catch (err) {
          caughtError = err;
        }
        expect(caughtError).toBeInstanceOf(PaymentError);
      }),
      { numRuns: 50 }
    );
  });
});
