import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { MultiSelectModule } from 'primeng/multiselect';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { LucideIconComponent } from '../../components/lucide-icon/lucide-icon.component';
import { ProductionService } from '../../services/production.service';
import { UserService, User } from '../../services/user.service';
import { TeamService } from '../../services/team.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

interface FormFieldItem {
  id?: number;
  name: string;
  label: string;
  description: string;
  type: string;
  placeholder: string;
  isRequired: boolean;
  isReadOnly: boolean;
  isActive: boolean;
  defaultValueExpression: string;
  displayOrder: number;
  metadata: any;
}

interface MultiFormOptionConfig {
  sourceFormId: number | null;
  targetType?: 'subflow' | 'user' | 'team_random' | 'team_leader';
  targetSubflowFormId?: number | null;
  assignedUserId: number | null;
  assignedTeamId: number | null;
  targetFormIdToFill: number | null;
}

interface NextStageAssigneeOptionConfig {
  id?: string;
  type: 'specific_user' | 'team_random' | 'subteam_random' | 'team_leader' | 'team_workload' | 'requester' | 'requester_boss';
  userId?: number | null;
  teamId?: number | null;
  subteamId?: number | null;
  label?: string;
}

interface WorkflowStageItem {
  id?: number;
  name: string;
  description: string;
  stepOrder: number;
  assigneeType: 'specific_user' | 'requester' | 'requester_boss' | 'team' | 'team_random' | 'team_workload' | 'team_leader' | 'subflow' | 'multiple_users' | 'previous_stage_actioner' | 'previous_stage_team_random' | 'subteam_random' | 'chosen_by_previous_stage';
  assigneeUserId: number | null;
  assigneeTeamId: number | null;
  assigneeSubteamId?: number | null;
  formIdToFill: number | null;
  rejectionTargetType: 'previous_sender' | 'specific_user' | 'team_random';
  rejectionTargetUserId: number | null;
  rejectionTargetTeamId: number | null;
  requireCommentOnApprove?: boolean;
  excludeTeamLeader?: boolean;
  assigneeUserIds?: { userId: number; formId: number | null }[];
  selectedUserIds?: number[];
  customForms?: { [userId: number]: number | null };
  multiFormsConfig?: MultiFormOptionConfig[];
  maxSelectedForms?: number | null;
  allowChooseNextStageAssignee?: boolean;
  nextStageAssigneeOptions?: NextStageAssigneeOptionConfig[];
}

@Component({
  selector: 'app-requests-beta-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TableModule,
    DialogModule,
    SelectModule,
    MultiSelectModule,
    CheckboxModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    BadgeModule,
    TooltipModule,
    PageHeaderComponent,
    LucideIconComponent
  ],
  templateUrl: './requests-beta-admin.component.html',
  styleUrls: ['./requests-beta-admin.component.css'],
  providers: [MessageService, ConfirmationService]
})
export class RequestsBetaAdminComponent implements OnInit {
  private productionService = inject(ProductionService);
  private userService = inject(UserService);
  private teamService = inject(TeamService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  currentUser = computed(() => this.authService.currentUser());

  activeTab = signal<string>('forms');
  forms = signal<any[]>([]);
  activeForms = computed(() => this.forms().filter(f => f.isActive !== false));
  entryForms = computed(() => this.activeForms().filter(f => f.isEntryForm));
  internalForms = computed(() => this.activeForms().filter(f => !f.isEntryForm));

  users = signal<User[]>([]);
  teams = signal<any[]>([]);

  showFormDialog = signal<boolean>(false);
  isNewForm = signal<boolean>(false);
  formMetadataText = '';
  initialFormsFields = signal<any[]>([]);
  conditionsList = signal<any[]>([]);

  operatorOptions = [
    { label: 'Contiene', value: 'contains' },
    { label: 'Igual (=)', value: 'eq' },
    { label: 'Mayor (>)', value: 'gt' },
    { label: 'Menor (<)', value: 'lt' },
    { label: 'Mayor o Igual (>=)', value: 'gte' },
    { label: 'Menor o Igual (<=)', value: 'lte' }
  ];

  selectedForm = signal<any>({
    id: null,
    name: '',
    description: '',
    isEntryForm: true,
    isActive: true,
    responsible: '',
    role: '',
    icon: 'tag'
  });

  formTeamWorkflows = signal<{ [teamId: number]: number | null }>({});
  formRequireClosingStep = signal<boolean>(false);
  formClosingType = signal<'form' | 'workflow'>('form');
  formClosingFormId = signal<number | null>(null);
  formClosingWorkflowId = signal<number | null>(null);

  closingTypeOptions = [
    { label: 'Formulario Dinámico', value: 'form' },
    { label: 'Flujo de Trabajo Adicional', value: 'workflow' }
  ];

  getTeamWorkflow(teamId: number): number | null {
    return this.formTeamWorkflows()[teamId] ?? null;
  }

  setTeamWorkflow(teamId: number, workflowId: number | null) {
    const current = { ...this.formTeamWorkflows() };
    if (workflowId) {
      current[teamId] = workflowId;
    } else {
      delete current[teamId];
    }
    this.formTeamWorkflows.set(current);
  }

  iconOptions = [
    { label: 'Documento / Editar', value: 'edit' },
    { label: 'Base de Datos', value: 'database' },
    { label: 'Idea / Foco', value: 'lightbulb' },
    { label: 'Cohete / Lanzamiento', value: 'rocket' },
    { label: 'Gráfico / Tráfico', value: 'trending-up' },
    { label: 'Etiqueta', value: 'tag' },
    { label: 'Engranaje', value: 'settings' },
    { label: 'Usuarios', value: 'users' },
    { label: 'Correo', value: 'mail' },
    { label: 'Imagen', value: 'image' },
    { label: 'Carpeta', value: 'folder' }
  ];

  showFieldsDialog = signal<boolean>(false);
  editingFormForFields = signal<any>(null);
  formFields = signal<FormFieldItem[]>([]);

  showFileConfigDialog = signal<boolean>(false);
  selectedFieldForFileConfig = signal<any>(null);

  showSelectConfigDialog = signal<boolean>(false);
  selectedFieldForSelectConfig = signal<any>(null);
  tempSelectOptions = signal<{ value: string }[]>([]);
  showExpressionsHelpDialog = signal<boolean>(false);

  showDynamicListConfigDialog = signal<boolean>(false);
  selectedFieldForDynamicListConfig = signal<any>(null);
  tempDynamicListOptions = signal<{ value: string }[]>([]);
  tempDynamicListSubFields = signal<{ name: string; label: string; type: string }[]>([]);

  showFormulaConfigDialog = signal<boolean>(false);
  selectedFieldForFormulaConfig = signal<any>(null);
  tempFormulaExpression = signal<string>('');
  tempFormulaRounding = signal<number>(2);
  showFormulaHelpDialog = signal<boolean>(false);

  showDependencyConfigDialog = signal<boolean>(false);
  selectedFieldForDependencyConfig = signal<any>(null);
  tempDependencyFieldName = signal<string>('');
  tempDependencyOperator = signal<string>('eq');
  tempDependencyValue = signal<string>('');
  tempDependencySelectedOptions = signal<string[]>([]);

  dependencyOperatorOptions = [
    { label: 'Igual a (=)', value: 'eq' },
    { label: 'Diferente de (≠)', value: 'neq' },
    { label: 'Mayor que (>)', value: 'gt' },
    { label: 'Mayor o igual que (≥)', value: 'gte' },
    { label: 'Menor que (<)', value: 'lt' },
    { label: 'Menor o igual que (≤)', value: 'lte' },
    { label: 'Contiene', value: 'contains' },
    { label: 'Tiene algún valor (No vacío)', value: 'is_not_empty' },
    { label: 'Está vacío', value: 'is_empty' }
  ];

  showNumberConfigDialog = signal<boolean>(false);
  selectedFieldForNumberConfig = signal<any | null>(null);
  tempNumberFormat = 'none';
  numberFormatOptions = [
    { label: 'Ninguno / Sin formato', value: 'none' },
    { label: 'Moneda / Divisa (COP) - $ 123.456', value: 'currency_cop' },
    { label: 'Moneda / Divisa (USD) - $ 123,456', value: 'currency_usd' },
    { label: 'Separador de miles (Punto) - 123.456', value: 'thousands_dot' },
    { label: 'Separador de miles (Coma) - 123,456', value: 'thousands_comma' }
  ];

  workflows = signal<any[]>([]);
  activeWorkflows = computed(() => this.workflows().filter(w => w.isActive !== false));
  selectedWorkflowId = signal<number | null>(null);
  showWorkflowDialog = signal<boolean>(false);
  isNewWorkflow = signal<boolean>(false);
  selectedWorkflow = signal<{ id: number | null; name: string; description: string }>({ id: null, name: '', description: '' });
  workflowStages = signal<WorkflowStageItem[]>([]);
  loadingStages = signal<boolean>(false);

  availableSubflows = computed(() => {
    return this.activeWorkflows().map(w => ({
      id: w.id,
      name: `🚀 ${w.name}`
    }));
  });

  formToFillOptions = computed(() => [
    { id: -1, name: '📋 Múltiples Formularios Preconfigurados' },
    ...this.activeForms()
  ]);

  getWorkflowName(workflowId: number | null): string {
    if (!workflowId) return 'Sin flujo asignado';
    const wf = this.workflows().find(w => w.id === workflowId);
    return wf ? wf.name : `Flujo #${workflowId}`;
  }

  loadingForms = signal<boolean>(false);

  fieldTypeOptions = [
    { label: 'Texto Corto', value: 'text' },
    { label: 'Párrafo / Textarea', value: 'textarea' },
    { label: 'Número Entero', value: 'number' },
    { label: 'Número Decimal', value: 'decimal' },
    { label: 'Fecha Simple', value: 'date' },
    { label: 'Fecha y Hora (24h)', value: 'datetime' },
    { label: 'Lista Desplegable / Listado', value: 'select' },
    { label: 'Selección Múltiple / Multiselect', value: 'multiselect' },
    { label: 'Archivo / Adjunto', value: 'file' },
    { label: 'Cálculo Matemático / Fórmula', value: 'formula' },
    { label: 'Tabla / Lista Dinámica de Items', value: 'dynamic_list' },
    { label: 'Encabezado de Sección / Grupo', value: 'section_header' },
    { label: 'Cliente (Autocompletar)', value: 'customer' }
  ];

  assigneeTypeOptions = [
    { label: '⚡ Dinámico (Escogido en la etapa anterior)', value: 'chosen_by_previous_stage' },
    { label: 'Usuario Específico', value: 'specific_user' },
    { label: '👔 Líder de Equipo', value: 'team_leader' },
    { label: 'Equipo / Rol (Al Azar)', value: 'team_random' },
    { label: '👥 Subequipo (Al Azar)', value: 'subteam_random' },
    { label: 'Equipo / Rol (Menor Carga)', value: 'team_workload' },
    { label: 'Equipo / Rol (Todos en Paralelo)', value: 'team' },
    { label: '🎲 Al Azar del Equipo del Aprobador Anterior', value: 'previous_stage_team_random' },
    { label: 'Aprobador de Etapa Anterior', value: 'previous_stage_actioner' },
    { label: '🚀 Invocar Flujo de Trabajo (Sub-Flujo)', value: 'subflow' },
    { label: 'Creador de la Solicitud', value: 'requester' },
    { label: 'Jefe Directo del Solicitante', value: 'requester_boss' },
    { label: 'Usuarios Múltiples', value: 'multiple_users' }
  ];

  targetTypeOptions = [
    { label: '🚀 Flujo de Trabajo (Sub-Flujo)', value: 'subflow' },
    { label: '👤 Usuario Específico', value: 'user' },
    { label: '👔 Líder de Equipo', value: 'team_leader' },
    { label: '👥 Miembro de Equipo (Al Azar)', value: 'team_random' }
  ];

  rejectionTypeOptions = [
    { label: 'Anterior Remitente', value: 'previous_sender' },
    { label: 'Usuario Específico', value: 'specific_user' },
    { label: 'Integrante al Azar del Equipo', value: 'team_random' }
  ];

  nextStageAssigneeTypes = [
    { label: '👤 Usuario Específico', value: 'specific_user' },
    { label: '🎲 Al Azar de un Equipo', value: 'team_random' },
    { label: '👔 Líder del Equipo', value: 'team_leader' },
    { label: '⚖️ Menor Carga del Equipo', value: 'team_workload' },
    { label: '👥 Al Azar de un Subequipo', value: 'subteam_random' },
    { label: '👤 Creador de la Solicitud (Solicitante)', value: 'requester' },
    { label: '👔 Jefe Directo del Solicitante', value: 'requester_boss' }
  ];

  ngOnInit() {
    if (!this.authService.isCommercialOrAdmin()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Acceso Restringido',
        detail: 'No tienes permisos para administrar formularios.'
      });
      this.router.navigate(['/requests-beta']);
      return;
    }

    this.loadForms();
    this.loadUsersAndTeams();
    this.loadInitialFormsFields();
    this.loadWorkflows();
  }

  goToProduction() {
    this.router.navigate(['/requests-beta']);
  }

  loadForms() {
    this.loadingForms.set(true);
    this.productionService.adminGetForms().subscribe({
      next: (data) => {
        this.forms.set(data);
        this.loadingForms.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los formularios.' });
        this.loadingForms.set(false);
      }
    });
  }

  loadUsersAndTeams() {
    this.userService.getAllUsers().subscribe({
      next: (data) => this.users.set(data)
    });
    this.teamService.getTeams().subscribe({
      next: (res) => this.teams.set(res.data || [])
    });
  }

  loadInitialFormsFields() {
    this.productionService.getInitialForm().subscribe({
      next: (forms: any[]) => {
        const formsList = Array.isArray(forms) ? forms : (forms ? [forms] : []);
        if (formsList.length > 0) {
          const fieldsObservables = formsList.map(form =>
            this.productionService.getDynamicFormFields(form.id)
          );
          forkJoin(fieldsObservables).subscribe({
            next: (allFieldsArray: any[][]) => {
              const list: any[] = [];
              formsList.forEach((form, idx) => {
                const fields = allFieldsArray[idx] || [];
                fields.forEach((f: any) => {
                  if (f.type !== 'section_header') {
                    list.push({
                      key: `${form.id}_${f.name}`,
                      label: `[${form.name}] ${f.label} (${f.type})`,
                      formId: form.id,
                      fieldName: f.name,
                      formName: form.name
                    });
                  }
                });
              });
              this.initialFormsFields.set(list);
            }
          });
        }
      }
    });
  }

  addCondition() {
    const list = this.conditionsList();
    list.push({ fieldKey: '', operator: 'contains', value: '' });
    this.conditionsList.set([...list]);
  }

  removeCondition(index: number) {
    const list = this.conditionsList();
    list.splice(index, 1);
    this.conditionsList.set([...list]);
  }

  openCreateFormDialog() {
    this.isNewForm.set(true);
    this.formMetadataText = '';
    this.conditionsList.set([]);
    this.formTeamWorkflows.set({});
    this.selectedForm.set({
      id: null,
      name: '',
      description: '',
      isInitialForm: false,
      workflowId: null,
      isActive: true,
      responsible: '',
      role: '',
      icon: 'tag',
      displayOrder: 0
    });
    this.formTeamWorkflows.set({});
    this.formRequireClosingStep.set(false);
    this.formClosingType.set('form');
    this.formClosingFormId.set(null);
    this.formClosingWorkflowId.set(null);
    this.showFormDialog.set(true);
  }

  openEditFormDialog(form: any) {
    this.isNewForm.set(false);
    this.selectedForm.set({ ...form });
    this.formMetadataText = form.metadata ? (typeof form.metadata === 'object' ? JSON.stringify(form.metadata, null, 2) : form.metadata) : '';

    let teamWfs: { [teamId: number]: number | null } = {};
    let closingCfg: any = null;
    if (form.metadata) {
      try {
        const meta = typeof form.metadata === 'object' ? form.metadata : JSON.parse(form.metadata);
        if (meta && meta.teamWorkflows && typeof meta.teamWorkflows === 'object') {
          teamWfs = { ...meta.teamWorkflows };
        }
        if (meta && meta.closingConfig) {
          closingCfg = meta.closingConfig;
        }
      } catch (e) {}
    }
    this.formTeamWorkflows.set(teamWfs);
    this.formRequireClosingStep.set(!!(closingCfg && closingCfg.requireClosingStep));
    this.formClosingType.set(closingCfg?.closingType || 'form');
    this.formClosingFormId.set(closingCfg?.closingFormId || closingCfg?.formId || null);
    this.formClosingWorkflowId.set(closingCfg?.closingWorkflowId || closingCfg?.workflowId || null);
    this.showFormDialog.set(true);
  }

  onResponsibleChange(event: any) {
    const selectedName = event.value;
    const user = this.users().find(u => u.name === selectedName);
    if (user) {
      const current = this.selectedForm();
      this.selectedForm.set({
        ...current,
        responsible: user.name,
        role: user.teamName || ''
      });
    }
  }

  saveForm() {
    const data = { ...this.selectedForm() };
    if (!data.name || !data.name.trim()) {
      this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'El nombre es obligatorio.' });
      return;
    }

    let meta: any = {};
    if (data.metadata) {
      try {
        meta = typeof data.metadata === 'object' ? { ...data.metadata } : JSON.parse(data.metadata);
      } catch(e) {
        meta = {};
      }
    }
    const requireClosing = this.formRequireClosingStep();
    meta.closingConfig = {
      requireClosingStep: requireClosing,
      closingType: this.formClosingType(),
      closingFormId: requireClosing && this.formClosingType() === 'form' ? this.formClosingFormId() : null,
      closingWorkflowId: requireClosing && this.formClosingType() === 'workflow' ? this.formClosingWorkflowId() : null
    };
    data.metadata = JSON.stringify(meta);

    if (this.isNewForm()) {
      this.productionService.adminCreateForm(data).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Formulario creado exitosamente.' });
          this.showFormDialog.set(false);
          this.loadForms();
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el formulario.' })
      });
    } else {
      this.productionService.adminUpdateForm(data.id, data).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Formulario actualizado.' });
          this.showFormDialog.set(false);
          this.loadForms();
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el formulario.' })
      });
    }
  }

  confirmSoftDeleteForm(form: any) {
    this.confirmationService.confirm({
      message: `El formulario "${form.name}" se ocultará y ya no se podrá utilizar para nuevas solicitudes ni aparecerá en la bandeja, pero se conservará en el histórico. ¿Deseas continuar?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      accept: () => {
        this.productionService.adminDeleteForm(form.id, false).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Formulario eliminado', detail: `El formulario "${form.name}" ha sido desactivado.` });
            this.loadForms();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar el formulario.' })
        });
      }
    });
  }

  confirmRestoreForm(form: any) {
    this.confirmationService.confirm({
      message: `El formulario "${form.name}" volverá a activarse y estará disponible para nuevas solicitudes y flujos de trabajo. ¿Deseas continuar?`,
      header: 'Confirmar restauración',
      icon: 'pi pi-refresh',
      accept: () => {
        this.productionService.adminUpdateForm(form.id, { isActive: true }).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Formulario restaurado', detail: `El formulario "${form.name}" ha sido reactivado.` });
            this.loadForms();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo activar el formulario.' })
        });
      }
    });
  }

  confirmPhysicalDeleteForm(form: any) {
    this.confirmationService.confirm({
      message: `¡CUIDADO! Esta acción eliminará FÍSICAMENTE el formulario "${form.name}" de la base de datos y BORRARÁ permanentemente todas las solicitudes creadas, respuestas y flujos asociados a este formulario de forma irreversible. ¿Deseas continuar?`,
      header: 'Confirmar eliminación definitiva',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.productionService.adminDeleteForm(form.id, true).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Formulario eliminado definitivamente', detail: `El formulario "${form.name}" ha sido eliminado físicamente.` });
            this.loadForms();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el formulario físicamente.' })
        });
      }
    });
  }

  openFieldsConfigurator(form: any) {
    this.editingFormForFields.set(form);
    this.formFields.set([]);
    this.showFieldsDialog.set(true);

    this.productionService.getDynamicFormFields(form.id, true).subscribe({
      next: (data) => {
        this.formFields.set(data.map(f => {
          let meta = f.metadata ? (typeof f.metadata === 'string' ? JSON.parse(f.metadata) : f.metadata) : {};
          if (meta.options && Array.isArray(meta.options)) {
            meta.options = meta.options
              .map((opt: any) => typeof opt === 'object' && opt !== null ? (opt.value ?? opt.label ?? '') : String(opt ?? ''))
              .map((s: string) => s.trim())
              .filter((s: string) => s && s !== 'null' && s !== '_null' && s !== 'undefined');
          }
          if (meta.dependency) {
            const op = meta.dependency.operator || 'eq';
            meta.dependency.operator = op;
            if (op === 'is_empty' || op === 'is_not_empty') {
              meta.dependency.value = '';
            } else if (['gt', 'gte', 'lt', 'lte'].includes(op)) {
              if (typeof meta.dependency.value === 'string') {
                meta.dependency.value = meta.dependency.value.trim();
              } else if (meta.dependency.value === null || meta.dependency.value === undefined) {
                meta.dependency.value = '';
              }
            } else {
              if (Array.isArray(meta.dependency.value)) {
                meta.dependency.value = meta.dependency.value
                  .map((v: any) => typeof v === 'object' && v !== null ? (v.value ?? v.label ?? '') : String(v ?? ''))
                  .map((s: string) => s.trim())
                  .filter((s: string) => s && s !== 'null' && s !== '_null' && s !== 'undefined');
                if (meta.dependency.value.length === 1) meta.dependency.value = meta.dependency.value[0];
                else if (meta.dependency.value.length === 0) meta.dependency.value = '';
              } else if (typeof meta.dependency.value === 'string') {
                const clean = meta.dependency.value
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter((s: string) => s && s !== 'null' && s !== '_null' && s !== 'undefined');
                meta.dependency.value = clean.length > 1 ? clean : (clean[0] || '');
              } else if (meta.dependency.value === null || meta.dependency.value === undefined) {
                meta.dependency.value = '';
              }
            }
          }
          return {
            id: f.id,
            name: f.name,
            label: f.label,
            description: f.description || '',
            type: f.type,
            placeholder: f.placeholder || '',
            isRequired: !!f.isRequired,
            isReadOnly: !!f.isReadOnly,
            isActive: f.isActive !== false,
            defaultValueExpression: f.defaultValueExpression || '',
            displayOrder: f.displayOrder,
            metadata: meta
          };
        }));
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los campos del formulario.' })
    });
  }

  addField() {
    const currentFields = this.formFields();
    this.formFields.set([
      ...currentFields,
      {
        name: `campo_${Date.now()}`,
        label: 'Nuevo Campo',
        description: '',
        type: 'text',
        placeholder: '',
        isRequired: false,
        isReadOnly: false,
        isActive: true,
        defaultValueExpression: '',
        displayOrder: currentFields.length + 1,
        metadata: {}
      }
    ]);
  }

  openFileConfigDialog(field: any) {
    if (!field.metadata) field.metadata = {};
    if (field.metadata.maxFileCount === undefined) field.metadata.maxFileCount = 1;
    if (field.metadata.allowedFormats === undefined) field.metadata.allowedFormats = '.pdf,.png,.jpg,.jpeg,.zip';
    if (field.metadata.maxFileSize === undefined) field.metadata.maxFileSize = 10;

    this.selectedFieldForFileConfig.set(field);
    this.showFileConfigDialog.set(true);
  }

  saveFileConfig() {
    this.showFileConfigDialog.set(false);
  }

  openSelectConfigDialog(field: any) {
    if (!field.metadata) field.metadata = {};
    if (!field.metadata.options) field.metadata.options = [];

    this.selectedFieldForSelectConfig.set(field);
    const optsObj = (field.metadata.options || [])
      .map((opt: any) => typeof opt === 'object' && opt !== null ? (opt.value ?? opt.label ?? '') : String(opt ?? ''))
      .map((s: string) => s.trim())
      .filter((s: string) => s && s !== 'null' && s !== '_null' && s !== 'undefined')
      .map((opt: string) => ({ value: opt }));
    this.tempSelectOptions.set(optsObj);
    this.showSelectConfigDialog.set(true);
  }

  addSelectOption() {
    const current = this.tempSelectOptions();
    this.tempSelectOptions.set([...current, { value: '' }]);
  }

  removeSelectOption(index: number) {
    const current = [...this.tempSelectOptions()];
    current.splice(index, 1);
    this.tempSelectOptions.set(current);
  }

  saveSelectConfig() {
    const field = this.selectedFieldForSelectConfig();
    if (field) {
      const opts = this.tempSelectOptions()
        .map(opt => (typeof opt.value === 'string' ? opt.value : String(opt.value || '')).trim())
        .filter(val => val.length > 0 && val !== 'null' && val !== '_null' && val !== 'undefined');
      field.metadata.options = opts;
    }
    this.showSelectConfigDialog.set(false);
  }

  openDynamicListConfigDialog(field: any) {
    if (!field.metadata) field.metadata = {};
    if (!field.metadata.options) field.metadata.options = [];
    if (!field.metadata.subFields) {
      field.metadata.subFields = [{ name: 'quantity', label: 'Cantidad', type: 'number' }];
    }

    this.selectedFieldForDynamicListConfig.set(field);
    const optsObj = field.metadata.options.map((opt: string) => ({ value: opt }));
    this.tempDynamicListOptions.set(optsObj);

    const subFieldsObj = field.metadata.subFields.map((sf: any) => ({
      name: sf.name || 'quantity',
      label: sf.label || 'Cantidad',
      type: sf.type || 'number'
    }));
    this.tempDynamicListSubFields.set(subFieldsObj);

    this.showDynamicListConfigDialog.set(true);
  }

  addDynamicListOption() {
    const current = this.tempDynamicListOptions();
    this.tempDynamicListOptions.set([...current, { value: '' }]);
  }

  removeDynamicListOption(index: number) {
    const current = [...this.tempDynamicListOptions()];
    current.splice(index, 1);
    this.tempDynamicListOptions.set(current);
  }

  addDynamicListSubField() {
    const current = this.tempDynamicListSubFields();
    this.tempDynamicListSubFields.set([...current, { name: `col_${Date.now()}`, label: 'Nueva Columna', type: 'number' }]);
  }

  removeDynamicListSubField(index: number) {
    const current = [...this.tempDynamicListSubFields()];
    current.splice(index, 1);
    this.tempDynamicListSubFields.set(current);
  }

  saveDynamicListConfig() {
    const field = this.selectedFieldForDynamicListConfig();
    if (field) {
      const opts = this.tempDynamicListOptions()
        .map(opt => opt.value.trim())
        .filter(val => val.length > 0);

      const subFields = this.tempDynamicListSubFields()
        .map(sf => ({
          name: sf.name.trim() || `col_${Date.now()}`,
          label: sf.label.trim() || 'Columna',
          type: sf.type || 'number'
        }));

      field.metadata = {
        ...field.metadata,
        options: opts,
        subFields: subFields.length > 0 ? subFields : [{ name: 'quantity', label: 'Cantidad', type: 'number' }]
      };
    }
    this.showDynamicListConfigDialog.set(false);
  }

  openFormulaConfigDialog(field: any) {
    if (!field.metadata) field.metadata = {};
    if (field.metadata.formula === undefined) field.metadata.formula = '';
    if (field.metadata.formulaRounding === undefined) field.metadata.formulaRounding = 2;

    this.selectedFieldForFormulaConfig.set(field);
    this.tempFormulaExpression.set(field.metadata.formula);
    this.tempFormulaRounding.set(field.metadata.formulaRounding);
    this.showFormulaConfigDialog.set(true);
  }

  getAvailableFormulaFields(): any[] {
    const current = this.selectedFieldForFormulaConfig();
    if (!current) return [];

    return this.formFields().filter(f => f.name !== current.name && f.isActive && (f.type === 'number' || f.type === 'decimal'));
  }

  insertFieldKeyToFormula(key: string) {
    const expr = this.tempFormulaExpression();
    this.tempFormulaExpression.set(expr ? expr + ' ' + key : key);
  }

  saveFormulaConfig() {
    const field = this.selectedFieldForFormulaConfig();
    if (field) {
      if (!field.metadata) field.metadata = {};
      field.metadata.formula = this.tempFormulaExpression().trim();
      field.metadata.formulaRounding = this.tempFormulaRounding();

      field.isReadOnly = true;
    }
    this.showFormulaConfigDialog.set(false);
  }

  openDependencyConfigDialog(field: any) {
    if (!field.metadata) field.metadata = {};
    if (typeof field.metadata === 'string') {
      try { field.metadata = JSON.parse(field.metadata); } catch(e){}
    }
    if (!field.metadata.dependency) {
      field.metadata.dependency = { fieldName: '', operator: 'eq', value: '' };
    }

    this.selectedFieldForDependencyConfig.set(field);
    this.tempDependencyFieldName.set(field.metadata.dependency.fieldName || '');

    let op = field.metadata.dependency.operator;
    const rawVal = field.metadata.dependency.value;

    if (!op) {
      if (typeof rawVal === 'string') {
        const trimmed = rawVal.trim();
        if (trimmed.startsWith('>=')) op = 'gte';
        else if (trimmed.startsWith('>')) op = 'gt';
        else if (trimmed.startsWith('<=')) op = 'lte';
        else if (trimmed.startsWith('<')) op = 'lt';
        else if (trimmed.startsWith('!=')) op = 'neq';
        else op = 'eq';
      } else {
        op = 'eq';
      }
    }
    this.tempDependencyOperator.set(op);

    const isNumericOp = ['gt', 'gte', 'lt', 'lte'].includes(op);

    if (isNumericOp) {
      const cleanVal = (rawVal !== undefined && rawVal !== null) ? String(rawVal).replace(/^[><=!]+/, '').trim() : '';
      this.tempDependencyValue.set(cleanVal);
      this.tempDependencySelectedOptions.set([]);
    } else {
      let arrVal: string[] = [];
      if (Array.isArray(rawVal)) {
        arrVal = rawVal
          .map((v: any) => typeof v === 'object' && v !== null ? (v.value ?? v.label ?? '') : String(v ?? ''))
          .map((v: string) => v.trim())
          .filter((v: string) => v && v !== 'null' && v !== '_null' && v !== 'undefined');
      } else if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
        arrVal = String(rawVal)
          .split(',')
          .map(s => s.trim())
          .filter(s => s && s !== 'null' && s !== '_null' && s !== 'undefined');
      }
      this.tempDependencySelectedOptions.set(arrVal);
      this.tempDependencyValue.set(arrVal.join(', '));
    }

    this.showDependencyConfigDialog.set(true);
  }

  getAvailableDependencyFields(): any[] {
    const current = this.selectedFieldForDependencyConfig();
    if (!current) return [];
    return this.formFields().filter(f => f.name !== current.name && f.isActive && f.type !== 'section_header');
  }

  getParentFieldOptions(): string[] {
    const parentName = this.tempDependencyFieldName();
    if (!parentName) return [];
    const parentField = this.formFields().find(f => f.name === parentName);
    if (!parentField) return [];

    let metadataObj = parentField.metadata;
    if (typeof metadataObj === 'string') {
      try { metadataObj = JSON.parse(metadataObj); } catch(e) {}
    }

    if (metadataObj && Array.isArray(metadataObj.options)) {
      return metadataObj.options
        .map((opt: any) => typeof opt === 'object' && opt !== null ? (opt.value ?? opt.label ?? '') : String(opt ?? ''))
        .map((opt: string) => opt.trim())
        .filter((opt: string) => opt && opt !== 'null' && opt !== '_null' && opt !== 'undefined');
    }
    return [];
  }

  saveDependencyConfig() {
    const field = this.selectedFieldForDependencyConfig();
    if (field) {
      if (!field.metadata) field.metadata = {};
      if (typeof field.metadata === 'string') {
        try { field.metadata = JSON.parse(field.metadata); } catch(e){}
      }

      const parentName = this.tempDependencyFieldName();
      if (!parentName) {
        delete field.metadata.dependency;
      } else {
        const op = this.tempDependencyOperator() || 'eq';
        let val: any = '';

        if (op === 'is_empty' || op === 'is_not_empty') {
          val = '';
        } else if (['gt', 'gte', 'lt', 'lte'].includes(op)) {
          val = this.tempDependencyValue().trim();
        } else {
          const parentField = this.formFields().find(f => f.name === parentName);
          let hasOptions = false;
          if (parentField) {
            let meta = parentField.metadata;
            if (typeof meta === 'string') {
              try { meta = JSON.parse(meta); } catch(e){}
            }
            if (meta && Array.isArray(meta.options)) {
              hasOptions = true;
            }
          }

          if (hasOptions && ['eq', 'neq', 'contains'].includes(op)) {
            const selected = this.tempDependencySelectedOptions()
              .map((s: string) => s.trim())
              .filter((s: string) => s && s !== 'null' && s !== '_null' && s !== 'undefined');
            val = selected.length === 1 ? selected[0] : (selected.length === 0 ? '' : selected);
          } else {
            const raw = this.tempDependencyValue().trim();
            const cleanList = raw.split(',').map(s => s.trim()).filter(s => s && s !== 'null' && s !== '_null' && s !== 'undefined');
            if (cleanList.length === 1) {
              val = cleanList[0];
            } else if (cleanList.length === 0) {
              val = '';
            } else {
              val = cleanList;
            }
          }
        }

        field.metadata.dependency = {
          fieldName: parentName,
          operator: op,
          value: val
        };
      }
    }
    this.showDependencyConfigDialog.set(false);
  }

  removeDependencyConfig() {
    const field = this.selectedFieldForDependencyConfig();
    if (field) {
      if (!field.metadata) field.metadata = {};
      if (typeof field.metadata === 'string') {
        try { field.metadata = JSON.parse(field.metadata); } catch(e){}
      }
      delete field.metadata.dependency;
    }
    this.showDependencyConfigDialog.set(false);
  }

  openNumberConfigDialog(field: any) {
    this.selectedFieldForNumberConfig.set(field);
    if (!field.metadata) field.metadata = {};
    if (typeof field.metadata === 'string') {
      try { field.metadata = JSON.parse(field.metadata); } catch(e){}
    }
    this.tempNumberFormat = field.metadata.numberFormat || 'none';
    this.showNumberConfigDialog.set(true);
  }

  saveNumberConfig() {
    const field = this.selectedFieldForNumberConfig();
    if (field) {
      if (!field.metadata) field.metadata = {};
      if (typeof field.metadata === 'string') {
        try { field.metadata = JSON.parse(field.metadata); } catch(e){}
      }
      field.metadata.numberFormat = this.tempNumberFormat;
      this.showNumberConfigDialog.set(false);
    }
  }

  confirmSoftDeleteField(field: FormFieldItem) {
    this.confirmationService.confirm({
      message: `El campo "${field.label}" se ocultará y no se solicitará ni mostrará al crear nuevas solicitudes, pero se conservarán sus respuestas en el histórico de solicitudes pasadas. ¿Deseas continuar?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      accept: () => {
        field.isActive = false;
        this.messageService.add({ severity: 'info', summary: 'Campo eliminado', detail: `El campo "${field.label}" ha sido ocultado.` });
      }
    });
  }

  confirmRestoreField(field: FormFieldItem) {
    this.confirmationService.confirm({
      message: `El campo "${field.label}" volverá a activarse y se solicitará de forma obligatoria o según esté configurado en todas las nuevas solicitudes de ahora en adelante. ¿Deseas continuar?`,
      header: 'Confirmar restauración',
      icon: 'pi pi-refresh',
      accept: () => {
        field.isActive = true;
        this.messageService.add({ severity: 'success', summary: 'Campo restaurado', detail: `El campo "${field.label}" ha sido reactivado.` });
      }
    });
  }

  confirmPhysicalDeleteField(index: number) {
    const field = this.formFields()[index];
    this.confirmationService.confirm({
      message: `¡CUIDADO! Esta acción eliminará FÍSICAMENTE el campo "${field.label}" de la base de datos y BORRARÁ permanentemente todos los datos históricos llenados para este campo en solicitudes anteriores de forma irreversible. ¿Deseas continuar?`,
      header: 'Confirmar eliminación definitiva',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.removeField(index);
        this.messageService.add({ severity: 'warn', summary: 'Campo eliminado definitivamente', detail: `El campo "${field.label}" ha sido eliminado de la lista.` });
      }
    });
  }

  removeField(index: number) {
    const currentFields = [...this.formFields()];
    currentFields.splice(index, 1);

    currentFields.forEach((f, i) => f.displayOrder = i + 1);
    this.formFields.set(currentFields);
  }

  moveFieldUp(index: number) {
    if (index <= 0) return;
    const fields = [...this.formFields()];
    const temp = fields[index];
    fields[index] = fields[index - 1];
    fields[index - 1] = temp;

    fields.forEach((f, idx) => {
      f.displayOrder = idx + 1;
    });

    this.formFields.set(fields);
  }

  moveFieldDown(index: number) {
    const fields = [...this.formFields()];
    if (index >= fields.length - 1) return;
    const temp = fields[index];
    fields[index] = fields[index + 1];
    fields[index + 1] = temp;

    fields.forEach((f, idx) => {
      f.displayOrder = idx + 1;
    });

    this.formFields.set(fields);
  }

  saveFields() {
    const form = this.editingFormForFields();
    const fields = this.formFields();

    for (const f of fields) {
      if (!f.label.trim()) {
        this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'Todos los campos deben tener una etiqueta válida.' });
        return;
      }
      if (!f.name.trim()) {
        f.name = f.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      }
    }

    this.productionService.adminSaveFields(form.id, fields).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Campos guardados y actualizados exitosamente.' });
        this.showFieldsDialog.set(false);
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron guardar los campos.' })
    });
  }

  loadWorkflows() {
    this.productionService.adminGetWorkflows().subscribe({
      next: (data) => {
        this.workflows.set(data);
        if (data.length > 0 && !this.selectedWorkflowId()) {
          this.selectedWorkflowId.set(data[0].id);
          this.loadWorkflowStages(data[0].id);
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los flujos de trabajo.' });
      }
    });
  }

  onWorkflowChange(event: any) {
    const workflowId = event.value;
    this.selectedWorkflowId.set(workflowId);
    if (!workflowId) {
      this.workflowStages.set([]);
      return;
    }
    this.loadWorkflowStages(workflowId);
  }

  openNewWorkflowDialog() {
    this.isNewWorkflow.set(true);
    this.selectedWorkflow.set({ id: null, name: '', description: '' });
    this.showWorkflowDialog.set(true);
  }

  openEditWorkflowDialog() {
    const wf = this.workflows().find(w => w.id === this.selectedWorkflowId());
    if (!wf) return;
    this.isNewWorkflow.set(false);
    this.selectedWorkflow.set({
      id: wf.id,
      name: wf.name,
      description: wf.description || ''
    });
    this.showWorkflowDialog.set(true);
  }

  saveWorkflowMetadata() {
    const data = this.selectedWorkflow();
    if (!data.name.trim()) {
      this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'El nombre del flujo es obligatorio.' });
      return;
    }
    if (this.isNewWorkflow()) {
      this.productionService.adminCreateWorkflow(data).subscribe({
        next: (created) => {
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Flujo de trabajo creado exitosamente.' });
          this.showWorkflowDialog.set(false);
          this.loadWorkflows();
          this.selectedWorkflowId.set(created.id);
          this.loadWorkflowStages(created.id);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el flujo de trabajo.' });
        }
      });
    } else {
      if (!data.id) return;
      this.productionService.adminUpdateWorkflow(data.id, data).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Flujo de trabajo actualizado.' });
          this.showWorkflowDialog.set(false);
          this.loadWorkflows();
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el flujo de trabajo.' });
        }
      });
    }
  }

  deleteCurrentWorkflow() {
    const wfId = this.selectedWorkflowId();
    if (!wfId) return;
    const wf = this.workflows().find(w => w.id === wfId);
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar el flujo "${wf?.name || ''}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.productionService.adminDeleteWorkflow(wfId).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Flujo de trabajo eliminado.' });
            this.selectedWorkflowId.set(null);
            this.workflowStages.set([]);
            this.loadWorkflows();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el flujo.' });
          }
        });
      }
    });
  }

  loadWorkflowStages(workflowId: number) {
    this.loadingStages.set(true);
    this.productionService.adminGetWorkflowStages(workflowId).subscribe({
      next: (data) => {
        const loadedStages: WorkflowStageItem[] = data.map(s => {
          let selectedUserIds: number[] = [];
          let customForms: Record<number, number | null> = {};
          let multiFormsConfig: MultiFormOptionConfig[] = [];
          let maxSelectedForms: number | null = null;
          if (s.assigneeUserIds) {
            try {
              const parsed = typeof s.assigneeUserIds === 'string'
                ? JSON.parse(s.assigneeUserIds)
                : s.assigneeUserIds;
              if (Array.isArray(parsed)) {
                if (parsed.length > 0 && (parsed[0].sourceFormId !== undefined || parsed[0].targetFormIdToFill !== undefined || parsed[0].targetSubflowFormId !== undefined || parsed[0].targetSubflowWorkflowId !== undefined)) {
                  multiFormsConfig = parsed.map((opt: any) => {
                    let targetType: 'subflow' | 'user' | 'team_random' | 'team_leader' = opt.targetType || (opt.targetSubflowWorkflowId || opt.targetSubflowFormId ? 'subflow' : (opt.assignedTeamId ? 'team_random' : 'user'));
                    return {
                      sourceFormId: opt.sourceFormId || null,
                      targetType: targetType,
                      targetSubflowFormId: opt.targetSubflowWorkflowId || opt.targetSubflowFormId || null,
                      assignedUserId: opt.assignedUserId || null,
                      assignedTeamId: opt.assignedTeamId || null,
                      targetFormIdToFill: opt.targetFormIdToFill || null
                    };
                  });
                } else {
                  parsed.forEach((item: any) => {
                    if (typeof item === 'object' && item !== null) {
                      selectedUserIds.push(item.userId);
                      customForms[item.userId] = item.formId || null;
                    } else {
                      selectedUserIds.push(item);
                      customForms[item] = null;
                    }
                  });
                }
              } else if (typeof parsed === 'object' && parsed !== null) {
                if (parsed.multiFormsConfig) {
                  multiFormsConfig = parsed.multiFormsConfig.map((opt: any) => {
                    let targetType: 'subflow' | 'user' | 'team_random' | 'team_leader' = opt.targetType || (opt.targetSubflowWorkflowId || opt.targetSubflowFormId ? 'subflow' : (opt.assignedTeamId ? 'team_random' : 'user'));
                    return {
                      sourceFormId: opt.sourceFormId || null,
                      targetType: targetType,
                      targetSubflowFormId: opt.targetSubflowWorkflowId || opt.targetSubflowFormId || null,
                      assignedUserId: opt.assignedUserId || null,
                      assignedTeamId: opt.assignedTeamId || null,
                      targetFormIdToFill: opt.targetFormIdToFill || null
                    };
                  });
                }
                if (parsed.maxSelectedForms !== undefined) {
                  maxSelectedForms = parsed.maxSelectedForms;
                }
                if (parsed.selectedUserIds) {
                  selectedUserIds = parsed.selectedUserIds;
                }
                if (parsed.customForms) {
                  customForms = parsed.customForms;
                }
              }
            } catch(e) {}
          }
          let assigneeTeamId = s.assigneeTeamId;
          if (!assigneeTeamId && s.assigneeSubteamId) {
            for (const team of this.teams()) {
              if (team.subteams && team.subteams.some((st: any) => st.id === s.assigneeSubteamId)) {
                assigneeTeamId = team.id;
                break;
              }
            }
          }
          let nextStageAssigneeOptions: NextStageAssigneeOptionConfig[] = [];
          if (s.nextStageAssigneeOptions) {
            try {
              nextStageAssigneeOptions = typeof s.nextStageAssigneeOptions === 'string'
                ? JSON.parse(s.nextStageAssigneeOptions)
                : s.nextStageAssigneeOptions;
              if (!Array.isArray(nextStageAssigneeOptions)) {
                nextStageAssigneeOptions = [];
              }
            } catch(e) {
              nextStageAssigneeOptions = [];
            }
          }

          return {
            id: s.id,
            name: s.name,
            description: s.description || '',
            stepOrder: s.stepOrder,
            assigneeType: s.assigneeType,
            assigneeUserId: s.assigneeUserId,
            assigneeTeamId: assigneeTeamId,
            assigneeSubteamId: s.assigneeSubteamId || null,
            formIdToFill: s.formIdToFill,
            rejectionTargetType: s.rejectionTargetType || 'previous_sender',
            rejectionTargetUserId: s.rejectionTargetUserId,
            rejectionTargetTeamId: s.rejectionTargetTeamId,
            requireCommentOnApprove: !!s.requireCommentOnApprove,
            excludeTeamLeader: !!s.excludeTeamLeader,
            selectedUserIds,
            customForms,
            multiFormsConfig,
            maxSelectedForms,
            allowChooseNextStageAssignee: !!s.allowChooseNextStageAssignee,
            nextStageAssigneeOptions
          };
        });
        this.refreshDynamicAssignees(loadedStages);
        this.workflowStages.set(loadedStages);
        this.loadingStages.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el flujo de trabajo.' });
        this.loadingStages.set(false);
      }
    });
  }

  getUserName(userId: number): string {
    const u = this.users().find(user => user.id === userId);
    return u ? u.name : `Usuario #${userId}`;
  }

  getTeamName(teamId: number | null | undefined): string {
    if (!teamId) return '';
    const team = this.teams().find(t => t.id === teamId);
    return team ? team.name : `Equipo #${teamId}`;
  }

  getSubteamName(teamId: number | null | undefined, subteamId: number | null | undefined): string {
    if (!subteamId) return '';
    const subteams = this.getSubteamsForTeam(teamId);
    const sub = subteams.find((st: any) => st.id === subteamId);
    return sub ? sub.name : `Subequipo #${subteamId}`;
  }

  getNextStageOptionPlaceholder(opt: NextStageAssigneeOptionConfig): string {
    if (opt.type === 'specific_user' && opt.userId) {
      return this.getUserName(opt.userId);
    }
    if (opt.type === 'team_random' && opt.teamId) {
      return `Al azar de ${this.getTeamName(opt.teamId)}`;
    }
    if (opt.type === 'team_leader' && opt.teamId) {
      return `Líder de ${this.getTeamName(opt.teamId)}`;
    }
    if (opt.type === 'team_workload' && opt.teamId) {
      return `Menor carga de ${this.getTeamName(opt.teamId)}`;
    }
    if (opt.type === 'subteam_random' && opt.subteamId) {
      return `Al azar de ${this.getSubteamName(opt.teamId, opt.subteamId)}`;
    }
    if (opt.type === 'requester') {
      return 'Creador de la Solicitud';
    }
    if (opt.type === 'requester_boss') {
      return 'Jefe del Solicitante';
    }
    return 'Ej: Asignar a Analista Senior';
  }

  addNextStageAssigneeOption(stage: WorkflowStageItem) {
    if (!stage.nextStageAssigneeOptions) {
      stage.nextStageAssigneeOptions = [];
    }
    const id = 'opt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    stage.nextStageAssigneeOptions.push({
      id,
      type: 'specific_user',
      userId: null,
      teamId: null,
      subteamId: null,
      label: ''
    });
  }

  removeNextStageAssigneeOption(stage: WorkflowStageItem, index: number) {
    if (stage.nextStageAssigneeOptions) {
      stage.nextStageAssigneeOptions.splice(index, 1);
    }
  }

  onNextStageOptionTypeChange(opt: NextStageAssigneeOptionConfig) {
    opt.userId = null;
    opt.teamId = null;
    opt.subteamId = null;
  }

  onNextStageOptionTeamChange(opt: NextStageAssigneeOptionConfig) {
    opt.subteamId = null;
  }

  getSubteamsForTeam(teamId: number | null | undefined): any[] {
    if (!teamId) return [];
    const team = this.teams().find(t => t.id === teamId);
    return team && team.subteams ? team.subteams.filter((st: any) => st.isActive !== false) : [];
  }

  onStageTeamChange(stage: WorkflowStageItem) {
    stage.assigneeSubteamId = null;
  }

  isStageAssigneeDynamic(index: number): boolean {
    if (index <= 0) return false;
    const stages = this.workflowStages();
    const prevStage = stages[index - 1];
    return !!(prevStage && prevStage.allowChooseNextStageAssignee);
  }

  getPrecedingStageName(index: number): string {
    if (index <= 0) return '';
    const stages = this.workflowStages();
    const prevStage = stages[index - 1];
    return prevStage ? (prevStage.name || `Etapa ${prevStage.stepOrder}`) : '';
  }

  onAllowChooseNextStageAssigneeChange(stage: WorkflowStageItem, index: number) {
    const stages = [...this.workflowStages()];
    if (stage.allowChooseNextStageAssignee) {
      if (!stage.nextStageAssigneeOptions || stage.nextStageAssigneeOptions.length === 0) {
        this.addNextStageAssigneeOption(stage);
      }
    }
    this.refreshDynamicAssignees(stages);
    this.workflowStages.set(stages);
  }

  refreshDynamicAssignees(stages: WorkflowStageItem[]) {
    if (stages.length > 0) {
      stages[stages.length - 1].allowChooseNextStageAssignee = false;
    }
    for (let idx = 0; idx < stages.length; idx++) {
      const isDynamic = idx > 0 && !!stages[idx - 1]?.allowChooseNextStageAssignee;
      if (isDynamic) {
        stages[idx].assigneeType = 'chosen_by_previous_stage';
        stages[idx].assigneeUserId = null;
        stages[idx].assigneeTeamId = null;
        stages[idx].assigneeSubteamId = null;
        stages[idx].selectedUserIds = [];
      } else if (stages[idx].assigneeType === 'chosen_by_previous_stage') {
        stages[idx].assigneeType = 'specific_user';
      }
    }
  }

  addStage() {
    const current = this.workflowStages();
    const newStage: WorkflowStageItem = {
      name: `Etapa ${current.length + 1}`,
      description: '',
      stepOrder: current.length + 1,
      assigneeType: 'specific_user',
      assigneeUserId: null,
      assigneeTeamId: null,
      assigneeSubteamId: null,
      formIdToFill: null,
      rejectionTargetType: 'previous_sender',
      rejectionTargetUserId: null,
      rejectionTargetTeamId: null,
      requireCommentOnApprove: true,
      excludeTeamLeader: false,
      selectedUserIds: [],
      customForms: {},
      multiFormsConfig: [],
      allowChooseNextStageAssignee: false,
      nextStageAssigneeOptions: []
    };
    const updated = [...current, newStage];
    this.refreshDynamicAssignees(updated);
    this.workflowStages.set(updated);
  }

  addMultiFormOption(stage: WorkflowStageItem) {
    if (!stage.multiFormsConfig) {
      stage.multiFormsConfig = [];
    }
    stage.multiFormsConfig.push({
      sourceFormId: null,
      targetType: 'subflow',
      targetSubflowFormId: null,
      assignedUserId: null,
      assignedTeamId: null,
      targetFormIdToFill: null
    });
  }

  removeMultiFormOption(stage: WorkflowStageItem, index: number) {
    if (stage.multiFormsConfig) {
      stage.multiFormsConfig.splice(index, 1);
    }
  }

  getMaxSelectionOptions(stage: any): Array<{ label: string; value: number | null }> {
    const count = (stage.multiFormsConfig || []).length;
    const options: Array<{ label: string; value: number | null }> = [
      { label: 'Sin límite (Todas las opciones)', value: null }
    ];
    for (let i = 1; i <= Math.max(count, 1); i++) {
      options.push({
        label: i === 1 ? 'Máximo 1 opción (Excluyente)' : `Máximo ${i} opciones`,
        value: i
      });
    }
    return options;
  }

  removeStage(index: number) {
    const current = [...this.workflowStages()];
    current.splice(index, 1);
    current.forEach((s, i) => s.stepOrder = i + 1);
    this.refreshDynamicAssignees(current);
    this.workflowStages.set(current);
  }

  moveStageUp(index: number) {
    if (index === 0) return;
    const current = [...this.workflowStages()];
    const temp = current[index];
    current[index] = current[index - 1];
    current[index - 1] = temp;

    current.forEach((s, i) => s.stepOrder = i + 1);
    this.refreshDynamicAssignees(current);
    this.workflowStages.set(current);
  }

  moveStageDown(index: number) {
    const current = [...this.workflowStages()];
    if (index === current.length - 1) return;
    const temp = current[index];
    current[index] = current[index + 1];
    current[index + 1] = temp;

    current.forEach((s, i) => s.stepOrder = i + 1);
    this.refreshDynamicAssignees(current);
    this.workflowStages.set(current);
  }

  saveWorkflow() {
    const workflowId = this.selectedWorkflowId();
    if (!workflowId) return;

    const stages = this.workflowStages();
    this.refreshDynamicAssignees(stages);

    for (let idx = 0; idx < stages.length; idx++) {
      const s = stages[idx];
      const isDynamic = this.isStageAssigneeDynamic(idx);

      if (!s.name.trim()) {
        this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'Todas las etapas deben tener un nombre.' });
        return;
      }
      if (!isDynamic) {
        if (s.assigneeType === 'specific_user' && !s.assigneeUserId) {
          this.messageService.add({ severity: 'error', summary: 'Validación', detail: `La etapa "${s.name}" requiere un aprobador específico.` });
          return;
        }
        if (s.assigneeType === 'multiple_users' && (!s.selectedUserIds || s.selectedUserIds.length === 0)) {
          this.messageService.add({ severity: 'error', summary: 'Validación', detail: `La etapa "${s.name}" requiere seleccionar al menos un aprobador en Usuarios Múltiples.` });
          return;
        }
        if ((s.assigneeType === 'team' || s.assigneeType === 'team_random' || s.assigneeType === 'team_workload' || s.assigneeType === 'team_leader') && !s.assigneeTeamId) {
          this.messageService.add({ severity: 'error', summary: 'Validación', detail: `La etapa "${s.name}" requiere asociar un equipo aprobador.` });
          return;
        }
        if (s.assigneeType === 'subteam_random') {
          if (!s.assigneeTeamId) {
            this.messageService.add({ severity: 'error', summary: 'Validación', detail: `La etapa "${s.name}" requiere asociar un equipo.` });
            return;
          }
          if (!s.assigneeSubteamId) {
            this.messageService.add({ severity: 'error', summary: 'Validación', detail: `La etapa "${s.name}" requiere asociar un subequipo.` });
            return;
          }
        }
        if (s.assigneeType === 'subflow' && !s.formIdToFill) {
          this.messageService.add({ severity: 'error', summary: 'Validación', detail: `La etapa "${s.name}" requiere seleccionar el flujo de trabajo a invocar.` });
          return;
        }
      }
      if (s.formIdToFill === -1) {
        if (!s.multiFormsConfig || s.multiFormsConfig.length === 0) {
          this.messageService.add({ severity: 'error', summary: 'Validación', detail: `La etapa "${s.name}" está configurada con múltiples formularios pero no tiene ninguna opción agregada.` });
          return;
        }
        for (let optIdx = 0; optIdx < s.multiFormsConfig.length; optIdx++) {
          const opt = s.multiFormsConfig[optIdx];
          if (!opt.sourceFormId) {
            this.messageService.add({ severity: 'error', summary: 'Validación', detail: `En la etapa "${s.name}", la opción #${optIdx + 1} de formularios múltiples debe tener seleccionado el formulario inicial.` });
            return;
          }
          if (opt.targetType === 'subflow' && !opt.targetSubflowFormId) {
            this.messageService.add({ severity: 'error', summary: 'Validación', detail: `En la etapa "${s.name}", la opción #${optIdx + 1} debe seleccionar el sub-flujo a disparar.` });
            return;
          }
          if (opt.targetType === 'user' && !opt.assignedUserId) {
            this.messageService.add({ severity: 'error', summary: 'Validación', detail: `En la etapa "${s.name}", la opción #${optIdx + 1} debe seleccionar el usuario destinatario.` });
            return;
          }
          if ((opt.targetType === 'team_random' || opt.targetType === 'team_leader') && !opt.assignedTeamId) {
            this.messageService.add({ severity: 'error', summary: 'Validación', detail: `En la etapa "${s.name}", la opción #${optIdx + 1} debe seleccionar el equipo destinatario.` });
            return;
          }
        }
      }
      if (s.rejectionTargetType === 'specific_user' && !s.rejectionTargetUserId) {
        this.messageService.add({ severity: 'error', summary: 'Validación', detail: `El rechazo de la etapa "${s.name}" requiere un usuario específico de retorno.` });
        return;
      }
      if (s.rejectionTargetType === 'team_random' && !s.rejectionTargetTeamId) {
        this.messageService.add({ severity: 'error', summary: 'Validación', detail: `El rechazo de la etapa "${s.name}" requiere un equipo de retorno.` });
        return;
      }
      if (s.allowChooseNextStageAssignee && idx < stages.length - 1) {
        if (!s.nextStageAssigneeOptions || s.nextStageAssigneeOptions.length === 0) {
          this.messageService.add({ severity: 'error', summary: 'Validación', detail: `La etapa "${s.name}" tiene habilitada la selección de destinatario pero no tiene opciones configuradas.` });
          return;
        }
        for (let optIdx = 0; optIdx < s.nextStageAssigneeOptions.length; optIdx++) {
          const opt = s.nextStageAssigneeOptions[optIdx];
          if (opt.type === 'specific_user' && !opt.userId) {
            this.messageService.add({ severity: 'error', summary: 'Validación', detail: `En la etapa "${s.name}", la opción #${optIdx + 1} de destinatario requiere un usuario específico.` });
            return;
          }
          if ((opt.type === 'team_random' || opt.type === 'team_leader' || opt.type === 'team_workload') && !opt.teamId) {
            this.messageService.add({ severity: 'error', summary: 'Validación', detail: `En la etapa "${s.name}", la opción #${optIdx + 1} de destinatario requiere un equipo.` });
            return;
          }
          if (opt.type === 'subteam_random') {
            if (!opt.teamId) {
              this.messageService.add({ severity: 'error', summary: 'Validación', detail: `En la etapa "${s.name}", la opción #${optIdx + 1} de destinatario requiere un equipo.` });
              return;
            }
            if (!opt.subteamId) {
              this.messageService.add({ severity: 'error', summary: 'Validación', detail: `En la etapa "${s.name}", la opción #${optIdx + 1} de destinatario requiere un subequipo.` });
              return;
            }
          }
        }
      }
    }

    const payload = stages.map((s, idx) => {
      const isDynamic = this.isStageAssigneeDynamic(idx);
      const isLastStage = (idx === stages.length - 1);
      let assigneeUserIdsObj: any = null;
      if (!isDynamic) {
        if (s.formIdToFill === -1) {
          assigneeUserIdsObj = {
            multiFormsConfig: s.multiFormsConfig || [],
            maxSelectedForms: s.maxSelectedForms || null
          };
        } else if (s.assigneeType === 'multiple_users' && s.selectedUserIds) {
          assigneeUserIdsObj = s.selectedUserIds.map((uid: number) => ({
            userId: uid,
            formId: s.customForms ? s.customForms[uid] || null : null
          }));
        }
      }
      return {
        id: s.id,
        name: s.name,
        description: s.description,
        stepOrder: s.stepOrder,
        assigneeType: isDynamic ? 'chosen_by_previous_stage' : s.assigneeType,
        assigneeUserId: isDynamic ? null : s.assigneeUserId,
        assigneeTeamId: isDynamic ? null : s.assigneeTeamId,
        assigneeSubteamId: isDynamic ? null : (s.assigneeType === 'subteam_random' ? (s.assigneeSubteamId || null) : null),
        formIdToFill: s.formIdToFill,
        rejectionTargetType: s.rejectionTargetType,
        rejectionTargetUserId: s.rejectionTargetUserId,
        rejectionTargetTeamId: s.rejectionTargetTeamId,
        requireCommentOnApprove: !!s.requireCommentOnApprove,
        excludeTeamLeader: isDynamic ? false : !!s.excludeTeamLeader,
        assigneeUserIds: assigneeUserIdsObj,
        allowChooseNextStageAssignee: !isLastStage && !!s.allowChooseNextStageAssignee,
        nextStageAssigneeOptions: !isLastStage && s.allowChooseNextStageAssignee && s.nextStageAssigneeOptions ? JSON.stringify(s.nextStageAssigneeOptions) : null
      };
    });

    this.productionService.adminSaveWorkflowStages(workflowId, payload as any).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Flujo de trabajo guardado exitosamente.' });
        this.loadWorkflowStages(workflowId);
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el flujo de trabajo.' })
    });
  }
}
