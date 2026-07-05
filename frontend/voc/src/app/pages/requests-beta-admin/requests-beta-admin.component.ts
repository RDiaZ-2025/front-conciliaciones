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
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { ProductionService } from '../../services/production.service';
import { UserService, User } from '../../services/user.service';
import { TeamService } from '../../services/team.service';

interface FormFieldItem {
  id?: number;
  name: string;
  label: string;
  description: string;
  type: string;
  placeholder: string;
  isRequired: boolean;
  isReadOnly: boolean;
  defaultValueExpression: string;
  displayOrder: number;
  metadata?: any;
}

interface WorkflowStageItem {
  id?: number;
  name: string;
  description: string;
  stepOrder: number;
  assigneeType: string; // 'specific_user', 'team', 'requester_boss'
  assigneeUserId: number | null;
  assigneeTeamId: number | null;
  formIdToFill: number | null;
  rejectionTargetType: string; // 'previous_sender', 'specific_user', 'team_random'
  rejectionTargetUserId: number | null;
  rejectionTargetTeamId: number | null;
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
    CheckboxModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    BadgeModule,
    TooltipModule,
    PageHeaderComponent
  ],
  templateUrl: './requests-beta-admin.component.html',
  styleUrls: ['./requests-beta-admin.component.css'],
  providers: [MessageService, ConfirmationService]
})
export class RequestsBetaAdminComponent implements OnInit {
  private productionService = inject(ProductionService);
  private userService = inject(UserService);
  private teamService = inject(TeamService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // States
  activeTab = signal<string>('forms');
  forms = signal<any[]>([]);
  entryForms = computed(() => this.forms().filter(f => f.isEntryForm));
  loadingForms = signal<boolean>(false);
  
  // Users & Teams
  users = signal<User[]>([]);
  teams = signal<any[]>([]);

  // Dialog states for Form metadata
  showFormDialog = signal<boolean>(false);
  isNewForm = signal<boolean>(false);
  selectedForm = signal<any>({
    id: null,
    name: '',
    description: '',
    isEntryForm: true,
    isActive: true,
    responsible: '',
    role: '',
    icon: 'pi pi-tag text-secondary',
    requireConsecutive: true
  });

  iconOptions = [
    { label: 'Documento / Editar (Naranja)', value: 'pi pi-file-edit text-orange-500', icon: 'pi pi-file-edit text-orange-500' },
    { label: 'Base de Datos (Azul)', value: 'pi pi-database text-blue-500', icon: 'pi pi-database text-blue-500' },
    { label: 'Idea / Foco (Amarillo)', value: 'pi pi-lightbulb text-yellow-500', icon: 'pi pi-lightbulb text-yellow-500' },
    { label: 'Cohete / Lanzamiento (Rojo)', value: 'pi pi-rocket text-red-500', icon: 'pi pi-rocket text-red-500' },
    { label: 'Gráfico / Tráfico (Verde)', value: 'pi pi-chart-line text-green-500', icon: 'pi pi-chart-line text-green-500' },
    { label: 'Etiqueta (Gris)', value: 'pi pi-tag text-secondary', icon: 'pi pi-tag text-secondary' },
    { label: 'Engranaje (Cian)', value: 'pi pi-cog text-cyan-500', icon: 'pi pi-cog text-cyan-500' },
    { label: 'Usuarios (Púrpura)', value: 'pi pi-users text-purple-500', icon: 'pi pi-users text-purple-500' },
    { label: 'Correo (Índigo)', value: 'pi pi-envelope text-indigo-500', icon: 'pi pi-envelope text-indigo-500' },
    { label: 'Imagen (Rosado)', value: 'pi pi-image text-pink-500', icon: 'pi pi-image text-pink-500' },
    { label: 'Carpeta (Marrón)', value: 'pi pi-folder text-yellow-600', icon: 'pi pi-folder text-yellow-600' }
  ];

  // Fields editor state
  showFieldsDialog = signal<boolean>(false);
  editingFormForFields = signal<any>(null);
  formFields = signal<FormFieldItem[]>([]);

  // File configuration editor state
  showFileConfigDialog = signal<boolean>(false);
  selectedFieldForFileConfig = signal<any>(null);

  // Workflow editor state
  selectedWorkflowFormId = signal<number | null>(null);
  workflowStages = signal<WorkflowStageItem[]>([]);
  loadingStages = signal<boolean>(false);

  // Field type options
  fieldTypeOptions = [
    { label: 'Texto Corto', value: 'text' },
    { label: 'Párrafo / Textarea', value: 'textarea' },
    { label: 'Número', value: 'number' },
    { label: 'Fecha Simple', value: 'date' },
    { label: 'Fecha y Hora (24h)', value: 'datetime' },
    { label: 'Archivo / Adjunto', value: 'file' }
  ];

  // Assignee & Rejection Type options
  assigneeTypeOptions = [
    { label: 'Usuario Específico', value: 'specific_user' },
    { label: 'Jefe Directo del Solicitante', value: 'requester_boss' },
    { label: 'Equipo / Rol', value: 'team' }
  ];

  rejectionTypeOptions = [
    { label: 'Anterior Remitente', value: 'previous_sender' },
    { label: 'Usuario Específico', value: 'specific_user' },
    { label: 'Integrante al Azar del Equipo', value: 'team_random' }
  ];

  ngOnInit() {
    this.loadForms();
    this.loadUsersAndTeams();
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

  openCreateFormDialog() {
    this.isNewForm.set(true);
    this.selectedForm.set({
      id: null,
      name: '',
      description: '',
      isEntryForm: true,
      isActive: true,
      responsible: '',
      role: '',
      icon: 'pi pi-tag text-secondary',
      requireConsecutive: true
    });
    this.showFormDialog.set(true);
  }

  openEditFormDialog(form: any) {
    this.isNewForm.set(false);
    this.selectedForm.set({ ...form });
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
    const data = this.selectedForm();
    if (!data.name || !data.name.trim()) {
      this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'El nombre es obligatorio.' });
      return;
    }

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

  deleteForm(form: any) {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea desactivar el formulario "${form.name}"?`,
      header: 'Confirmación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Desactivar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.productionService.adminDeleteForm(form.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Formulario desactivado.' });
            this.loadForms();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar el formulario.' })
        });
      }
    });
  }

  // --- Field Configurator ---
  openFieldsConfigurator(form: any) {
    this.editingFormForFields.set(form);
    this.formFields.set([]);
    this.showFieldsDialog.set(true);

    this.productionService.getDynamicFormFields(form.id).subscribe({
      next: (data) => {
        this.formFields.set(data.map(f => ({
          id: f.id,
          name: f.name,
          label: f.label,
          description: f.description || '',
          type: f.type,
          placeholder: f.placeholder || '',
          isRequired: !!f.isRequired,
          isReadOnly: !!f.isReadOnly,
          defaultValueExpression: f.defaultValueExpression || '',
          displayOrder: f.displayOrder,
          metadata: f.metadata ? (typeof f.metadata === 'string' ? JSON.parse(f.metadata) : f.metadata) : {}
        })));
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

  removeField(index: number) {
    const currentFields = [...this.formFields()];
    currentFields.splice(index, 1);
    // Re-adjust display orders
    currentFields.forEach((f, i) => f.displayOrder = i + 1);
    this.formFields.set(currentFields);
  }

  saveFields() {
    const form = this.editingFormForFields();
    const fields = this.formFields();

    // Basic check
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

  // --- Workflow Configurator ---
  onWorkflowFormChange(event: any) {
    const formId = event.value;
    if (!formId) {
      this.workflowStages.set([]);
      return;
    }
    this.loadWorkflowStages(formId);
  }

  loadWorkflowStages(formId: number) {
    this.loadingStages.set(true);
    this.productionService.adminGetStages(formId).subscribe({
      next: (data) => {
        this.workflowStages.set(data.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description || '',
          stepOrder: s.stepOrder,
          assigneeType: s.assigneeType,
          assigneeUserId: s.assigneeUserId,
          assigneeTeamId: s.assigneeTeamId,
          formIdToFill: s.formIdToFill,
          rejectionTargetType: s.rejectionTargetType || 'previous_sender',
          rejectionTargetUserId: s.rejectionTargetUserId,
          rejectionTargetTeamId: s.rejectionTargetTeamId
        })));
        this.loadingStages.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el flujo de trabajo.' });
        this.loadingStages.set(false);
      }
    });
  }

  addStage() {
    const current = this.workflowStages();
    this.workflowStages.set([
      ...current,
      {
        name: `Etapa ${current.length + 1}`,
        description: '',
        stepOrder: current.length + 1,
        assigneeType: 'specific_user',
        assigneeUserId: null,
        assigneeTeamId: null,
        formIdToFill: null,
        rejectionTargetType: 'previous_sender',
        rejectionTargetUserId: null,
        rejectionTargetTeamId: null
      }
    ]);
  }

  removeStage(index: number) {
    const current = [...this.workflowStages()];
    current.splice(index, 1);
    current.forEach((s, i) => s.stepOrder = i + 1);
    this.workflowStages.set(current);
  }

  moveStageUp(index: number) {
    if (index === 0) return;
    const current = [...this.workflowStages()];
    const temp = current[index];
    current[index] = current[index - 1];
    current[index - 1] = temp;
    // Update orders
    current.forEach((s, i) => s.stepOrder = i + 1);
    this.workflowStages.set(current);
  }

  moveStageDown(index: number) {
    const current = [...this.workflowStages()];
    if (index === current.length - 1) return;
    const temp = current[index];
    current[index] = current[index + 1];
    current[index + 1] = temp;
    // Update orders
    current.forEach((s, i) => s.stepOrder = i + 1);
    this.workflowStages.set(current);
  }

  saveWorkflow() {
    const formId = this.selectedWorkflowFormId();
    if (!formId) return;

    const stages = this.workflowStages();

    // Basic check: verify assignees are set where needed
    for (const s of stages) {
      if (!s.name.trim()) {
        this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'Todas las etapas deben tener un nombre.' });
        return;
      }
      if (s.assigneeType === 'specific_user' && !s.assigneeUserId) {
        this.messageService.add({ severity: 'error', summary: 'Validación', detail: `La etapa "${s.name}" requiere un aprobador específico.` });
        return;
      }
      if (s.assigneeType === 'team' && !s.assigneeTeamId) {
        this.messageService.add({ severity: 'error', summary: 'Validación', detail: `La etapa "${s.name}" requiere asociar un equipo aprobador.` });
        return;
      }
      if (s.rejectionTargetType === 'specific_user' && !s.rejectionTargetUserId) {
        this.messageService.add({ severity: 'error', summary: 'Validación', detail: `El rechazo de la etapa "${s.name}" requiere un usuario específico de retorno.` });
        return;
      }
      if (s.rejectionTargetType === 'team_random' && !s.rejectionTargetTeamId) {
        this.messageService.add({ severity: 'error', summary: 'Validación', detail: `El rechazo de la etapa "${s.name}" requiere un equipo de retorno.` });
        return;
      }
    }

    this.productionService.adminSaveStages(formId, stages).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Flujo de trabajo guardado exitosamente.' });
        this.loadWorkflowStages(formId);
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el flujo de trabajo.' })
    });
  }
}
