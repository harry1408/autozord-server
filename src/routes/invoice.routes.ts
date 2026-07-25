import { Router } from 'express';
import { getInvoices, getInvoice, createInvoice, updateInvoice, updateStatus } from '../controllers/invoice.controller';
import { authenticate, authorize, SHOP_ROLES } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize(...SHOP_ROLES));

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.put('/:id', updateInvoice);
router.patch('/:id/status', updateStatus);

export default router;
