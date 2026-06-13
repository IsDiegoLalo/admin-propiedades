/**
 * Unit tests para db/postgres.ts y db/mongo.ts
 * Validates: Requirements 15.1, 15.2
 */

process.env['POSTGRES_HOST'] = 'localhost';
process.env['POSTGRES_PORT'] = '5432';
process.env['POSTGRES_DB'] = 'test_properties';
process.env['POSTGRES_USER'] = 'test';
process.env['POSTGRES_PASSWORD'] = 'test';
process.env['MONGO_URI'] = 'mongodb://localhost:27017/test_properties';
process.env['REVIEWS_SERVICE_URL'] = 'http://localhost:3003';
process.env['PHOTO_MAX_SIZE_BYTES'] = '10485760';

// Mock knex before importing
const mockRaw = jest.fn();
const mockKnex = jest.fn().mockReturnValue({ raw: mockRaw });
(mockKnex as unknown as Record<string, unknown>)['raw'] = mockRaw;

jest.mock('knex', () => ({
  __esModule: true,
  default: () => mockKnex,
}));

// Mock mongoose before importing
const mockConnect = jest.fn();
const mockCommand = jest.fn();
const mockConnection = {
  readyState: 1,
  db: { command: mockCommand },
};

jest.mock('mongoose', () => ({
  connect: (...args: unknown[]) => mockConnect(...args),
  connection: mockConnection,
}));

describe('db/postgres', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export db instance and checkPostgresConnection', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const postgres = require('../../src/db/postgres');
    expect(postgres.db).toBeDefined();
    expect(typeof postgres.checkPostgresConnection).toBe('function');
  });

  it('checkPostgresConnection should call db.raw', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const postgres = require('../../src/db/postgres');
    postgres.db.raw = jest.fn().mockResolvedValue({ rows: [] });

    await postgres.checkPostgresConnection();
    expect(postgres.db.raw).toHaveBeenCalledWith('SELECT 1');
  });
});

describe('db/mongo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection.readyState = 1;
    mockCommand.mockResolvedValue({ ok: 1 });
  });

  it('connectMongo should call mongoose.connect with MONGO_URI', async () => {
    mockConnect.mockResolvedValue(undefined);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mongo = require('../../src/db/mongo');

    await mongo.connectMongo();
    expect(mockConnect).toHaveBeenCalledWith('mongodb://localhost:27017/test_properties');
  });

  it('checkMongoConnection should succeed when connected and ping succeeds', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mongo = require('../../src/db/mongo');

    await expect(mongo.checkMongoConnection()).resolves.toBeUndefined();
    expect(mockCommand).toHaveBeenCalledWith({ ping: 1 });
  });

  it('checkMongoConnection should throw when not connected', async () => {
    mockConnection.readyState = 0;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mongo = require('../../src/db/mongo');

    await expect(mongo.checkMongoConnection()).rejects.toThrow('MongoDB no está conectado');
  });
});
