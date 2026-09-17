import { Router } from 'express';
import { authenticateToken, requirePermission, authenticateTokenOrWebhook } from '../middleware/auth';
import { SystemModulesController } from '../controllers/system_modules.controller';
import { NocDashboardController } from '../controllers/noc_dashboard.controller';
import { NocIngresosController } from '../controllers/noc_ingresos.controller';
import { NocPresupuestoController } from '../controllers/noc_presupuesto.controller';
import { NocAgentController } from '../controllers/noc_agent.controller';
import { NocNewsSchedulerController } from '../controllers/noc_news_scheduler.controller';

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
router.get(['/news-scheduler', '/noc/news-scheduler'], authenticateToken, nocNewsSchedulerController.getSchedules);
router.get(['/news-scheduler/:id', '/noc/news-scheduler/:id'], authenticateToken, nocNewsSchedulerController.getScheduleById);
router.post(['/news-scheduler', '/noc/news-scheduler'], authenticateToken, nocNewsSchedulerController.createSchedule);
router.put(['/news-scheduler/:id', '/noc/news-scheduler/:id'], authenticateToken, nocNewsSchedulerController.updateSchedule);
router.patch(['/news-scheduler/:id/toggle', '/noc/news-scheduler/:id/toggle'], authenticateToken, nocNewsSchedulerController.toggleActive);
router.post(['/news-scheduler/:id/record-execution', '/noc/news-scheduler/:id/record-execution'], authenticateToken, nocNewsSchedulerController.recordExecution);
router.post(['/news-scheduler/:id/run', '/noc/news-scheduler/:id/run'], authenticateToken, nocNewsSchedulerController.executeSchedule);
router.delete(['/news-scheduler/:id', '/noc/news-scheduler/:id'], authenticateToken, nocNewsSchedulerController.deleteSchedule);

// Borradores / Drafts (Protegido contra inyecciones no autorizadas)
router.post(['/news-scheduler/draft', '/noc/news-scheduler/draft'], authenticateTokenOrWebhook, nocNewsSchedulerController.saveDraft);
router.get(['/news-scheduler/:id/drafts', '/noc/news-scheduler/:id/drafts'], authenticateToken, nocNewsSchedulerController.getDrafts);
router.get(['/news-scheduler/drafts/detail/:id', '/noc/news-scheduler/drafts/detail/:id'], authenticateToken, nocNewsSchedulerController.getDraftDetail);
router.put(['/news-scheduler/drafts/:id', '/noc/news-scheduler/drafts/:id'], authenticateToken, nocNewsSchedulerController.updateDraft);
router.delete(['/news-scheduler/drafts/:id', '/noc/news-scheduler/drafts/:id'], authenticateToken, nocNewsSchedulerController.deleteDraft);
router.post(['/news-scheduler/drafts/preview', '/noc/news-scheduler/drafts/preview'], authenticateToken, nocNewsSchedulerController.previewDraft);
router.post(['/news-scheduler/drafts/:id/publish', '/noc/news-scheduler/drafts/:id/publish'], authenticateToken, nocNewsSchedulerController.publishDraft);

// Acciones de Inteligencia Artificial (IA) sobre Borradores
router.post(['/news-scheduler/drafts/:id/ai-adjust-paragraph', '/noc/news-scheduler/drafts/:id/ai-adjust-paragraph'], authenticateToken, nocNewsSchedulerController.aiAdjustParagraph);
router.post(['/news-scheduler/drafts/:id/ai-adjust-article', '/noc/news-scheduler/drafts/:id/ai-adjust-article'], authenticateToken, nocNewsSchedulerController.aiAdjustArticle);
router.post(['/news-scheduler/drafts/:id/ai-regenerate-image', '/noc/news-scheduler/drafts/:id/ai-regenerate-image'], authenticateToken, nocNewsSchedulerController.aiRegenerateImage);

export default router;

