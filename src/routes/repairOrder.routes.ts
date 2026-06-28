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
  addLaborLine,
  updateLaborLine,
  deleteLaborLine,
  addPartsLine,
  updatePartsLine,
  deletePartsLine,
} from '../controllers/repairOrder.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getRepairOrders);
router.post('/', createRepairOrder);
router.get('/:id', getRepairOrder);
router.put('/:id', updateRepairOrder);
router.delete('/:id', deleteRepairOrder);
router.patch('/:id/status', updateStatus);
router.post('/:id/technicians', assignTechnician);
router.delete('/:id/technicians/:techId', removeTechnician);
router.post('/:id/labor', addLaborLine);
router.put('/:id/labor/:lineId', updateLaborLine);
router.delete('/:id/labor/:lineId', deleteLaborLine);
router.post('/:id/parts', addPartsLine);
router.put('/:id/parts/:lineId', updatePartsLine);
router.delete('/:id/parts/:lineId', deletePartsLine);

export default router;
