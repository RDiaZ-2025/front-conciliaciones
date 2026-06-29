import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { SystemModulesController } from '../controllers/systemModules.controller';
import { NocDashboardController } from '../controllers/nocDashboard.controller';
import { NocIngresosController } from '../controllers/nocIngresos.controller';
import { NocPresupuestoController } from '../controllers/nocPresupuesto.controller';
import { NocAgentController } from '../controllers/nocAgent.controller';
import { NocNewsSchedulerController } from '../controllers/nocNewsScheduler.controller';

const router = Router();
const systemModulesController = new SystemModulesController();
const nocDashboardController = new NocDashboardController();
const nocIngresosController = new NocIngresosController();
const nocPresupuestoController = new NocPresupuestoController();
const nocAgentController = new NocAgentController();
const nocNewsSchedulerController = new NocNewsSchedulerController();

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

// News Scheduler (Support both /noc/news-scheduler and /news-scheduler)
router.get(['/news-scheduler', '/noc/news-scheduler'], authenticateToken, (req, res) => nocNewsSchedulerController.getSchedules(req, res));
router.get(['/news-scheduler/:id', '/noc/news-scheduler/:id'], authenticateToken, (req, res) => nocNewsSchedulerController.getScheduleById(req, res));
router.post(['/news-scheduler', '/noc/news-scheduler'], authenticateToken, (req, res) => nocNewsSchedulerController.createSchedule(req, res));
router.put(['/news-scheduler/:id', '/noc/news-scheduler/:id'], authenticateToken, (req, res) => nocNewsSchedulerController.updateSchedule(req, res));
router.patch(['/news-scheduler/:id/toggle', '/noc/news-scheduler/:id/toggle'], authenticateToken, (req, res) => nocNewsSchedulerController.toggleActive(req, res));
router.post(['/news-scheduler/:id/record-execution', '/noc/news-scheduler/:id/record-execution'], authenticateToken, (req, res) => nocNewsSchedulerController.recordExecution(req, res));
router.delete(['/news-scheduler/:id', '/noc/news-scheduler/:id'], authenticateToken, (req, res) => nocNewsSchedulerController.deleteSchedule(req, res));

export default router;

