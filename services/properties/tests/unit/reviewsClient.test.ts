/**
 * Unit tests para reviewsClient
 * Validates: Requirements 5.3
 */

process.env['POSTGRES_HOST'] = 'localhost';
process.env['POSTGRES_PORT'] = '5432';
process.env['POSTGRES_DB'] = 'test_properties';
process.env['POSTGRES_USER'] = 'test';
process.env['POSTGRES_PASSWORD'] = 'test';
process.env['MONGO_URI'] = 'mongodb://localhost:27017/test_properties';
process.env['REVIEWS_SERVICE_URL'] = 'http://localhost:3003';
process.env['PHOTO_MAX_SIZE_BYTES'] = '10485760';

import { getRating } from '../../src/services/reviewsClient';

describe('reviewsClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return starRating when service responds with 200', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ propertyId: 'abc-123', starRating: 4.2, reviewCount: 10 }),
    }) as jest.Mock;

    const result = await getRating('abc-123');
    expect(result).toBe(4.2);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3003/reviews/ratings/abc-123',
    );
  });

  it('should return null when service responds with non-ok status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as jest.Mock;

    const result = await getRating('non-existent');
    expect(result).toBeNull();
  });

  it('should return null when fetch throws (service unavailable)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as jest.Mock;

    const result = await getRating('abc-123');
    expect(result).toBeNull();
  });

  it('should return null starRating when service returns null', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ propertyId: 'abc-123', starRating: null, reviewCount: 0 }),
    }) as jest.Mock;

    const result = await getRating('abc-123');
    expect(result).toBeNull();
  });
});
