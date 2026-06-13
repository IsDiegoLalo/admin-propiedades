import fc from 'fast-check';
import { ConflictError } from '../../src/middleware/errors';

/**
 * Property 19: Transición de estado de cancelación
 * **Validates: Requirements 9.3**
 *
 * Cancelar una reserva que ya tiene estado 'cancelled' debe lanzar
 * ConflictError (HTTP 409) sin modificar el estado del booking.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock paymentGatewayMock: no debería ser llamado en este escenario
jest.mock('../../src/services/paymentGatewayMock', () => ({
  paymentGateway: {
    charge: jest.fn(),
    refund: jest.fn(),
  },
}));

// Mock propertiesClient: no debería ser llamado en este escenario
jest.mock('../../src/services/propertiesClient', () => ({
  getPropertyInfo: jest.fn(),
}));

// ── Estado compartido para verificar no-modificación ───────────────────────────

let updateCalled = false;

// Mock db (knex): retorna un booking ya cancelado
jest.mock('../../src/db/postgres', () => {
  const buildWhereChain = (bookingId: string) => ({
    first: jest.fn().mockResolvedValue({
      id: bookingId,
      property_id: 'prop-123',
      guest_name: 'Test Guest',
      check_in: new Date('2025-01-10'),
      check_out: new Date('2025-01-15'),
      total_amount_usd: 500,
      booking_type: 'non_refundable',
      cancellation_penalty_pct: 20,
      booking_status: 'cancelled',
      payment_status: 'refunded',
      cancelled_at: new Date('2025-01-05'),
      created_at: new Date('2025-01-01'),
      updated_at: new Date('2025-01-05'),
    }),
  });

  const dbMock = jest.fn((_tableName: string) => ({
    where: jest.fn((criteria: Record<string, string>) => {
      // Si se llama con un objeto {id: ...} es la búsqueda del booking
      if (criteria && typeof criteria === 'object' && 'id' in criteria) {
        return {
          first: jest.fn().mockResolvedValue({
            id: criteria.id,
            property_id: 'prop-123',
            guest_name: 'Test Guest',
            check_in: new Date('2025-01-10'),
            check_out: new Date('2025-01-15'),
            total_amount_usd: 500,
            booking_type: 'non_refundable',
            cancellation_penalty_pct: 20,
            booking_status: 'cancelled',
            payment_status: 'refunded',
            cancelled_at: new Date('2025-01-05'),
            created_at: new Date('2025-01-01'),
            updated_at: new Date('2025-01-05'),
          }),
          update: jest.fn(() => {
            updateCalled = true;
            return { returning: jest.fn().mockResolvedValue([]) };
          }),
        };
      }
      return buildWhereChain('unknown');
    }),
  }));

  // Añadir transaction mock (no debería ser necesario para cancelBooking)
  (dbMock as unknown as Record<string, unknown>)['transaction'] = jest.fn();

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
import { cancelBooking } from '../../src/services/bookingService';
import { paymentGateway } from '../../src/services/paymentGatewayMock';

// ── Arbitrarios ────────────────────────────────────────────────────────────────

const bookingIdArb = fc.uuid();

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Property 19: Transición de estado de cancelación', () => {
  beforeEach(() => {
    updateCalled = false;
    jest.clearAllMocks();
  });

  /**
   * Cancelar un booking ya cancelado debe lanzar ConflictError.
   * **Validates: Requirements 9.3**
   */
  it('debe lanzar ConflictError al intentar cancelar un booking ya cancelado', () => {
    return fc.assert(
      fc.asyncProperty(bookingIdArb, async (bookingId) => {
        await expect(cancelBooking(bookingId)).rejects.toThrow(ConflictError);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * El estado del booking no debe ser modificado (no se debe llamar a update).
   * **Validates: Requirements 9.3**
   */
  it('no debe modificar el estado del booking cuando ya está cancelado', () => {
    return fc.assert(
      fc.asyncProperty(bookingIdArb, async (bookingId) => {
        try {
          await cancelBooking(bookingId);
        } catch {
          // Se espera el error
        }

        // Verificar que no se intentó actualizar el registro
        expect(updateCalled).toBe(false);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * No se debe invocar el payment gateway al cancelar un booking ya cancelado.
   * **Validates: Requirements 9.3**
   */
  it('no debe invocar el payment gateway para un booking ya cancelado', () => {
    return fc.assert(
      fc.asyncProperty(bookingIdArb, async (bookingId) => {
        try {
          await cancelBooking(bookingId);
        } catch {
          // Se espera el error
        }

        // El refund no debe ser llamado
        expect(paymentGateway.refund).not.toHaveBeenCalled();
      }),
      { numRuns: 50 }
    );
  });
});
