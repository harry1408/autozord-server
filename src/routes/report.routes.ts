import { Router } from 'express';
import { getRevenue, getRepairOrdersReport, getTechnicianReport, getInventoryReport, getAgingReport } from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscription';

const router = Router();
router.use(authenticate, authorize('SHOP_ADMIN', 'MANAGER'), requireActiveSubscription);

router.get('/revenue', getRevenue);
router.get('/repair-orders', getRepairOrdersReport);
router.get('/technicians', getTechnicianReport);
router.get('/inventory', getInventoryReport);
router.get('/aging', getAgingReport);
router.get('/ar-aging', getAgingReport);

export default router;
