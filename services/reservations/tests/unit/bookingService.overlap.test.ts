import fc from 'fast-check';
import { ConflictError } from '../../src/middleware/errors';

/**
 * Property 16: Exclusión mutua de fechas solapadas
 * **Validates: Requirements 7.5**
 *
 * Cuando un rango de fechas se solapa (parcial o totalmente) con una reserva
 * existente confirmada para la misma propiedad, createBooking debe lanzar
 * ConflictError (HTTP 409).
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock paymentGatewayMock (no relevante para este test)
jest.mock('../../src/services/paymentGatewayMock', () => ({
  paymentGateway: {
    charge: jest.fn().mockResolvedValue({ success: true, transactionId: 'tx-123' }),
    refund: jest.fn(),
  },
}));

// Mock propertiesClient (no relevante para este test)
jest.mock('../../src/services/propertiesClient', () => ({
  getPropertyInfo: jest.fn().mockResolvedValue({ cancellationPenaltyPercent: 10 }),
}));

// Mock logger para evitar output durante tests
jest.mock('../../src/middleware/requestLogger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock db (knex): la verificación de solapamiento SIEMPRE retorna un booking existente
jest.mock('../../src/db/postgres', () => {
  // Simula que hay un booking confirmado que se solapa
  const existingBooking = {
    id: 'existing-booking-id',
    property_id: 'prop-1',
    booking_status: 'confirmed',
    check_in: '2024-06-01',
    check_out: '2024-06-10',
  };

  const overlapChain = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(existingBooking), // Siempre retorna overlap
  };

  const dbMock = jest.fn((_tableName: string) => {
    return {
      where: jest.fn((...args: unknown[]) => {
        if (typeof args[0] === 'function') {
          // Ejecutar la función sub-where sin fallar
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
          first: jest.fn().mockResolvedValue(existingBooking),
        };
      }),
    };
  });

  // transaction no debería ser llamado si el overlap es detectado primero
  (dbMock as unknown as Record<string, unknown>)['transaction'] = jest.fn();

  return { db: dbMock };
});

// Importar después de los mocks
import { createBooking } from '../../src/services/bookingService';

// ── Arbitrarios ────────────────────────────────────────────────────────────────

/**
 * Genera un par de rangos de fechas que siempre se solapan.
 * Estrategia: generar un rango base [baseStart, baseEnd] y luego generar
 * un segundo rango que se solapa parcial o totalmente con el primero.
 */
const overlappingDateRangesArb = fc
  .tuple(
    // Fecha base de inicio (entre 2024 y 2029)
    fc.date({ min: new Date('2024-01-01'), max: new Date('2029-12-01') }),
    // Duración de la reserva existente (1-30 días)
    fc.integer({ min: 1, max: 30 }),
    // Tipo de solapamiento: 0=parcial inicio, 1=parcial final, 2=contenido total, 3=envuelve total
    fc.integer({ min: 0, max: 3 }),
    // Offset para solapamiento parcial (1-15 días)
    fc.integer({ min: 1, max: 15 })
  )
  .map(([baseStart, duration, overlapType, offset]) => {
    const baseEnd = new Date(baseStart);
    baseEnd.setDate(baseEnd.getDate() + duration);

    let newCheckIn: Date;
    let newCheckOut: Date;

    switch (overlapType) {
      case 0:
        // Parcial al inicio: nuevo rango empieza antes y termina dentro del existente
        newCheckIn = new Date(baseStart);
        newCheckIn.setDate(newCheckIn.getDate() - offset);
        newCheckOut = new Date(baseStart);
        newCheckOut.setDate(newCheckOut.getDate() + Math.max(1, Math.floor(duration / 2)));
        break;
      case 1:
        // Parcial al final: nuevo rango empieza dentro del existente y termina después
        newCheckIn = new Date(baseStart);
        newCheckIn.setDate(newCheckIn.getDate() + Math.max(0, Math.floor(duration / 2)));
        newCheckOut = new Date(baseEnd);
        newCheckOut.setDate(newCheckOut.getDate() + offset);
        break;
      case 2:
        // Contenido total: nuevo rango está completamente dentro del existente
        newCheckIn = new Date(baseStart);
        newCheckIn.setDate(newCheckIn.getDate() + Math.min(offset, Math.max(0, duration - 2)));
        newCheckOut = new Date(newCheckIn);
        newCheckOut.setDate(newCheckOut.getDate() + Math.max(1, Math.min(offset, duration - 1)));
        // Asegurar que no exceda baseEnd
        if (newCheckOut > baseEnd) {
          newCheckOut = new Date(baseEnd);
        }
        // Garantizar al menos 1 día
        if (newCheckOut <= newCheckIn) {
          newCheckOut = new Date(newCheckIn);
          newCheckOut.setDate(newCheckOut.getDate() + 1);
        }
        break;
      default:
        // Envuelve total: nuevo rango contiene completamente al existente
        newCheckIn = new Date(baseStart);
        newCheckIn.setDate(newCheckIn.getDate() - offset);
        newCheckOut = new Date(baseEnd);
        newCheckOut.setDate(newCheckOut.getDate() + offset);
        break;
    }

    // Asegurar checkOut > checkIn siempre
    if (newCheckOut <= newCheckIn) {
      newCheckOut = new Date(newCheckIn);
      newCheckOut.setDate(newCheckOut.getDate() + 1);
    }

    return {
      checkIn: newCheckIn.toISOString().slice(0, 10),
      checkOut: newCheckOut.toISOString().slice(0, 10),
    };
  });

const validBookingInputArb = fc
  .tuple(
    fc.uuid(),
    fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
    overlappingDateRangesArb,
    fc.double({ min: 0.01, max: 50000, noNaN: true }).map((n) => Math.round(n * 100) / 100),
    fc.constantFrom('refundable' as const, 'non_refundable' as const)
  )
  .map(([propertyId, guestName, dates, totalAmountUSD, bookingType]) => ({
    propertyId,
    guestName,
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
    totalAmountUSD,
    bookingType,
  }));

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Property 16: Exclusión mutua de fechas solapadas', () => {
  /**
   * Para cualquier rango de fechas que se solapa con una reserva existente
   * confirmada, createBooking debe lanzar ConflictError (HTTP 409).
   * **Validates: Requirements 7.5**
   */
  it('debe lanzar ConflictError cuando las fechas se solapan con una reserva confirmada', () => {
    return fc.assert(
      fc.asyncProperty(validBookingInputArb, async (input) => {
        await expect(createBooking(input)).rejects.toThrow(ConflictError);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * El mensaje de error debe indicar solapamiento de fechas.
   * **Validates: Requirements 7.5**
   */
  it('el error de conflicto debe contener mensaje descriptivo sobre solapamiento', () => {
    return fc.assert(
      fc.asyncProperty(validBookingInputArb, async (input) => {
        let caughtError: unknown;
        try {
          await createBooking(input);
        } catch (err) {
          caughtError = err;
        }
        expect(caughtError).toBeInstanceOf(ConflictError);
        expect((caughtError as ConflictError).message).toMatch(/solap/i);
      }),
      { numRuns: 50 }
    );
  });
});
