import { In } from 'typeorm';
import { AppDataSource } from '../config/typeorm.config';
import { DynamicForm, DynamicFormSubmission, DynamicSubmissionWorkflowState, Team, User } from '../models';

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
  teamIds: number[];
  tzOffsetMinutes: number;
}

export interface AnalyticsScope {
  all: boolean;
  memberIds: Set<number>;
  teamIds: Set<number>;
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
}

interface StateRow {
  id: number;
  submissionId: number;
  assignedUserId: number;
  actionedByUserId: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  stageName: string | null;
  assigneeType: string | null;
  teamId: number | null;
  teamName: string | null;
}

interface PendingRow {
  submissionId: number;
  consecutive: string | null;
  formId: number;
  formName: string | null;
  stageName: string | null;
  assignedUserId: number;
  assigneeName: string | null;
  teamId: number | null;
  teamName: string | null;
  createdAt: Date;
}

interface AreaFlowInfo {
  id: number;
  teamId: number | null;
  area: string;
  status: FlowStatus;
  wasReturned: boolean;
}

/**
 * Calcula los indicadores del Informe de Solicitudes a partir de las solicitudes dinámicas
 * (solicitud raíz + flujos por área/equipo + tareas de cada etapa).
 */
export class RequestsAnalyticsService {
  /**
   * Determina el alcance del usuario en el informe:
   * - Administradores: ven todas las áreas (all = true).
   * - No administradores: ven únicamente la información del equipo al que pertenecen (all = false).
   */
  async resolveScope(userId: number, role: string | undefined): Promise<AnalyticsScope | null> {
    if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');

    if (ADMIN_ROLES.includes((role || '').toLowerCase().trim())) {
      return { all: true, memberIds: new Set(), teamIds: new Set(), teamNames: [] };
    }

    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: userId },
      relations: ['team']
    });

    const teamMap = new Map<number, string>();
    if (user?.team) {
      teamMap.set(user.team.id, user.team.name);
    } else {
      const ledTeams = await AppDataSource.getRepository(Team).find({
        where: { leaderId: userId },
        select: ['id', 'name']
      });
      for (const t of ledTeams) teamMap.set(t.id, t.name);
    }

    if (teamMap.size === 0) return null;

    const teamIds = [...teamMap.keys()];
    const members = await AppDataSource.getRepository(User).find({
      where: { teamId: In(teamIds) },
      select: ['id']
    });

    return {
      all: false,
      memberIds: new Set([userId, ...members.map(m => m.id)]),
      teamIds: new Set(teamIds),
      teamNames: [...teamMap.values()]
    };
  }

  async getAnalytics(scope: AnalyticsScope, filters: RequestsAnalyticsFilters) {
    if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');

    const effectiveTeamIds = scope.all ? filters.teamIds : [...scope.teamIds];
    const effectiveFilters: RequestsAnalyticsFilters = {
      ...filters,
      teamIds: effectiveTeamIds
    };

    const [roots, descendants, states, pendingRows, filterOptions] = await Promise.all([
      this.loadRoots(effectiveFilters),
      this.loadDescendants(effectiveFilters.dateFrom),
      this.loadStates(effectiveFilters.dateFrom),
      this.loadPendingTasks(effectiveFilters),
      this.loadFilterOptions(scope)
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

    const isStateInTeamFilter = (st: StateRow) =>
      effectiveTeamIds.length === 0 || (st.teamId !== null && effectiveTeamIds.includes(st.teamId));

    const requests: any[] = [];
    const flowsForMetrics: { area: string; status: FlowStatus; wasReturned: boolean }[] = [];
    const actionedStates: { key: string; hours: number }[] = [];

    for (const root of roots) {
      const tree = [root, ...(descendantsByRoot.get(root.id) || [])];
      const rawFlows = tree.filter(s => s.workflowId !== null || statesBySubmission.has(s.id));

      const areaFlows: AreaFlowInfo[] = [];
      const matchingFlows: { sub: SubmissionRow; states: StateRow[] }[] = [];

      for (const f of rawFlows) {
        const flowStates = statesBySubmission.get(f.id) || [];
        const extracted = this.extractFlowAreas(f, flowStates, root.requesterUserId, effectiveTeamIds);
        const filteredAreas = effectiveTeamIds.length > 0
          ? extracted.filter(a => a.teamId !== null && effectiveTeamIds.includes(a.teamId))
          : extracted;

        if (effectiveTeamIds.length > 0 && filteredAreas.length === 0) continue;

        areaFlows.push(...filteredAreas);
        matchingFlows.push({ sub: f, states: flowStates });
      }

      if (effectiveTeamIds.length > 0 && matchingFlows.length === 0) continue;

      const considerRootClosing = scope.all && effectiveTeamIds.length === 0;
      const status = this.resolveRequestStatus(root, areaFlows.map(a => a.status), considerRootClosing);
      const approvedTimes = matchingFlows.flatMap(f =>
        f.states.filter(st => st.status === 'Approved').map(st => new Date(st.updatedAt).getTime())
      );
      const completedAt = status === 'completed' && approvedTimes.length > 0 ? Math.max(...approvedTimes) : null;
      const createdAt = new Date(root.createdAt).getTime();

      if (status !== 'deleted') {
        for (const af of areaFlows) {
          if (af.status !== 'deleted') {
            flowsForMetrics.push({ area: af.area, status: af.status, wasReturned: af.wasReturned });
          }
        }
        for (const f of matchingFlows) {
          if (this.toFlowStatus(f.sub.status) === 'deleted') continue;
          for (const st of f.states) {
            if (st.status !== 'Approved' && st.status !== 'Rejected') continue;
            if (!isStateInTeamFilter(st)) continue;
            const hours = (new Date(st.updatedAt).getTime() - new Date(st.createdAt).getTime()) / MS_PER_HOUR;
            if (hours >= 0) {
              actionedStates.push({ key: `${st.teamName || 'Sin área'} · ${st.stageName || 'Etapa'}`, hours });
            }
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
        areas: areaFlows.map(a => ({ id: a.id, name: a.area, status: a.status }))
      });
    }

    const pending = pendingRows.map(p => ({
      submissionId: p.submissionId,
      consecutive: p.consecutive,
      formName: p.formName || 'Solicitud',
      area: p.teamName || 'Sin área',
      stageName: p.stageName || 'Etapa',
      assignedUserId: p.assignedUserId,
      assigneeName: p.assigneeName || 'Sin asignar',
      teamName: p.teamName || 'Sin equipo',
      createdAt: p.createdAt,
      ageDays: this.round((now - new Date(p.createdAt).getTime()) / MS_PER_DAY)
    }));

    const activeRequests = requests.filter(r => r.status !== 'deleted');

    return {
      scope: { all: scope.all, teamIds: [...scope.teamIds], teamNames: scope.teamNames },
      filterOptions,
      summary: this.buildSummary(requests, activeRequests, flowsForMetrics, pending),
      trend: this.buildTrend(activeRequests, effectiveFilters),
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
      .where('s.parentSubmissionId IS NULL')
      .andWhere('s.createdAt BETWEEN :from AND :to', { from: filters.dateFrom, to: filters.dateTo });
    if (filters.formIds.length > 0) qb.andWhere('s.formId IN (:...formIds)', { formIds: filters.formIds });
    return qb.getRawMany();
  }

  /** Subsolicitudes creadas desde el inicio del periodo (los hijos siempre se crean después de su raíz). */
  private async loadDescendants(dateFrom: Date): Promise<SubmissionRow[]> {
    return AppDataSource.getRepository(DynamicFormSubmission).createQueryBuilder('s')
      .innerJoin('s.form', 'f')
      .select('s.id', 'id')
      .addSelect('s.parentSubmissionId', 'parentSubmissionId')
      .addSelect('s.formId', 'formId')
      .addSelect('s.workflowId', 'workflowId')
      .addSelect('s.status', 'status')
      .addSelect('s.createdAt', 'createdAt')
      .addSelect('f.name', 'formName')
      .where('s.parentSubmissionId IS NOT NULL')
      .andWhere('s.createdAt >= :from', { from: dateFrom })
      .getRawMany();
  }

  private async loadStates(dateFrom: Date): Promise<StateRow[]> {
    return AppDataSource.getRepository(DynamicSubmissionWorkflowState).createQueryBuilder('st')
      .innerJoin('st.submission', 's')
      .leftJoin('st.stage', 'stg')
      .leftJoin('st.assignedUser', 'u')
      .leftJoin('u.team', 'ut')
      .leftJoin('stg.assigneeTeam', 'stgt')
      .select('st.id', 'id')
      .addSelect('st.submissionId', 'submissionId')
      .addSelect('st.assignedUserId', 'assignedUserId')
      .addSelect('st.actionedByUserId', 'actionedByUserId')
      .addSelect('st.status', 'status')
      .addSelect('st.createdAt', 'createdAt')
      .addSelect('st.updatedAt', 'updatedAt')
      .addSelect('stg.name', 'stageName')
      .addSelect('stg.assigneeType', 'assigneeType')
      .addSelect('COALESCE(u.teamId, stg.assigneeTeamId)', 'teamId')
      .addSelect('COALESCE(ut.name, stgt.name)', 'teamName')
      .where('s.createdAt >= :from', { from: dateFrom })
      .orderBy('st.id', 'ASC')
      .getRawMany();
  }

  /** Tareas pendientes actuales (foto del momento, no depende del periodo). */
  private async loadPendingTasks(filters: RequestsAnalyticsFilters): Promise<PendingRow[]> {
    const qb = AppDataSource.getRepository(DynamicSubmissionWorkflowState).createQueryBuilder('st')
      .innerJoin('st.submission', 's')
      .leftJoin('s.form', 'f')
      .leftJoin('st.stage', 'stg')
      .leftJoin('st.assignedUser', 'u')
      .leftJoin('u.team', 'ut')
      .leftJoin('stg.assigneeTeam', 'stgt')
      .select('st.submissionId', 'submissionId')
      .addSelect('s.consecutive', 'consecutive')
      .addSelect('s.formId', 'formId')
      .addSelect('f.name', 'formName')
      .addSelect('stg.name', 'stageName')
      .addSelect('st.assignedUserId', 'assignedUserId')
      .addSelect('u.name', 'assigneeName')
      .addSelect('COALESCE(u.teamId, stg.assigneeTeamId)', 'teamId')
      .addSelect('COALESCE(ut.name, stgt.name)', 'teamName')
      .addSelect('st.createdAt', 'createdAt')
      .where('st.status = :pending', { pending: 'Pending' })
      .andWhere('s.status <> :deleted', { deleted: 'Deleted' });
    if (filters.formIds.length > 0) qb.andWhere('s.formId IN (:...formIds)', { formIds: filters.formIds });
    if (filters.teamIds.length > 0) {
      qb.andWhere('COALESCE(u.teamId, stg.assigneeTeamId) IN (:...teamIds)', { teamIds: filters.teamIds });
    }
    return qb.getRawMany();
  }

  private async loadFilterOptions(scope: AnalyticsScope) {
    const [forms, teams] = await Promise.all([
      AppDataSource.getRepository(DynamicForm).find({
        where: { isInitialForm: true },
        select: ['id', 'name'],
        order: { displayOrder: 'ASC', name: 'ASC' }
      }),
      AppDataSource.getRepository(Team).find({ select: ['id', 'name'], order: { name: 'ASC' } })
    ]);
    const visibleTeams = scope.all ? teams : teams.filter(t => scope.teamIds.has(t.id));
    return {
      forms: forms.map(f => ({ id: f.id, name: f.name })),
      areas: visibleTeams.map(t => ({ id: t.id, name: t.name }))
    };
  }

  // ---------- Reglas de negocio ----------

  /**
   * Extrae las áreas (equipos de la tabla Teams) que participan en un flujo,
   * ignorando las etapas de cierre/aprobación del comercial solicitante salvo que sean las únicas del flujo.
   */
  private extractFlowAreas(
    flow: SubmissionRow,
    flowStates: StateRow[],
    requesterUserId: number,
    explicitTeamIds: number[]
  ): AreaFlowInfo[] {
    const baseStatus = this.toFlowStatus(flow.status);
    if (flowStates.length === 0) {
      return [{ id: flow.id, teamId: null, area: 'Sin área', status: baseStatus, wasReturned: false }];
    }

    const operationalStates = flowStates.filter(
      st =>
        (st.teamId !== null && explicitTeamIds.includes(st.teamId)) ||
        (st.assigneeType !== 'requester' && st.assignedUserId !== requesterUserId)
    );
    const chosenStates = operationalStates.length > 0 ? operationalStates : flowStates;

    const byTeam = new Map<number | null, StateRow[]>();
    for (const st of chosenStates) {
      const key = st.teamId ?? null;
      if (!byTeam.has(key)) byTeam.set(key, []);
      byTeam.get(key)!.push(st);
    }

    const result: AreaFlowInfo[] = [];
    for (const [teamId, teamStates] of byTeam.entries()) {
      const area = teamStates[0].teamName || 'Sin área';
      let status: FlowStatus = baseStatus;
      if (baseStatus !== 'deleted' && baseStatus !== 'completed') {
        if (teamStates.some(st => st.status === 'Pending')) {
          status = 'in_progress';
        } else if (teamStates[teamStates.length - 1].status === 'Rejected' || baseStatus === 'returned') {
          status = 'returned';
        } else if (teamStates.every(st => st.status === 'Approved')) {
          status = 'completed';
        }
      }
      result.push({
        id: flow.id,
        teamId,
        area,
        status,
        wasReturned: teamStates.some(st => st.status === 'Rejected')
      });
    }
    return result;
  }

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
