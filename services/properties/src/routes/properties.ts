import { Router } from 'express';
import * as propertyController from '../controllers/propertyController';

const router = Router();

router.get('/', propertyController.listProperties);
router.post('/', propertyController.createProperty);
router.get('/:id', propertyController.getProperty);
router.put('/:id', propertyController.updateProperty);
router.delete('/:id', propertyController.deleteProperty);
router.get('/:id/extended-attributes', propertyController.getExtendedAttributes);

export default router;
