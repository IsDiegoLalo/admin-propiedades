import { v4 as uuidv4 } from 'uuid';
import { PropertyDocumentModel, PhotoReference } from '../models/propertyDoc';
import { NotFoundError } from '../middleware/errors';
import { PHOTO_MAX_SIZE_BYTES } from '../config/env';

export class PhotoTooLargeError extends Error {
  constructor(sizeBytes: number) {
    super(`Tamaño de foto ${sizeBytes} bytes excede el límite de ${PHOTO_MAX_SIZE_BYTES} bytes`);
    this.name = 'PhotoTooLargeError';
  }
}

export async function addPhoto(
  propertyId: string,
  file: {
    originalname: string;
    size: number;
    mimetype: string;
    path: string;
  },
): Promise<PhotoReference> {
  if (file.size > PHOTO_MAX_SIZE_BYTES) {
    throw new PhotoTooLargeError(file.size);
  }

  const photoRef: PhotoReference = {
    photoId: uuidv4(),
    url: file.path,
    filename: file.originalname,
    sizeBytes: file.size,
    mimeType: file.mimetype,
    uploadedAt: new Date(),
  };

  const doc = await PropertyDocumentModel.findOneAndUpdate(
    { propertyId },
    { $push: { photos: photoRef } },
    { new: true, upsert: true },
  );

  if (!doc) throw new NotFoundError(`Propiedad con id ${propertyId} no encontrada`);

  return photoRef;
}

export async function deletePhoto(propertyId: string, photoId: string): Promise<void> {
  const result = await PropertyDocumentModel.findOneAndUpdate(
    { propertyId },
    { $pull: { photos: { photoId } } },
    { new: true },
  );

  if (!result) throw new NotFoundError(`Propiedad con id ${propertyId} no encontrada`);
}

export async function listPhotos(propertyId: string): Promise<PhotoReference[]> {
  const doc = await PropertyDocumentModel.findOne({ propertyId }).lean();
  if (!doc) return [];

  // Orden ascendente por uploadedAt
  return [...(doc.photos ?? [])].sort(
    (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
  );
}
