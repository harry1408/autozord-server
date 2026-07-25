import { Router } from 'express';
import { getStats, getRevenueChart, getRecentOrders, getActivityFeed } from '../controllers/dashboard.controller';
import { authenticate, authorize, SHOP_ROLES } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscription';

const router = Router();
router.use(authenticate, authorize(...SHOP_ROLES), requireActiveSubscription);

router.get('/stats', getStats);
router.get('/revenue-chart', getRevenueChart);
router.get('/recent-orders', getRecentOrders);
router.get('/activity', getActivityFeed);

export default router;
