import { Router } from 'express';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerVehicles,
  getCustomerRepairOrders,
} from '../controllers/customer.controller';
import { authenticate, authorize, SHOP_ROLES } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize(...SHOP_ROLES));

router.get('/', getCustomers);
router.post('/', createCustomer);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.get('/:id/vehicles', getCustomerVehicles);
router.get('/:id/repair-orders', getCustomerRepairOrders);

export default router;
