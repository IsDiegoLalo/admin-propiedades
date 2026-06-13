import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as photoController from '../controllers/photoController';

const upload = multer({
  dest: path.join(process.cwd(), 'uploads'),
  limits: { fileSize: 50 * 1024 * 1024 }, // límite permisivo: la validación real está en photoService
});

const router = Router({ mergeParams: true });

router.get('/', photoController.listPhotos);
router.post('/', upload.single('photo'), photoController.uploadPhoto);
router.delete('/:photoId', photoController.deletePhoto);

export default router;
