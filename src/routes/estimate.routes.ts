import { Router } from 'express';
import {
  getEstimates, getEstimate, createEstimate, updateEstimate, deleteEstimate,
  updateStatus, convertToRO,
} from '../controllers/estimate.controller';
import { authenticate, authorize, SHOP_ROLES } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscription';

const router = Router();
router.use(authenticate, authorize(...SHOP_ROLES), requireActiveSubscription);

router.get('/', getEstimates);
router.post('/', createEstimate);
router.get('/:id', getEstimate);
router.put('/:id', updateEstimate);
router.delete('/:id', deleteEstimate);
router.patch('/:id/status', updateStatus);
router.post('/:id/convert', convertToRO);

export default router;
