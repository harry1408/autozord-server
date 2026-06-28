import { Router } from 'express';
import { getInvoices, getInvoice, createInvoice, updateInvoice, updateStatus } from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.put('/:id', updateInvoice);
router.patch('/:id/status', updateStatus);

export default router;
