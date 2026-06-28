import { Router } from 'express';
import { getPayments, createPayment, getInvoicePayments } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getPayments);
router.post('/', createPayment);
router.get('/invoice/:invoiceId', getInvoicePayments);

export default router;
