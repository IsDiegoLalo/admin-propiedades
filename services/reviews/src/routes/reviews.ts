import { Router } from 'express';
import * as reviewController from '../controllers/reviewController';

const router = Router();

router.post('/', reviewController.createReview);
router.get('/', reviewController.listReviews);
router.get('/ratings/:propertyId', reviewController.getRating);

export default router;
