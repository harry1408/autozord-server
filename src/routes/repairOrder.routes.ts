import { Router } from 'express';
import {
  getRepairOrders,
  getRepairOrder,
  createRepairOrder,
  updateRepairOrder,
  deleteRepairOrder,
  updateStatus,
  assignTechnician,
  removeTechnician,
  addJobLine,
  updateJobLine,
  deleteJobLine,
  addLaborLine,
  updateLaborLine,
  deleteLaborLine,
  addPartsLine,
  updatePartsLine,
  deletePartsLine,
} from '../controllers/repairOrder.controller';
import { authenticate, authorize, SHOP_ROLES } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize(...SHOP_ROLES));

router.get('/', getRepairOrders);
router.post('/', createRepairOrder);
router.get('/:id', getRepairOrder);
router.put('/:id', updateRepairOrder);
router.delete('/:id', authorize('SHOP_ADMIN', 'MANAGER'), deleteRepairOrder);
router.patch('/:id/status', updateStatus);
router.post('/:id/technicians', authorize('SHOP_ADMIN', 'MANAGER'), assignTechnician);
router.delete('/:id/technicians/:techId', authorize('SHOP_ADMIN', 'MANAGER'), removeTechnician);
router.post('/:id/jobs', addJobLine);
router.put('/:id/jobs/:jobId', updateJobLine);
router.delete('/:id/jobs/:jobId', authorize('SHOP_ADMIN', 'MANAGER'), deleteJobLine);
router.post('/:id/labor', addLaborLine);
router.put('/:id/labor/:lineId', updateLaborLine);
router.delete('/:id/labor/:lineId', authorize('SHOP_ADMIN', 'MANAGER'), deleteLaborLine);
router.post('/:id/parts', addPartsLine);
router.put('/:id/parts/:lineId', updatePartsLine);
router.delete('/:id/parts/:lineId', authorize('SHOP_ADMIN', 'MANAGER'), deletePartsLine);

export default router;
