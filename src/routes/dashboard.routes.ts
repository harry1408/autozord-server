import { Router } from 'express';
import { getStats, getRevenueChart, getRecentOrders, getActivityFeed } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/stats', getStats);
router.get('/revenue-chart', getRevenueChart);
router.get('/recent-orders', getRecentOrders);
router.get('/activity', getActivityFeed);

export default router;
