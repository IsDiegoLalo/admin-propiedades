/**
 * Unit tests para photoService (addPhoto, deletePhoto)
 * Validates: Requirements 3.1, 3.2, 3.3
 */

process.env['POSTGRES_HOST'] = 'localhost';
process.env['POSTGRES_PORT'] = '5432';
process.env['POSTGRES_DB'] = 'test_properties';
process.env['POSTGRES_USER'] = 'test';
process.env['POSTGRES_PASSWORD'] = 'test';
process.env['MONGO_URI'] = 'mongodb://localhost:27017/test_properties';
process.env['REVIEWS_SERVICE_URL'] = 'http://localhost:3003';
process.env['PHOTO_MAX_SIZE_BYTES'] = '5000';

const mockFindOneAndUpdate = jest.fn();
const mockFindOneLean = jest.fn();

jest.mock('../../src/models/propertyDoc', () => ({
  PropertyDocumentModel: {
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
    findOne: () => ({ lean: () => mockFindOneLean() }),
  },
}));

jest.mock('uuid', () => ({
  v4: () => 'generated-uuid-1234',
}));

import { addPhoto, deletePhoto, listPhotos, PhotoTooLargeError } from '../../src/services/photoService';

describe('photoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addPhoto', () => {
    it('should throw PhotoTooLargeError when file exceeds max size', async () => {
      await expect(
        addPhoto('prop-1', {
          originalname: 'big.jpg',
          size: 10_000, // mayor que PHOTO_MAX_SIZE_BYTES = 5000
          mimetype: 'image/jpeg',
          path: '/uploads/big.jpg',
        }),
      ).rejects.toThrow(PhotoTooLargeError);
    });

    it('should add photo and return photo reference', async () => {
      mockFindOneAndUpdate.mockResolvedValue({ propertyId: 'prop-1', photos: [] });

      const result = await addPhoto('prop-1', {
        originalname: 'photo.jpg',
        size: 1024,
        mimetype: 'image/jpeg',
        path: '/uploads/photo.jpg',
      });

      expect(result.photoId).toBe('generated-uuid-1234');
      expect(result.filename).toBe('photo.jpg');
      expect(result.sizeBytes).toBe(1024);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.url).toBe('/uploads/photo.jpg');
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { propertyId: 'prop-1' },
        expect.objectContaining({ $push: expect.any(Object) }),
        { new: true, upsert: true },
      );
    });

    it('should throw NotFoundError when update returns null', async () => {
      mockFindOneAndUpdate.mockResolvedValue(null);

      await expect(
        addPhoto('non-existent', {
          originalname: 'photo.jpg',
          size: 100,
          mimetype: 'image/jpeg',
          path: '/uploads/photo.jpg',
        }),
      ).rejects.toThrow('no encontrada');
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo from document', async () => {
      mockFindOneAndUpdate.mockResolvedValue({ propertyId: 'prop-1', photos: [] });

      await expect(deletePhoto('prop-1', 'photo-1')).resolves.toBeUndefined();

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { propertyId: 'prop-1' },
        { $pull: { photos: { photoId: 'photo-1' } } },
        { new: true },
      );
    });

    it('should throw NotFoundError when property not found', async () => {
      mockFindOneAndUpdate.mockResolvedValue(null);

      await expect(deletePhoto('non-existent', 'photo-1')).rejects.toThrow('no encontrada');
    });
  });

  describe('listPhotos', () => {
    it('should return empty array when no document exists', async () => {
      mockFindOneLean.mockResolvedValue(null);

      const result = await listPhotos('prop-1');
      expect(result).toEqual([]);
    });

    it('should return photos sorted by uploadedAt ascending', async () => {
      const photos = [
        { photoId: 'p2', url: '/2.jpg', filename: '2.jpg', sizeBytes: 100, mimeType: 'image/jpeg', uploadedAt: new Date('2025-01-02') },
        { photoId: 'p1', url: '/1.jpg', filename: '1.jpg', sizeBytes: 100, mimeType: 'image/jpeg', uploadedAt: new Date('2025-01-01') },
      ];
      mockFindOneLean.mockResolvedValue({ propertyId: 'prop-1', photos });

      const result = await listPhotos('prop-1');
      expect(result[0].photoId).toBe('p1');
      expect(result[1].photoId).toBe('p2');
    });
  });
});
