import { Router } from 'express';
import { getInspections, getInspection, createInspection, updateInspection, addItem, updateItem } from '../controllers/inspection.controller';
import { authenticate, authorize, SHOP_ROLES } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize(...SHOP_ROLES));

router.get('/', getInspections);
router.post('/', createInspection);
router.get('/:id', getInspection);
router.put('/:id', updateInspection);
router.post('/:id/items', addItem);
router.put('/:id/items/:itemId', updateItem);

export default router;
