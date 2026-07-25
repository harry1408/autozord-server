import { Router } from 'express';
import { getInquiries, respondToInquiry } from '../controllers/inquiry.controller';
import { authenticate, authorize, SHOP_ROLES } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize(...SHOP_ROLES));

router.get('/', getInquiries);
router.put('/:id', authorize('SHOP_ADMIN', 'MANAGER'), respondToInquiry);

export default router;
