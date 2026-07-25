import { Router } from 'express';
import { getParts, getPart, createPart, updatePart, deletePart, getSuppliers, createSupplier } from '../controllers/inventory.controller';
import { authenticate, authorize, SHOP_ROLES } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscription';

const router = Router();
router.use(authenticate, authorize(...SHOP_ROLES), requireActiveSubscription);

router.get('/parts', getParts);
router.post('/parts', createPart);
router.get('/parts/:id', getPart);
router.put('/parts/:id', updatePart);
router.delete('/parts/:id', deletePart);
router.get('/suppliers', getSuppliers);
router.post('/suppliers', createSupplier);

export default router;
