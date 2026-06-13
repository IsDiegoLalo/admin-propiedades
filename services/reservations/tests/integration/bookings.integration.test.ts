/**
 * Tests de integración del Reservations Service
 * Validates: Requirements 16.2
 *
 * Usa Supertest contra la app Express con mocks de BD y servicios externos.
 */

// Configurar variables de entorno ANTES de importar cualquier módulo del servicio
process.env['POSTGRES_HOST'] = 'localhost';
process.env['POSTGRES_PORT'] = '5432';
process.env['POSTGRES_DB'] = 'test_reservations';
process.env['POSTGRES_USER'] = 'test';
process.env['POSTGRES_PASSWORD'] = 'test';
process.env['PROPERTIES_SERVICE_URL'] = 'http://localhost:3001';
process.env['PAYMENT_MOCK_FAILURE_RATE'] = '0';
process.env['PORT'] = '3099';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock de Knex (DB)
const mockDbFirst = jest.fn();
const mockDbWhere = jest.fn();
const mockDbInsert = jest.fn();
const mockDbUpdate = jest.fn();
const mockDbReturning = jest.fn();
const mockDbOrderBy = jest.fn();
const mockDbAndWhere = jest.fn();
const mockDbRaw = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });

// Chainable query builder mock
function createQueryBuilder() {
  const builder: Record<string, jest.Mock> = {};
  builder['where'] = jest.fn().mockReturnValue(builder);
  builder['andWhere'] = jest.fn().mockReturnValue(builder);
  builder['first'] = jest.fn().mockResolvedValue(undefined);
  builder['insert'] = jest.fn().mockReturnValue(builder);
  builder['update'] = jest.fn().mockReturnValue(builder);
  builder['returning'] = jest.fn().mockResolvedValue([]);
  builder['orderBy'] = jest.fn().mockResolvedValue([]);
  return builder;
}

let queryBuilder = createQueryBuilder();

const mockDb = jest.fn().mockImplementation(() => queryBuilder) as unknown as jest.Mock & {
  raw: jest.Mock;
  transaction: jest.Mock;
  migrate: { latest: jest.Mock };
};
mockDb.raw = mockDbRaw;
mockDb.transaction = jest.fn();
mockDb.migrate = { latest: jest.fn().mockResolvedValue(undefined) };

jest.mock('../../src/db/postgres', () => ({
  db: mockDb,
  checkPostgresConnection: jest.fn().mockResolvedValue(undefined),
}));

// Mock de propertiesClient
const mockGetPropertyInfo = jest.fn();
jest.mock('../../src/services/propertiesClient', () => ({
  getPropertyInfo: (...args: unknown[]) => mockGetPropertyInfo(...args),
}));

// Mock de paymentGateway
const mockCharge = jest.fn();
const mockRefund = jest.fn();
jest.mock('../../src/services/paymentGatewayMock', () => ({
  paymentGateway: {
    charge: (...args: unknown[]) => mockCharge(...args),
    refund: (...args: unknown[]) => mockRefund(...args),
  },
}));

import request from 'supertest';
import { app } from '../../src/index';

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_BOOKING_INPUT = {
  propertyId: '550e8400-e29b-41d4-a716-446655440000',
  guestName: 'Juan Pérez',
  checkIn: '2025-03-01',
  checkOut: '2025-03-05',
  totalAmountUSD: 500,
  bookingType: 'refundable' as const,
};

const MOCK_BOOKING_ROW = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  property_id: '550e8400-e29b-41d4-a716-446655440000',
  guest_name: 'Juan Pérez',
  check_in: new Date('2025-03-01'),
  check_out: new Date('2025-03-05'),
  total_amount_usd: 500,
  booking_type: 'refundable' as const,
  cancellation_penalty_pct: 0,
  booking_status: 'confirmed' as const,
  payment_status: 'paid' as const,
  cancelled_at: null,
  created_at: new Date('2025-01-10T10:00:00Z'),
  updated_at: new Date('2025-01-10T10:00:00Z'),
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Reservations Service — Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryBuilder = createQueryBuilder();
    (mockDb as jest.Mock).mockImplementation(() => queryBuilder);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 1. POST /bookings — happy path
  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /bookings — happy path', () => {
    it('should return 201 with bookingStatus=confirmed and paymentStatus=paid', async () => {
      // No overlap
      queryBuilder['where'] = jest.fn().mockReturnValue(queryBuilder);
      queryBuilder['first'] = jest.fn().mockResolvedValue(undefined); // no overlap

      // propertiesClient returns penalty
      mockGetPropertyInfo.mockResolvedValue({ cancellationPenaltyPercent: 10 });

      // Transaction mock: simula el comportamiento de knex.transaction
      mockDb.transaction = jest.fn().mockImplementation(async (callback: (trx: unknown) => Promise<unknown>) => {
        const trxBuilder = createQueryBuilder();
        trxBuilder['returning'] = jest.fn().mockResolvedValue([MOCK_BOOKING_ROW]);
        const trx = jest.fn().mockReturnValue(trxBuilder) as unknown;

        // Payment succeeds
        mockCharge.mockResolvedValue({ success: true, transactionId: 'tx-123' });

        return callback(trx);
      });

      const res = await request(app).post('/bookings').send(VALID_BOOKING_INPUT);

      expect(res.status).toBe(201);
      expect(res.body.bookingStatus).toBe('confirmed');
      expect(res.body.paymentStatus).toBe('paid');
      expect(res.body.propertyId).toBe(VALID_BOOKING_INPUT.propertyId);
      expect(res.body.guestName).toBe('Juan Pérez');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 2. POST /bookings — payment failure → 402
  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /bookings — payment failure', () => {
    it('should return 402 when payment is declined', async () => {
      // No overlap
      queryBuilder['first'] = jest.fn().mockResolvedValue(undefined);

      mockGetPropertyInfo.mockResolvedValue({ cancellationPenaltyPercent: 0 });

      // Transaction that throws PaymentError
      mockDb.transaction = jest.fn().mockImplementation(async (callback: (trx: unknown) => Promise<unknown>) => {
        const trxBuilder = createQueryBuilder();
        trxBuilder['returning'] = jest.fn().mockResolvedValue([MOCK_BOOKING_ROW]);
        const trx = jest.fn().mockReturnValue(trxBuilder) as unknown;

        // Payment fails
        mockCharge.mockResolvedValue({ success: false, errorCode: 'PAYMENT_DECLINED' });

        return callback(trx);
      });

      const res = await request(app).post('/bookings').send(VALID_BOOKING_INPUT);

      expect(res.status).toBe(402);
      expect(res.body.error).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 3. POST /bookings — overlap → 409
  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /bookings — date overlap', () => {
    it('should return 409 when dates overlap with existing confirmed booking', async () => {
      // Simulate overlap found
      queryBuilder['where'] = jest.fn().mockReturnValue(queryBuilder);
      queryBuilder['first'] = jest.fn().mockResolvedValue({ id: 'existing-booking' });

      const res = await request(app).post('/bookings').send(VALID_BOOKING_INPUT);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('solapan');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 4. POST /bookings — validation error → 422
  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /bookings — validation error', () => {
    it('should return 422 when required fields are missing', async () => {
      const res = await request(app).post('/bookings').send({});

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toBeDefined();
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it('should return 422 when checkOut is before checkIn', async () => {
      const invalidInput = {
        ...VALID_BOOKING_INPUT,
        checkIn: '2025-03-05',
        checkOut: '2025-03-01',
      };

      const res = await request(app).post('/bookings').send(invalidInput);

      expect(res.status).toBe(422);
    });

    it('should return 422 when totalAmountUSD is negative', async () => {
      const invalidInput = {
        ...VALID_BOOKING_INPUT,
        totalAmountUSD: -100,
      };

      const res = await request(app).post('/bookings').send(invalidInput);

      expect(res.status).toBe(422);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 5. DELETE /bookings/:id — refundable booking → 200 with paymentStatus=refunded
  // ────────────────────────────────────────────────────────────────────────────
  describe('DELETE /bookings/:id — refundable booking', () => {
    it('should return 200 with paymentStatus=refunded for refundable booking', async () => {
      const confirmedBooking = {
        ...MOCK_BOOKING_ROW,
        booking_type: 'refundable' as const,
        cancellation_penalty_pct: 0,
      };

      // First call: find the booking
      queryBuilder['first'] = jest.fn().mockResolvedValue(confirmedBooking);

      // Refund succeeds
      mockRefund.mockResolvedValue({ success: true, refundedAmount: 500 });

      // Update returns cancelled row
      const cancelledRow = {
        ...confirmedBooking,
        booking_status: 'cancelled' as const,
        payment_status: 'refunded' as const,
        cancelled_at: new Date('2025-01-15T10:00:00Z'),
        updated_at: new Date('2025-01-15T10:00:00Z'),
      };
      queryBuilder['update'] = jest.fn().mockReturnValue(queryBuilder);
      queryBuilder['returning'] = jest.fn().mockResolvedValue([cancelledRow]);

      const res = await request(app).delete(`/bookings/${MOCK_BOOKING_ROW.id}`);

      expect(res.status).toBe(200);
      expect(res.body.paymentStatus).toBe('refunded');
      expect(res.body.bookingStatus).toBe('cancelled');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 6. DELETE /bookings/:id — non_refundable booking → 200 with partial_refund
  // ────────────────────────────────────────────────────────────────────────────
  describe('DELETE /bookings/:id — non_refundable booking', () => {
    it('should return 200 with paymentStatus=partial_refund for non_refundable booking with penalty', async () => {
      const nonRefundableBooking = {
        ...MOCK_BOOKING_ROW,
        booking_type: 'non_refundable' as const,
        cancellation_penalty_pct: 20,
        total_amount_usd: 1000,
      };

      queryBuilder['first'] = jest.fn().mockResolvedValue(nonRefundableBooking);

      // Refund succeeds (partial)
      mockRefund.mockResolvedValue({ success: true, refundedAmount: 800 });

      const cancelledRow = {
        ...nonRefundableBooking,
        booking_status: 'cancelled' as const,
        payment_status: 'partial_refund' as const,
        cancelled_at: new Date('2025-01-15T10:00:00Z'),
        updated_at: new Date('2025-01-15T10:00:00Z'),
      };
      queryBuilder['update'] = jest.fn().mockReturnValue(queryBuilder);
      queryBuilder['returning'] = jest.fn().mockResolvedValue([cancelledRow]);

      const res = await request(app).delete(`/bookings/${MOCK_BOOKING_ROW.id}`);

      expect(res.status).toBe(200);
      expect(res.body.paymentStatus).toBe('partial_refund');
      expect(res.body.bookingStatus).toBe('cancelled');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 7. DELETE /bookings/:id — already cancelled → 409
  // ────────────────────────────────────────────────────────────────────────────
  describe('DELETE /bookings/:id — already cancelled', () => {
    it('should return 409 when booking is already cancelled', async () => {
      const cancelledBooking = {
        ...MOCK_BOOKING_ROW,
        booking_status: 'cancelled' as const,
        payment_status: 'refunded' as const,
        cancelled_at: new Date('2025-01-12T10:00:00Z'),
      };

      queryBuilder['first'] = jest.fn().mockResolvedValue(cancelledBooking);

      const res = await request(app).delete(`/bookings/${MOCK_BOOKING_ROW.id}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('confirmed');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 8. GET /bookings/:id — not found → 404
  // ────────────────────────────────────────────────────────────────────────────
  describe('GET /bookings/:id — not found', () => {
    it('should return 404 when booking does not exist', async () => {
      queryBuilder['first'] = jest.fn().mockResolvedValue(undefined);

      const res = await request(app).get('/bookings/non-existent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 9. GET /health → 200
  // ────────────────────────────────────────────────────────────────────────────
  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
