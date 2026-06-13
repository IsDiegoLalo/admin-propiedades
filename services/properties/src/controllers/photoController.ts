import { Request, Response, NextFunction } from 'express';
import * as photoService from '../services/photoService';
import { PhotoTooLargeError } from '../services/photoService';

export async function uploadPhoto(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: propertyId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No se proporcionó ningún archivo' });
      return;
    }

    const photo = await photoService.addPhoto(propertyId, {
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
    });

    res.status(201).json(photo);
  } catch (err) {
    if (err instanceof PhotoTooLargeError) {
      res.status(413).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function listPhotos(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: propertyId } = req.params;
    const photos = await photoService.listPhotos(propertyId);
    res.json(photos);
  } catch (err) {
    next(err);
  }
}

export async function deletePhoto(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: propertyId, photoId } = req.params;
    await photoService.deletePhoto(propertyId, photoId);
    res.status(200).json({ message: 'Foto eliminada correctamente' });
  } catch (err) {
    next(err);
  }
}
