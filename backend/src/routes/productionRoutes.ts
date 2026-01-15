import { Router } from 'express';
import { ProductionController, getAllProductionRequests, getProductionRequestById, createProductionRequest, updateProductionRequest, deleteProductionRequest, getProducts, moveProductionRequest } from '../controllers/productionController';
import { getProductionRequestHistory } from '../controllers/productionRequestHistoryController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes for production options
router.get('/format-types', ProductionController.getFormatTypes);
router.get('/rights-durations', ProductionController.getRightsDurations);

// Protected routes
router.use(authenticateToken);

// Product routes
router.get('/products', getProducts);

// Production Request routes
router.get('/', getAllProductionRequests);
router.get('/:id', getProductionRequestById);
router.get('/:id/history', getProductionRequestHistory);
router.post('/', createProductionRequest);
router.put('/:id', updateProductionRequest);
router.put('/:id/move', moveProductionRequest);
router.delete('/:id', deleteProductionRequest);

export default router;
