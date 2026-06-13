/**
 * Tests de integración del Properties Service
 * Validates: Requirements 16.1
 *
 * Usa Supertest contra la app Express con mocks de Knex y Mongoose.
 */

// Configurar variables de entorno ANTES de importar cualquier módulo del servicio
process.env['POSTGRES_HOST'] = 'localhost';
process.env['POSTGRES_PORT'] = '5432';
process.env['POSTGRES_DB'] = 'test_properties';
process.env['POSTGRES_USER'] = 'test';
process.env['POSTGRES_PASSWORD'] = 'test';
process.env['MONGO_URI'] = 'mongodb://localhost:27017/test_properties';
process.env['REVIEWS_SERVICE_URL'] = 'http://localhost:3003';
process.env['PHOTO_MAX_SIZE_BYTES'] = '10485760';
process.env['PORT'] = '3098';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Chainable query builder mock para Knex
function createQueryBuilder() {
  const builder: Record<string, jest.Mock> = {};
  builder['where'] = jest.fn().mockReturnValue(builder);
  builder['andWhere'] = jest.fn().mockReturnValue(builder);
  builder['first'] = jest.fn().mockResolvedValue(undefined);
  builder['insert'] = jest.fn().mockReturnValue(builder);
  builder['update'] = jest.fn().mockReturnValue(builder);
  builder['delete'] = jest.fn().mockReturnValue(builder);
  builder['returning'] = jest.fn().mockResolvedValue([]);
  builder['orderBy'] = jest.fn().mockResolvedValue([]);
  return builder;
}

let queryBuilder = createQueryBuilder();

const mockDb = jest.fn().mockImplementation(() => queryBuilder) as unknown as jest.Mock & {
  raw: jest.Mock;
  migrate: { latest: jest.Mock };
};
mockDb.raw = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
mockDb.migrate = { latest: jest.fn().mockResolvedValue(undefined) };

jest.mock('../../src/db/postgres', () => ({
  db: mockDb,
  checkPostgresConnection: jest.fn().mockResolvedValue(undefined),
}));

// Mock de Mongoose y el modelo PropertyDocument
const mockMongoFindOne = jest.fn();
const mockMongoCreate = jest.fn();
const mockMongoFindOneAndUpdate = jest.fn();

jest.mock('../../src/db/mongo', () => ({
  connectMongo: jest.fn().mockResolvedValue(undefined),
  checkMongoConnection: jest.fn().mockResolvedValue(undefined),
  mongoose: {
    connection: { readyState: 1 },
  },
}));

jest.mock('../../src/models/propertyDoc', () => ({
  PropertyDocumentModel: {
    create: (...args: unknown[]) => mockMongoCreate(...args),
    findOne: (...args: unknown[]) => ({
      lean: () => mockMongoFindOne(...args),
    }),
    findOneAndUpdate: (...args: unknown[]) => mockMongoFindOneAndUpdate(...args),
  },
}));

// Mock de reviewsClient
const mockGetRating = jest.fn().mockResolvedValue(null);
jest.mock('../../src/services/reviewsClient', () => ({
  getRating: (...args: unknown[]) => mockGetRating(...args),
}));

import request from 'supertest';
import { app } from '../../src/index';

// ── Helpers ────────────────────────────────────────────────────────────────────

const NOW = new Date('2025-01-15T10:00:00Z');

const VALID_PROPERTY_INPUT = {
  name: 'Casa del Sol',
  type: 'house',
  address: 'Av. Libertador 1234, Buenos Aires',
  pricePerDayUSD: 150,
  currency: 'USD',
  rooms: 3,
  maxGuests: 6,
  cancellationPenaltyPercent: 10,
  services: ['wifi', 'pool'],
};

const MOCK_PROPERTY_ROW = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Casa del Sol',
  type: 'house',
  address: 'Av. Libertador 1234, Buenos Aires',
  price_per_day_usd: 150,
  currency: 'USD',
  max_guests: 6,
  cancellation_penalty_pct: 10,
  services: ['wifi', 'pool'],
  deleted: false,
  created_at: NOW,
  updated_at: NOW,
};

const MOCK_ROOM_ROW = {
  id: 'room-001',
  property_id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Dormitorio Principal',
  type: 'bedroom',
  beds: 2,
  description: 'Habitación con cama doble',
  active: true,
  created_at: NOW,
  updated_at: NOW,
};

const VALID_ROOM_INPUT = {
  name: 'Dormitorio Principal',
  type: 'bedroom',
  beds: 2,
  description: 'Habitación con cama doble',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Properties Service — Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryBuilder = createQueryBuilder();
    (mockDb as jest.Mock).mockImplementation(() => queryBuilder);
    mockMongoFindOne.mockResolvedValue(null);
    mockMongoCreate.mockResolvedValue({});
    mockMongoFindOneAndUpdate.mockResolvedValue({});
    mockGetRating.mockResolvedValue(null);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 1. POST /properties — happy path → 201
  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /properties — happy path', () => {
    it('should return 201 with created property', async () => {
      let callCount = 0;
      (mockDb as jest.Mock).mockImplementation(() => {
        callCount++;
        const qb = createQueryBuilder();
        if (callCount === 1) {
          // Insert property: db('properties').insert(...).returning('*')
          qb['insert'] = jest.fn().mockReturnValue(qb);
          qb['returning'] = jest.fn().mockResolvedValue([MOCK_PROPERTY_ROW]);
        } else {
          // Rooms query: db('rooms').where({ property_id, active })
          qb['where'] = jest.fn().mockResolvedValue([]);
        }
        return qb;
      });

      const res = await request(app).post('/properties').send(VALID_PROPERTY_INPUT);

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(MOCK_PROPERTY_ROW.id);
      expect(res.body.name).toBe('Casa del Sol');
      expect(res.body.type).toBe('house');
      expect(res.body.pricePerDayUSD).toBe(150);
      expect(res.body.services).toEqual(['wifi', 'pool']);
      expect(res.body.starRating).toBeNull();
      expect(res.body.deleted).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 2. POST /properties — validation error → 422
  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /properties — validation error', () => {
    it('should return 422 when required fields are missing', async () => {
      const res = await request(app).post('/properties').send({});

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toBeDefined();
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it('should return 422 when pricePerDayUSD is negative', async () => {
      const res = await request(app).post('/properties').send({
        ...VALID_PROPERTY_INPUT,
        pricePerDayUSD: -50,
      });

      expect(res.status).toBe(422);
    });

    it('should return 422 when type is invalid', async () => {
      const res = await request(app).post('/properties').send({
        ...VALID_PROPERTY_INPUT,
        type: 'castle',
      });

      expect(res.status).toBe(422);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 3. GET /properties — lista propiedades activas → 200
  // ────────────────────────────────────────────────────────────────────────────
  describe('GET /properties — list active properties', () => {
    it('should return 200 with array of active properties', async () => {
      // listProperties calls db('properties').where({ deleted: false })
      queryBuilder['where'] = jest.fn().mockResolvedValue([MOCK_PROPERTY_ROW]);

      // For each property, it queries rooms
      const roomQueryBuilder = createQueryBuilder();
      roomQueryBuilder['where'] = jest.fn().mockResolvedValue([]);

      // After initial where returns properties, subsequent calls return empty rooms
      let callCount = 0;
      (mockDb as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: properties where deleted=false
          return { where: jest.fn().mockResolvedValue([MOCK_PROPERTY_ROW]) };
        }
        // Subsequent calls: rooms
        return { where: jest.fn().mockResolvedValue([]) };
      });

      mockMongoFindOne.mockResolvedValue({ extendedAttributes: {}, photos: [] });

      const res = await request(app).get('/properties');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 4. GET /properties/:id — found → 200
  // ────────────────────────────────────────────────────────────────────────────
  describe('GET /properties/:id — found', () => {
    it('should return 200 with property data including starRating', async () => {
      let callCount = 0;
      (mockDb as jest.Mock).mockImplementation(() => {
        callCount++;
        const qb = createQueryBuilder();
        if (callCount === 1) {
          // properties.where({ id }).first()
          qb['where'] = jest.fn().mockReturnValue(qb);
          qb['first'] = jest.fn().mockResolvedValue(MOCK_PROPERTY_ROW);
        } else if (callCount === 2) {
          // rooms.where({ property_id, active })
          qb['where'] = jest.fn().mockResolvedValue([]);
        } else {
          // property_currency_rates (if currency requested)
          qb['where'] = jest.fn().mockReturnValue(qb);
          qb['first'] = jest.fn().mockResolvedValue(undefined);
        }
        return qb;
      });

      mockMongoFindOne.mockResolvedValue({ extendedAttributes: { pool: true }, photos: [] });
      mockGetRating.mockResolvedValue(4.5);

      const res = await request(app).get(`/properties/${MOCK_PROPERTY_ROW.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(MOCK_PROPERTY_ROW.id);
      expect(res.body.name).toBe('Casa del Sol');
      expect(res.body.starRating).toBe(4.5);
      expect(res.body.extendedAttributes).toEqual({ pool: true });
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 5. GET /properties/:id — not found → 404
  // ────────────────────────────────────────────────────────────────────────────
  describe('GET /properties/:id — not found', () => {
    it('should return 404 when property does not exist', async () => {
      (mockDb as jest.Mock).mockImplementation(() => {
        const qb = createQueryBuilder();
        qb['where'] = jest.fn().mockReturnValue(qb);
        qb['first'] = jest.fn().mockResolvedValue(undefined);
        return qb;
      });

      const res = await request(app).get('/properties/non-existent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 6. PUT /properties/:id — update → 200
  // ────────────────────────────────────────────────────────────────────────────
  describe('PUT /properties/:id — update', () => {
    it('should return 200 with updated property', async () => {
      const updatedRow = { ...MOCK_PROPERTY_ROW, name: 'Casa del Luna', updated_at: new Date() };

      let callCount = 0;
      (mockDb as jest.Mock).mockImplementation(() => {
        callCount++;
        const qb = createQueryBuilder();
        if (callCount === 1) {
          // Check existing: properties.where({ id }).first()
          qb['where'] = jest.fn().mockReturnValue(qb);
          qb['first'] = jest.fn().mockResolvedValue(MOCK_PROPERTY_ROW);
        } else if (callCount === 2) {
          // Update: properties.where({ id }).update(...)
          qb['where'] = jest.fn().mockReturnValue(qb);
          qb['update'] = jest.fn().mockResolvedValue(1);
        } else if (callCount === 3) {
          // getPropertyById: properties.where({ id }).first()
          qb['where'] = jest.fn().mockReturnValue(qb);
          qb['first'] = jest.fn().mockResolvedValue(updatedRow);
        } else if (callCount === 4) {
          // rooms
          qb['where'] = jest.fn().mockResolvedValue([]);
        } else {
          // currency rates
          qb['where'] = jest.fn().mockReturnValue(qb);
          qb['first'] = jest.fn().mockResolvedValue(undefined);
        }
        return qb;
      });

      mockMongoFindOne.mockResolvedValue({ extendedAttributes: {}, photos: [] });

      const res = await request(app)
        .put(`/properties/${MOCK_PROPERTY_ROW.id}`)
        .send({ name: 'Casa del Luna' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Casa del Luna');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 7. DELETE /properties/:id — soft delete → 204
  // ────────────────────────────────────────────────────────────────────────────
  describe('DELETE /properties/:id — soft delete', () => {
    it('should return 204 when property is soft deleted', async () => {
      let callCount = 0;
      (mockDb as jest.Mock).mockImplementation(() => {
        callCount++;
        const qb = createQueryBuilder();
        if (callCount === 1) {
          // Check existing
          qb['where'] = jest.fn().mockReturnValue(qb);
          qb['first'] = jest.fn().mockResolvedValue(MOCK_PROPERTY_ROW);
        } else {
          // Update deleted=true
          qb['where'] = jest.fn().mockReturnValue(qb);
          qb['update'] = jest.fn().mockResolvedValue(1);
        }
        return qb;
      });

      const res = await request(app).delete(`/properties/${MOCK_PROPERTY_ROW.id}`);

      expect(res.status).toBe(204);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 8. POST /properties/:id/rooms — crear room → 201
  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /properties/:id/rooms — create room', () => {
    it('should return 201 with created room', async () => {
      queryBuilder['insert'] = jest.fn().mockReturnValue(queryBuilder);
      queryBuilder['returning'] = jest.fn().mockResolvedValue([MOCK_ROOM_ROW]);

      const res = await request(app)
        .post(`/properties/${MOCK_PROPERTY_ROW.id}/rooms`)
        .send(VALID_ROOM_INPUT);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Dormitorio Principal');
      expect(res.body.type).toBe('bedroom');
      expect(res.body.beds).toBe(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 9. GET /properties/:id/rooms — listar rooms → 200
  // ────────────────────────────────────────────────────────────────────────────
  describe('GET /properties/:id/rooms — list rooms', () => {
    it('should return 200 with array of rooms', async () => {
      queryBuilder['where'] = jest.fn().mockResolvedValue([MOCK_ROOM_ROW]);

      const res = await request(app).get(`/properties/${MOCK_PROPERTY_ROW.id}/rooms`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Dormitorio Principal');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 10. GET /health — ok → 200
  // ────────────────────────────────────────────────────────────────────────────
  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
