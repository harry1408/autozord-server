import { Router } from 'express';
import {
  getEstimates, getEstimate, createEstimate, updateEstimate, deleteEstimate,
  updateStatus, convertToRO,
} from '../controllers/estimate.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getEstimates);
router.post('/', createEstimate);
router.get('/:id', getEstimate);
router.put('/:id', updateEstimate);
router.delete('/:id', deleteEstimate);
router.patch('/:id/status', updateStatus);
router.post('/:id/convert', convertToRO);

export default router;
