import { Router } from 'express';
import { getShops, getShop, createShop, updateShop, deleteShop, getUsers, getInquiries } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('GLOBAL_ADMIN'));

router.get('/shops', getShops);
router.post('/shops', createShop);
router.get('/shops/:id', getShop);
router.put('/shops/:id', updateShop);
router.delete('/shops/:id', deleteShop);
router.get('/users', getUsers);
router.get('/inquiries', getInquiries);

export default router;
