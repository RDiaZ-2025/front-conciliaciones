import { Router } from 'express';
import { ProductionController, getAllProductionRequests, getProductionRequestById, createProductionRequest, updateProductionRequest, getProducts, moveProductionRequest, updateStepGeneral, updateStepCustomer, updateStepCampaign, updateStepAudience, updateStepProduction, updateMaterialData, getFormFields, createSubmission, getSubmissions, adminGetForms, adminCreateForm, adminUpdateForm, adminDeleteForm, adminSaveFields, adminGetStages, adminSaveStages, adminGetWorkflows, adminCreateWorkflow, adminUpdateWorkflow, adminDeleteWorkflow, adminGetWorkflowStages, adminSaveWorkflowStages, getPendingApprovals, actionApproval, getSubmissionDetails } from '../controllers/production.controller';
import { addMaterialRegister, getMaterialRegisters } from '../controllers/material_register.controller';
import { RequestsReportController } from '../controllers/requests_report.controller';
import { getProductionRequestHistory } from '../controllers/production_request_history.controller';
import { authenticateToken, requirePermission, requireAnyPermission, requireRole } from '../middleware/auth';

const router = Router();
const productionController = new ProductionController();
const requestsReportController = new RequestsReportController();

router.get('/format-types', productionController.getFormatTypes);
router.get('/rights-durations', productionController.getRightsDurations);
router.get('/workflow-stages', productionController.getWorkflowStages);
router.get('/request-types', productionController.getRequestTypes);
router.get('/initial-form', productionController.getInitialForm);

router.use(authenticateToken);

router.get('/forms/:id/fields', getFormFields);
router.post('/submissions', createSubmission);
router.get('/submissions', getSubmissions);
router.get('/submissions/:submissionId', getSubmissionDetails);

const adminFormsAuth = requireRole(['admin', 'administrador']);

router.get('/admin/forms', adminFormsAuth, adminGetForms);
router.post('/admin/forms', adminFormsAuth, adminCreateForm);
router.put('/admin/forms/:id', adminFormsAuth, adminUpdateForm);
router.delete('/admin/forms/:id', adminFormsAuth, adminDeleteForm);
router.post('/admin/forms/:id/fields', adminFormsAuth, adminSaveFields);
router.get('/admin/forms/:id/stages', adminFormsAuth, adminGetStages);
router.post('/admin/forms/:id/stages', adminFormsAuth, adminSaveStages);

router.get('/admin/workflows', adminFormsAuth, adminGetWorkflows);
router.post('/admin/workflows', adminFormsAuth, adminCreateWorkflow);
router.put('/admin/workflows/:id', adminFormsAuth, adminUpdateWorkflow);
router.delete('/admin/workflows/:id', adminFormsAuth, adminDeleteWorkflow);
router.get('/admin/workflows/:id/stages', adminFormsAuth, adminGetWorkflowStages);
router.post('/admin/workflows/:id/stages', adminFormsAuth, adminSaveWorkflowStages);

router.get('/approvals/pending', getPendingApprovals);
router.post('/approvals/:stateId/action', actionApproval);

router.get('/products', getProducts);

router.get('/dashboard-stats', requirePermission('production_management'), requestsReportController.getDashboardStats);

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

router.post('/:id/material', addMaterialRegister);
router.get('/:id/material', getMaterialRegisters);

router.put('/:id/material-data', updateMaterialData);
router.put('/:id/move', moveProductionRequest);

export default router;
