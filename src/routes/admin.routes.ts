import { Router } from 'express';
import { getShops, getShop, createShop, updateShop, deleteShop, getUsers, getInquiries, resetUserPassword, getEmailLogs, sendDatabaseDump } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('GLOBAL_ADMIN'));

router.get('/shops', getShops);
router.post('/shops', createShop);
router.get('/shops/:id', getShop);
router.put('/shops/:id', updateShop);
router.delete('/shops/:id', deleteShop);
router.get('/users', getUsers);
router.post('/users/:id/reset-password', resetUserPassword);
router.get('/inquiries', getInquiries);
router.get('/email-logs', getEmailLogs);
router.post('/db-dump', sendDatabaseDump);

export default router;
