import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Require authentication for all customer routes
router.use(authenticateToken);

router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);
router.post('/bulk-upload', customerController.bulkUpload);

export default router;
