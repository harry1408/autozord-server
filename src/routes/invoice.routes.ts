import { Router } from 'express';
import { getInvoices, getInvoice, createInvoice, updateInvoice, updateStatus, sendInvoiceEmail } from '../controllers/invoice.controller';
import { authenticate, authorize, SHOP_ROLES } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscription';

const router = Router();
router.use(authenticate, authorize(...SHOP_ROLES), requireActiveSubscription);

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.put('/:id', updateInvoice);
router.patch('/:id/status', updateStatus);
router.post('/:id/send-email', sendInvoiceEmail);

export default router;
