import { In } from 'typeorm';
import { AppDataSource } from '../config/typeorm.config';
import { DynamicForm, DynamicFormSubmission, DynamicSubmissionWorkflowState, DynamicWorkflow, Team, User } from '../models';
import { AuthService } from './auth.service';

const MANAGEMENT_PERMISSION = 'production_management';
const ADMIN_ROLES = ['admin', 'administrador'];
const MAX_TREE_DEPTH = 20;
const DAILY_TREND_MAX_DAYS = 62;
const TOP_REQUESTERS_LIMIT = 10;
const SLOWEST_STAGES_LIMIT = 10;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

type FlowStatus = 'in_progress' | 'returned' | 'completed' | 'deleted';

export interface RequestsAnalyticsFilters {
  dateFrom: Date;
  dateTo: Date;
  formIds: number[];
  workflowIds: number[];
  tzOffsetMinutes: number;
}

export interface AnalyticsScope {
  all: boolean;
  memberIds: Set<number>;
  teamNames: string[];
}

interface SubmissionRow {
  id: number;
  parentSubmissionId: number | null;
  formId: number;
  workflowId: number | null;
  status: string;
  createdAt: Date;
  consecutive: string | null;
  requesterUserId: number;
  formName: string;
  requesterName: string | null;
  workflowName: string | null;
}

interface StateRow {
  submissionId: number;
  assignedUserId: number;
  actionedByUserId: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  stageName: string | null;
}

interface PendingRow {
  submissionId: number;
  consecutive: string | null;
  formId: number;
  workflowId: number | null;
  formName: string | null;
  workflowName: string | null;
  stageName: string | null;
  assignedUserId: number;
  assigneeName: string | null;
  teamName: string | null;
  createdAt: Date;
}

/**
 * Calcula los indicadores del Informe de Solicitudes a partir de las solicitudes dinámicas
 * (solicitud raíz + flujos por área + tareas de cada etapa).
 */
export class RequestsAnalyticsService {
  private authService = new AuthService();

  /**
   * Determina qué solicitudes puede ver el usuario: todas (admin / permiso de gestión),
   * solo las de su equipo (líder de equipo) o ninguna (null).
   */
  async resolveScope(userId: number, role: string | undefined): Promise<AnalyticsScope | null> {
    if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');

    if (ADMIN_ROLES.includes((role || '').toLowerCase().trim())) {
      return { all: true, memberIds: new Set(), teamNames: [] };
    }

    const permissions = await this.authService.getUserPermissions(userId);
    if (permissions.some(p => (p || '').toLowerCase() === MANAGEMENT_PERMISSION)) {
      return { all: true, memberIds: new Set(), teamNames: [] };
    }

    const ledTeams = await AppDataSource.getRepository(Team).find({ where: { leaderId: userId }, select: ['id', 'name'] });
    if (ledTeams.length === 0) return null;

    const members = await AppDataSource.getRepository(User).find({
      where: { teamId: In(ledTeams.map(t => t.id)) },
      select: ['id']
    });
    return {
      all: false,
      memberIds: new Set([userId, ...members.map(m => m.id)]),
      teamNames: ledTeams.map(t => t.name)
    };
  }

  async getAnalytics(scope: AnalyticsScope, filters: RequestsAnalyticsFilters) {
    if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');

    const [roots, descendants, states, pendingRows, filterOptions] = await Promise.all([
      this.loadRoots(filters),
      this.loadDescendants(filters.dateFrom),
      this.loadStates(filters.dateFrom),
      this.loadPendingTasks(filters),
      this.loadFilterOptions()
    ]);

    const now = Date.now();
    const statesBySubmission = this.groupBy(states, s => s.submissionId);
    const rootIds = new Set(roots.map(r => r.id));
    const parentOf = new Map(descendants.map(d => [d.id, d.parentSubmissionId]));
    const descendantsByRoot = new Map<number, SubmissionRow[]>();
    for (const d of descendants) {
      const rootId = this.findRootId(d.id, rootIds, parentOf);
      if (rootId === null) continue;
      if (!descendantsByRoot.has(rootId)) descendantsByRoot.set(rootId, []);
      descendantsByRoot.get(rootId)!.push(d);
    }

    const isRelevantForScope = (st: StateRow) =>
      scope.all || scope.memberIds.has(st.assignedUserId) || (st.actionedByUserId !== null && scope.memberIds.has(st.actionedByUserId));

    const requests: any[] = [];
    const flowsForMetrics: { area: string; status: FlowStatus; wasReturned: boolean }[] = [];
    const actionedStates: { key: string; hours: number }[] = [];

    for (const root of roots) {
      const tree = [root, ...(descendantsByRoot.get(root.id) || [])];
      let flows = tree.filter(s => s.workflowId !== null || statesBySubmission.has(s.id));

      if (filters.workflowIds.length > 0) {
        flows = flows.filter(f => f.workflowId !== null && filters.workflowIds.includes(f.workflowId));
        if (flows.length === 0) continue;
      }
      if (!scope.all) {
        flows = flows.filter(f => (statesBySubmission.get(f.id) || []).some(isRelevantForScope));
        if (flows.length === 0) continue;
      }

      const flowInfos = flows.map(f => {
        const flowStates = statesBySubmission.get(f.id) || [];
        return {
          id: f.id,
          area: this.areaName(f.workflowName, f.formName),
          status: this.toFlowStatus(f.status),
          wasReturned: flowStates.some(st => st.status === 'Rejected'),
          states: flowStates
        };
      });

      const status = this.resolveRequestStatus(root, flowInfos.map(f => f.status), scope.all && filters.workflowIds.length === 0);
      const approvedTimes = flowInfos.flatMap(f => f.states.filter(st => st.status === 'Approved').map(st => new Date(st.updatedAt).getTime()));
      const completedAt = status === 'completed' && approvedTimes.length > 0 ? Math.max(...approvedTimes) : null;
      const createdAt = new Date(root.createdAt).getTime();

      if (status !== 'deleted') {
        for (const f of flowInfos) {
          if (f.status !== 'deleted') flowsForMetrics.push({ area: f.area, status: f.status, wasReturned: f.wasReturned });
          for (const st of f.states) {
            if (st.status !== 'Approved' && st.status !== 'Rejected') continue;
            const hours = (new Date(st.updatedAt).getTime() - new Date(st.createdAt).getTime()) / MS_PER_HOUR;
            if (hours >= 0) actionedStates.push({ key: `${f.area} · ${st.stageName || 'Etapa'}`, hours });
          }
        }
      }

      requests.push({
        id: root.id,
        consecutive: root.consecutive,
        formName: root.formName,
        requesterUserId: root.requesterUserId,
        requesterName: root.requesterName || 'Sin nombre',
        createdAt: root.createdAt,
        status,
        completedAt: completedAt ? new Date(completedAt) : null,
        cycleDays: completedAt ? this.round((completedAt - createdAt) / MS_PER_DAY) : null,
        ageDays: status === 'in_progress' || status === 'returned' ? this.round((now - createdAt) / MS_PER_DAY) : null,
        areas: flowInfos.map(f => ({ id: f.id, name: f.area, status: f.status }))
      });
    }

    const pending = pendingRows
      .filter(p => scope.all || scope.memberIds.has(p.assignedUserId))
      .map(p => ({
        submissionId: p.submissionId,
        consecutive: p.consecutive,
        formName: p.formName || 'Solicitud',
        area: this.areaName(p.workflowName, p.formName),
        stageName: p.stageName || 'Etapa',
        assignedUserId: p.assignedUserId,
        assigneeName: p.assigneeName || 'Sin asignar',
        teamName: p.teamName || 'Sin equipo',
        createdAt: p.createdAt,
        ageDays: this.round((now - new Date(p.createdAt).getTime()) / MS_PER_DAY)
      }));

    const activeRequests = requests.filter(r => r.status !== 'deleted');

    return {
      scope: { all: scope.all, teamNames: scope.teamNames },
      filterOptions,
      summary: this.buildSummary(requests, activeRequests, flowsForMetrics, pending),
      trend: this.buildTrend(activeRequests, filters),
      byForm: this.countBy(activeRequests, r => r.formName),
      byArea: this.buildByArea(flowsForMetrics),
      topRequesters: this.buildTopRequesters(activeRequests),
      stageTimes: this.buildStageTimes(actionedStates),
      workload: this.buildWorkload(pending),
      pendingByStage: this.buildPendingByStage(pending),
      pendingTasks: [...pending].sort((a, b) => b.ageDays - a.ageDays),
      requests: requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    };
  }

  // ---------- Carga de datos ----------

  private async loadRoots(filters: RequestsAnalyticsFilters): Promise<SubmissionRow[]> {
    const qb = AppDataSource.getRepository(DynamicFormSubmission).createQueryBuilder('s')
      .innerJoin('s.form', 'f')
      .leftJoin('s.requesterUser', 'u')
      .leftJoin('s.workflow', 'w')
      .select('s.id', 'id')
      .addSelect('s.parentSubmissionId', 'parentSubmissionId')
      .addSelect('s.formId', 'formId')
      .addSelect('s.workflowId', 'workflowId')
      .addSelect('s.status', 'status')
      .addSelect('s.createdAt', 'createdAt')
      .addSelect('s.consecutive', 'consecutive')
      .addSelect('s.requesterUserId', 'requesterUserId')
      .addSelect('f.name', 'formName')
      .addSelect('u.name', 'requesterName')
      .addSelect('w.name', 'workflowName')
      .where('s.parentSubmissionId IS NULL')
      .andWhere('s.createdAt BETWEEN :from AND :to', { from: filters.dateFrom, to: filters.dateTo });
    if (filters.formIds.length > 0) qb.andWhere('s.formId IN (:...formIds)', { formIds: filters.formIds });
    return qb.getRawMany();
  }

  /** Subsolicitudes creadas desde el inicio del periodo (los hijos siempre se crean después de su raíz). */
  private async loadDescendants(dateFrom: Date): Promise<SubmissionRow[]> {
    return AppDataSource.getRepository(DynamicFormSubmission).createQueryBuilder('s')
      .innerJoin('s.form', 'f')
      .leftJoin('s.workflow', 'w')
      .select('s.id', 'id')
      .addSelect('s.parentSubmissionId', 'parentSubmissionId')
      .addSelect('s.formId', 'formId')
      .addSelect('s.workflowId', 'workflowId')
      .addSelect('s.status', 'status')
      .addSelect('s.createdAt', 'createdAt')
      .addSelect('f.name', 'formName')
      .addSelect('w.name', 'workflowName')
      .where('s.parentSubmissionId IS NOT NULL')
      .andWhere('s.createdAt >= :from', { from: dateFrom })
      .getRawMany();
  }

  private async loadStates(dateFrom: Date): Promise<StateRow[]> {
    return AppDataSource.getRepository(DynamicSubmissionWorkflowState).createQueryBuilder('st')
      .innerJoin('st.submission', 's')
      .leftJoin('st.stage', 'stg')
      .select('st.submissionId', 'submissionId')
      .addSelect('st.assignedUserId', 'assignedUserId')
      .addSelect('st.actionedByUserId', 'actionedByUserId')
      .addSelect('st.status', 'status')
      .addSelect('st.createdAt', 'createdAt')
      .addSelect('st.updatedAt', 'updatedAt')
      .addSelect('stg.name', 'stageName')
      .where('s.createdAt >= :from', { from: dateFrom })
      .getRawMany();
  }

  /** Tareas pendientes actuales (foto del momento, no depende del periodo). */
  private async loadPendingTasks(filters: RequestsAnalyticsFilters): Promise<PendingRow[]> {
    const qb = AppDataSource.getRepository(DynamicSubmissionWorkflowState).createQueryBuilder('st')
      .innerJoin('st.submission', 's')
      .leftJoin('s.form', 'f')
      .leftJoin('s.workflow', 'w')
      .leftJoin('st.stage', 'stg')
      .leftJoin('st.assignedUser', 'u')
      .leftJoin('u.team', 't')
      .select('st.submissionId', 'submissionId')
      .addSelect('s.consecutive', 'consecutive')
      .addSelect('s.formId', 'formId')
      .addSelect('s.workflowId', 'workflowId')
      .addSelect('f.name', 'formName')
      .addSelect('w.name', 'workflowName')
      .addSelect('stg.name', 'stageName')
      .addSelect('st.assignedUserId', 'assignedUserId')
      .addSelect('u.name', 'assigneeName')
      .addSelect('t.name', 'teamName')
      .addSelect('st.createdAt', 'createdAt')
      .where('st.status = :pending', { pending: 'Pending' })
      .andWhere('s.status <> :deleted', { deleted: 'Deleted' });
    if (filters.formIds.length > 0) qb.andWhere('s.formId IN (:...formIds)', { formIds: filters.formIds });
    if (filters.workflowIds.length > 0) qb.andWhere('s.workflowId IN (:...workflowIds)', { workflowIds: filters.workflowIds });
    return qb.getRawMany();
  }

  private async loadFilterOptions() {
    const [forms, workflows] = await Promise.all([
      AppDataSource.getRepository(DynamicForm).find({
        where: { isInitialForm: true },
        select: ['id', 'name'],
        order: { displayOrder: 'ASC', name: 'ASC' }
      }),
      AppDataSource.getRepository(DynamicWorkflow).find({ select: ['id', 'name'], order: { name: 'ASC' } })
    ]);
    return {
      forms: forms.map(f => ({ id: f.id, name: f.name })),
      areas: workflows.map(w => ({ id: w.id, name: this.areaName(w.name, null) }))
    };
  }

  // ---------- Reglas de negocio ----------

  private findRootId(id: number, rootIds: Set<number>, parentOf: Map<number, number | null>): number | null {
    let current: number | null | undefined = id;
    for (let depth = 0; depth < MAX_TREE_DEPTH && current !== null && current !== undefined; depth++) {
      if (rootIds.has(current)) return current;
      current = parentOf.get(current);
    }
    return null;
  }

  private toFlowStatus(status: string): FlowStatus {
    const s = (status || '').toLowerCase();
    if (s === 'deleted') return 'deleted';
    if (s === 'rejected') return 'returned';
    if (s === 'completed' || s === 'approved') return 'completed';
    return 'in_progress';
  }

  /**
   * Estado de negocio de la solicitud según sus flujos por área:
   * eliminada > devuelta (algún área la devolvió) > en curso (algún área trabajando o cierre pendiente) > finalizada.
   */
  private resolveRequestStatus(root: SubmissionRow, flowStatuses: FlowStatus[], considerRootClosing: boolean): FlowStatus {
    if (this.toFlowStatus(root.status) === 'deleted') return 'deleted';
    const active = flowStatuses.filter(s => s !== 'deleted');
    if (active.includes('returned')) return 'returned';
    if (active.includes('in_progress')) return 'in_progress';
    if (considerRootClosing && this.toFlowStatus(root.status) === 'in_progress') return 'in_progress';
    if (active.length === 0) return this.toFlowStatus(root.status);
    return 'completed';
  }

  private areaName(workflowName: string | null, formName: string | null): string {
    const raw = workflowName || formName || 'Sin área';
    return raw.replace(/^flujo\s*:\s*/i, '').trim() || raw;
  }

  // ---------- Agregaciones ----------

  private buildSummary(requests: any[], active: any[], flows: { wasReturned: boolean }[], pending: { ageDays: number }[]) {
    const completed = active.filter(r => r.status === 'completed');
    const cycles = completed.map(r => r.cycleDays).filter((d: number | null) => d !== null) as number[];
    return {
      total: active.length,
      inProgress: active.filter(r => r.status === 'in_progress').length,
      returned: active.filter(r => r.status === 'returned').length,
      completed: completed.length,
      deleted: requests.length - active.length,
      completionRate: active.length > 0 ? this.round((completed.length / active.length) * 100) : null,
      returnRate: flows.length > 0 ? this.round((flows.filter(f => f.wasReturned).length / flows.length) * 100) : null,
      avgCycleDays: this.average(cycles),
      pendingTasks: pending.length,
      avgPendingAgeDays: this.average(pending.map(p => p.ageDays)),
      oldestPendingDays: pending.length > 0 ? Math.max(...pending.map(p => p.ageDays)) : null
    };
  }

  /** Serie de creadas vs finalizadas por día (rangos cortos) o por mes (rangos largos), en la zona horaria del usuario. */
  private buildTrend(requests: any[], filters: RequestsAnalyticsFilters) {
    const offsetMs = filters.tzOffsetMinutes * 60 * 1000;
    const rangeDays = (filters.dateTo.getTime() - filters.dateFrom.getTime()) / MS_PER_DAY;
    const granularity: 'day' | 'month' = rangeDays <= DAILY_TREND_MAX_DAYS ? 'day' : 'month';
    const keyOf = (date: Date | number) => {
      const local = new Date(new Date(date).getTime() - offsetMs).toISOString();
      return granularity === 'day' ? local.slice(0, 10) : local.slice(0, 7);
    };

    const keys: string[] = [];
    const cursor = new Date(filters.dateFrom.getTime() - offsetMs);
    const end = keyOf(filters.dateTo);
    while (keys.length === 0 || keys[keys.length - 1] !== end) {
      const key = granularity === 'day' ? cursor.toISOString().slice(0, 10) : cursor.toISOString().slice(0, 7);
      if (!keys.includes(key)) keys.push(key);
      if (granularity === 'day') cursor.setUTCDate(cursor.getUTCDate() + 1);
      else cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
      if (keys.length > 400) break;
    }

    const created = new Map(keys.map(k => [k, 0]));
    const completed = new Map(keys.map(k => [k, 0]));
    for (const r of requests) {
      const ck = keyOf(r.createdAt);
      if (created.has(ck)) created.set(ck, created.get(ck)! + 1);
      if (r.completedAt) {
        const fk = keyOf(r.completedAt);
        if (completed.has(fk)) completed.set(fk, completed.get(fk)! + 1);
      }
    }
    return {
      granularity,
      labels: keys,
      created: keys.map(k => created.get(k) || 0),
      completed: keys.map(k => completed.get(k) || 0)
    };
  }

  private buildByArea(flows: { area: string; status: FlowStatus }[]) {
    const map = new Map<string, { area: string; inProgress: number; returned: number; completed: number; total: number }>();
    for (const f of flows) {
      if (!map.has(f.area)) map.set(f.area, { area: f.area, inProgress: 0, returned: 0, completed: 0, total: 0 });
      const row = map.get(f.area)!;
      if (f.status === 'in_progress') row.inProgress++;
      if (f.status === 'returned') row.returned++;
      if (f.status === 'completed') row.completed++;
      row.total++;
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }

  private buildTopRequesters(requests: any[]) {
    const map = new Map<number, { name: string; created: number; completed: number; inProgress: number }>();
    for (const r of requests) {
      if (!map.has(r.requesterUserId)) map.set(r.requesterUserId, { name: r.requesterName, created: 0, completed: 0, inProgress: 0 });
      const row = map.get(r.requesterUserId)!;
      row.created++;
      if (r.status === 'completed') row.completed++;
      if (r.status === 'in_progress' || r.status === 'returned') row.inProgress++;
    }
    return [...map.values()].sort((a, b) => b.created - a.created).slice(0, TOP_REQUESTERS_LIMIT);
  }

  private buildStageTimes(states: { key: string; hours: number }[]) {
    return [...this.groupBy(states, s => s.key).entries()]
      .map(([stage, list]) => ({ stage, avgHours: this.average(list.map(s => s.hours)) || 0, count: list.length }))
      .sort((a, b) => b.avgHours - a.avgHours)
      .slice(0, SLOWEST_STAGES_LIMIT);
  }

  private buildWorkload(pending: any[]) {
    return [...this.groupBy(pending, p => p.assignedUserId).values()]
      .map(list => ({
        userName: list[0].assigneeName,
        teamName: list[0].teamName,
        pending: list.length,
        avgAgeDays: this.average(list.map((p: any) => p.ageDays)),
        maxAgeDays: Math.max(...list.map((p: any) => p.ageDays))
      }))
      .sort((a, b) => b.pending - a.pending || (b.maxAgeDays - a.maxAgeDays));
  }

  private buildPendingByStage(pending: any[]) {
    return [...this.groupBy(pending, p => `${p.area} · ${p.stageName}`).entries()]
      .map(([stage, list]) => ({ stage, pending: list.length, avgAgeDays: this.average(list.map((p: any) => p.ageDays)) }))
      .sort((a, b) => b.pending - a.pending);
  }

  // ---------- Utilidades ----------

  private groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>();
    for (const item of items) {
      const key = keyFn(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }

  private countBy<T>(items: T[], keyFn: (item: T) => string) {
    return [...this.groupBy(items, keyFn).entries()]
      .map(([label, list]) => ({ label, count: list.length }))
      .sort((a, b) => b.count - a.count);
  }

  private average(values: number[]): number | null {
    if (values.length === 0) return null;
    return this.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }

  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }
}

export const requestsAnalyticsService = new RequestsAnalyticsService();
