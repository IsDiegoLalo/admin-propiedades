import { Router } from 'express';
import * as roomController from '../controllers/roomController';

// Este router se monta en /properties/:id/rooms
// Necesitamos mergeParams para acceder a :id del router padre
const router = Router({ mergeParams: true });

router.get('/', roomController.listRooms);
router.post('/', roomController.createRoom);
router.put('/:roomId', roomController.updateRoom);

export default router;
