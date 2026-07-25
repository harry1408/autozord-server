import { Router } from 'express';
import { getTechnicians, getTechnician, createTechnician, updateTechnician, deleteTechnician } from '../controllers/technician.controller';
import { authenticate, authorize, SHOP_ROLES } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscription';

const router = Router();
router.use(authenticate, authorize(...SHOP_ROLES), requireActiveSubscription);

router.get('/', getTechnicians);
router.post('/', authorize('SHOP_ADMIN', 'MANAGER'), createTechnician);
router.get('/:id', getTechnician);
router.put('/:id', authorize('SHOP_ADMIN', 'MANAGER'), updateTechnician);
router.delete('/:id', authorize('SHOP_ADMIN'), deleteTechnician);

export default router;
