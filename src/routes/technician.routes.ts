import { Router } from 'express';
import { getTechnicians, getTechnician, createTechnician, updateTechnician, deleteTechnician } from '../controllers/technician.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getTechnicians);
router.post('/', authorize('ADMIN', 'MANAGER'), createTechnician);
router.get('/:id', getTechnician);
router.put('/:id', authorize('ADMIN', 'MANAGER'), updateTechnician);
router.delete('/:id', authorize('ADMIN'), deleteTechnician);

export default router;
