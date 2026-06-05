import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { SystemModulesController } from '../controllers/systemModules.controller';
import { NocDashboardController } from '../controllers/nocDashboard.controller';
import { NocIngresosController } from '../controllers/nocIngresos.controller';
import { NocPresupuestoController } from '../controllers/nocPresupuesto.controller';
import { NocAgentController } from '../controllers/nocAgent.controller';

const router = Router();
const systemModulesController = new SystemModulesController();
const nocDashboardController = new NocDashboardController();
const nocIngresosController = new NocIngresosController();
const nocPresupuestoController = new NocPresupuestoController();
const nocAgentController = new NocAgentController();

// System Modules
router.get('/system-modules', authenticateToken, systemModulesController.getSystemModules);
router.put('/system-modules/:code/state', authenticateToken, systemModulesController.updateModuleState);

// Dashboard
router.get('/dashboard/filters', authenticateToken, requirePermission('dashboard'), nocDashboardController.getDashboardFilters);
router.get('/dashboard/overview', authenticateToken, requirePermission('dashboard'), nocDashboardController.getOverviewStats);
router.get('/dashboard/content', authenticateToken, requirePermission('dashboard'), nocDashboardController.getContentStats);
router.get('/dashboard/entities', authenticateToken, requirePermission('dashboard'), nocDashboardController.getEntitiesStats);
router.get('/dashboard/entities/detail', authenticateToken, requirePermission('dashboard'), nocDashboardController.getEntityDetail);
router.get('/dashboard/reach', authenticateToken, requirePermission('dashboard'), nocDashboardController.getReachStats);
router.get('/dashboard/audience', authenticateToken, requirePermission('dashboard'), nocDashboardController.getAudienceStats);
router.post('/dashboard/import', authenticateToken, requirePermission('dashboard'), nocDashboardController.importDashboardData);

// Ingresos
router.get('/ingresos/datos-grafico', authenticateToken, requirePermission('ingresos'), nocIngresosController.getIngresosGrafico);
router.get('/ingresos/datos-redes/:plataforma', authenticateToken, requirePermission('ingresos'), nocIngresosController.getIngresosRedes);
router.get('/ingresos/resumen-general', authenticateToken, requirePermission('ingresos'), nocIngresosController.getResumenGeneral);

// Presupuesto
router.get('/portal-presupuesto/dashboard', authenticateToken, requirePermission('presupuesto'), nocPresupuestoController.getDashboardPresupuesto);
router.post('/portal-presupuesto/importar', authenticateToken, requirePermission('presupuesto'), nocPresupuestoController.importarPresupuesto);

// AI Chat
router.post('/agent/chat', authenticateToken, nocAgentController.agentChat);
router.get('/agent/health', nocAgentController.agentHealth);

export default router;
