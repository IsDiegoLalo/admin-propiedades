import { Router } from 'express';
import * as bookingController from '../controllers/bookingController';

const router = Router();

router.post('/', bookingController.createBooking);
router.get('/', bookingController.listBookings);
router.get('/:id', bookingController.getBooking);
router.delete('/:id', bookingController.cancelBooking);

export default router;
