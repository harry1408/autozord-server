import { Router } from 'express';
import { getPayments, createPayment, getInvoicePayments } from '../controllers/payment.controller';
import { authenticate, authorize, SHOP_ROLES } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize(...SHOP_ROLES));

router.get('/', getPayments);
router.post('/', createPayment);
router.get('/invoice/:invoiceId', getInvoicePayments);

export default router;
