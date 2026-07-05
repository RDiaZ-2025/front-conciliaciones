import { Router } from 'express';
import { ProductionController, getAllProductionRequests, getProductionRequestById, createProductionRequest, updateProductionRequest, getProducts, moveProductionRequest, updateStepGeneral, updateStepCustomer, updateStepCampaign, updateStepAudience, updateStepProduction, updateMaterialData, getFormFields, createSubmission, getSubmissions, adminGetForms, adminCreateForm, adminUpdateForm, adminDeleteForm, adminSaveFields, adminGetStages, adminSaveStages, getPendingApprovals, actionApproval, getSubmissionDetails } from '../controllers/production.controller';
import { addMaterialRegister, getMaterialRegisters } from '../controllers/material_register.controller';
import { RequestsReportController } from '../controllers/requests_report.controller';
import { getProductionRequestHistory } from '../controllers/production_request_history.controller';
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

// Dynamic forms routes
router.get('/forms/:id/fields', getFormFields);
router.post('/submissions', createSubmission);
router.get('/submissions', getSubmissions);
router.get('/submissions/:submissionId', getSubmissionDetails);

// Admin Forms & Workflows
router.get('/admin/forms', adminGetForms);
router.post('/admin/forms', adminCreateForm);
router.put('/admin/forms/:id', adminUpdateForm);
router.delete('/admin/forms/:id', adminDeleteForm);
router.post('/admin/forms/:id/fields', adminSaveFields);
router.get('/admin/forms/:id/stages', adminGetStages);
router.post('/admin/forms/:id/stages', adminSaveStages);

// Approvals Inbox
router.get('/approvals/pending', getPendingApprovals);
router.post('/approvals/:stateId/action', actionApproval);

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
