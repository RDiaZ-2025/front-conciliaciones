import { Router } from 'express';
import { ProductionController, getAllProductionRequests, getProductionRequestById, createProductionRequest, updateProductionRequest, getProducts, moveProductionRequest, updateStepGeneral, updateStepCustomer, updateStepCampaign, updateStepAudience, updateStepProduction, updateMaterialData } from '../controllers/production.controller';
import { addMaterialRegister, getMaterialRegisters } from '../controllers/materialRegister.controller';
import { RequestsReportController } from '../controllers/requestsReport.controller';
import { getProductionRequestHistory } from '../controllers/productionRequestHistory.controller';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();
const productionController = new ProductionController();
const requestsReportController = new RequestsReportController();

// Public routes for production options
router.get('/format-types', productionController.getFormatTypes);
router.get('/rights-durations', productionController.getRightsDurations);
router.get('/workflow-stages', productionController.getWorkflowStages);
router.get('/request-types', productionController.getRequestTypes);

// Protected routes
router.use(authenticateToken);

// Product routes
router.get('/products', getProducts);

// Dashboard Stats
router.get('/dashboard-stats', requirePermission('production_management'), requestsReportController.getDashboardStats);

// Production Request routes
router.get('/', getAllProductionRequests);
router.get('/:id', getProductionRequestById);
router.get('/:id/history', getProductionRequestHistory);
router.post('/', createProductionRequest);
router.put('/:id', updateProductionRequest);
router.put('/:id/general', updateStepGeneral);
router.put('/:id/customer', updateStepCustomer);
router.put('/:id/campaign', updateStepCampaign);
router.put('/:id/audience', updateStepAudience);
router.put('/:id/production', updateStepProduction);
// Material Routes
router.post('/:id/material', addMaterialRegister);
router.get('/:id/material', getMaterialRegisters);

// Deprecated or alternative material data update
router.put('/:id/material-data', updateMaterialData);
router.put('/:id/move', moveProductionRequest);

export default router;
