import { Router } from 'express';
import { getParts, getPart, createPart, updatePart, deletePart, getSuppliers, createSupplier } from '../controllers/inventory.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/parts', getParts);
router.post('/parts', createPart);
router.get('/parts/:id', getPart);
router.put('/parts/:id', updatePart);
router.delete('/parts/:id', deletePart);
router.get('/suppliers', getSuppliers);
router.post('/suppliers', createSupplier);

export default router;
