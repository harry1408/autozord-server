import { Router } from 'express';
import { getSettings, updateSettings, getSubscription } from '../controllers/settings.controller';
import { authenticate, authorize, SHOP_ROLES } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscription';

const router = Router();
router.use(authenticate, authorize(...SHOP_ROLES), requireActiveSubscription);

router.get('/', getSettings);
router.put('/', authorize('SHOP_ADMIN'), updateSettings);
router.get('/subscription', getSubscription);

export default router;
