import express from 'express';
import {
  getAllProductionRequests,
  getProductionRequestById,
  createProductionRequest,
  updateProductionRequest,
  moveProductionRequest,
  deleteProductionRequest,
  getProducts
} from '../controllers/productionController';
import { getProductionRequestHistory } from '../controllers/productionRequestHistoryController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Production request routes
router.get('/products', getProducts);
router.get('/', getAllProductionRequests);
router.get('/:id', getProductionRequestById);
router.post('/', createProductionRequest);
router.put('/:id', updateProductionRequest);
router.put('/:id/move', moveProductionRequest);
router.get('/:id/history', getProductionRequestHistory);
router.delete('/:id', deleteProductionRequest);

export default router;