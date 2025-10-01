import express from 'express';
import {
  getAllProductionRequests,
  getProductionRequestById,
  createProductionRequest,
  updateProductionRequest,
  moveProductionRequest,
  deleteProductionRequest
} from '../controllers/productionController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Production request routes
router.get('/', getAllProductionRequests);
router.get('/:id', getProductionRequestById);
router.post('/', createProductionRequest);
router.put('/:id', updateProductionRequest);
router.put('/:id/move', moveProductionRequest);
router.delete('/:id', deleteProductionRequest);

export default router;