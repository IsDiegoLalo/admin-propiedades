/**
 * Unit tests para photoController
 * Validates: Requirements 3.1, 3.2, 3.3
 */

process.env['POSTGRES_HOST'] = 'localhost';
process.env['POSTGRES_PORT'] = '5432';
process.env['POSTGRES_DB'] = 'test_properties';
process.env['POSTGRES_USER'] = 'test';
process.env['POSTGRES_PASSWORD'] = 'test';
process.env['MONGO_URI'] = 'mongodb://localhost:27017/test_properties';
process.env['REVIEWS_SERVICE_URL'] = 'http://localhost:3003';
process.env['PHOTO_MAX_SIZE_BYTES'] = '10485760';

import { Request, Response, NextFunction } from 'express';
import { uploadPhoto, listPhotos, deletePhoto } from '../../src/controllers/photoController';
import * as photoService from '../../src/services/photoService';

jest.mock('../../src/services/photoService');

const mockPhotoService = photoService as jest.Mocked<typeof photoService>;

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    body: {},
    file: undefined,
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('photoController', () => {
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
  });

  describe('uploadPhoto', () => {
    it('should return 400 when no file is provided', async () => {
      const req = createMockReq({ params: { id: 'prop-1' }, file: undefined });
      const res = createMockRes();

      await uploadPhoto(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se proporcionó ningún archivo' });
    });

    it('should return 201 with photo reference on success', async () => {
      const mockPhoto = {
        photoId: 'photo-1',
        url: '/uploads/photo.jpg',
        filename: 'photo.jpg',
        sizeBytes: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: new Date(),
      };

      mockPhotoService.addPhoto.mockResolvedValue(mockPhoto);

      const req = createMockReq({
        params: { id: 'prop-1' },
        file: {
          originalname: 'photo.jpg',
          size: 1024,
          mimetype: 'image/jpeg',
          path: '/uploads/photo.jpg',
        } as Express.Multer.File,
      });
      const res = createMockRes();

      await uploadPhoto(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockPhoto);
    });

    it('should return 413 when photo is too large', async () => {
      mockPhotoService.addPhoto.mockRejectedValue(
        new photoService.PhotoTooLargeError(20_000_000),
      );

      const req = createMockReq({
        params: { id: 'prop-1' },
        file: {
          originalname: 'large.jpg',
          size: 20_000_000,
          mimetype: 'image/jpeg',
          path: '/uploads/large.jpg',
        } as Express.Multer.File,
      });
      const res = createMockRes();

      await uploadPhoto(req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
      );
    });

    it('should call next with error on unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected');
      mockPhotoService.addPhoto.mockRejectedValue(unexpectedError);

      const req = createMockReq({
        params: { id: 'prop-1' },
        file: {
          originalname: 'photo.jpg',
          size: 1024,
          mimetype: 'image/jpeg',
          path: '/uploads/photo.jpg',
        } as Express.Multer.File,
      });
      const res = createMockRes();

      await uploadPhoto(req, res, next);

      expect(next).toHaveBeenCalledWith(unexpectedError);
    });
  });

  describe('listPhotos', () => {
    it('should return photos array with 200', async () => {
      const photos = [
        {
          photoId: 'p1',
          url: '/uploads/1.jpg',
          filename: '1.jpg',
          sizeBytes: 500,
          mimeType: 'image/jpeg',
          uploadedAt: new Date(),
        },
      ];
      mockPhotoService.listPhotos.mockResolvedValue(photos);

      const req = createMockReq({ params: { id: 'prop-1' } });
      const res = createMockRes();

      await listPhotos(req, res, next);

      expect(res.json).toHaveBeenCalledWith(photos);
    });

    it('should call next on error', async () => {
      const err = new Error('DB failure');
      mockPhotoService.listPhotos.mockRejectedValue(err);

      const req = createMockReq({ params: { id: 'prop-1' } });
      const res = createMockRes();

      await listPhotos(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('deletePhoto', () => {
    it('should return 200 with success message', async () => {
      mockPhotoService.deletePhoto.mockResolvedValue(undefined);

      const req = createMockReq({ params: { id: 'prop-1', photoId: 'photo-1' } });
      const res = createMockRes();

      await deletePhoto(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Foto eliminada correctamente' });
    });

    it('should call next on error', async () => {
      const err = new Error('Not found');
      mockPhotoService.deletePhoto.mockRejectedValue(err);

      const req = createMockReq({ params: { id: 'prop-1', photoId: 'photo-1' } });
      const res = createMockRes();

      await deletePhoto(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
