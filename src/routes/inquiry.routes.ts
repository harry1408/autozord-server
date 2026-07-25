import { Router } from 'express';
import { getInquiries, respondToInquiry } from '../controllers/inquiry.controller';
import { authenticate, authorize, SHOP_ROLES } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscription';

const router = Router();
router.use(authenticate, authorize(...SHOP_ROLES), requireActiveSubscription);

router.get('/', getInquiries);
router.put('/:id', authorize('SHOP_ADMIN', 'MANAGER'), respondToInquiry);

export default router;
