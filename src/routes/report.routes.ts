import { Router } from 'express';
import { getRevenue, getRepairOrdersReport, getTechnicianReport, getInventoryReport, getAgingReport } from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('ADMIN', 'MANAGER'));

router.get('/revenue', getRevenue);
router.get('/repair-orders', getRepairOrdersReport);
router.get('/technicians', getTechnicianReport);
router.get('/inventory', getInventoryReport);
router.get('/aging', getAgingReport);

export default router;
