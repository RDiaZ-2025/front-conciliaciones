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
import { LucideIconComponent } from '../../components/lucide-icon/lucide-icon.component';
import { ProductionService } from '../../services/production.service';
import { UserService, User } from '../../services/user.service';
import { TeamService } from '../../services/team.service';
import { AuthService } from '../../services/auth.service';

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
  isActive?: boolean;
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

  currentUser = computed(() => this.authService.currentUser());

  // States
  activeTab = signal<string>('forms');
  forms = signal<any[]>([]);
  entryForms = computed(() => this.forms().filter(f => f.isEntryForm));
  internalForms = computed(() => this.forms().filter(f => !f.isEntryForm));
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
    icon: 'tag',
    requireConsecutive: true
  });

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

  // Fields editor state
  showFieldsDialog = signal<boolean>(false);
  editingFormForFields = signal<any>(null);
  formFields = signal<FormFieldItem[]>([]);

  // File configuration editor state
  showFileConfigDialog = signal<boolean>(false);
  selectedFieldForFileConfig = signal<any>(null);

  // Select option configuration editor state
  showSelectConfigDialog = signal<boolean>(false);
  selectedFieldForSelectConfig = signal<any>(null);
  tempSelectOptions = signal<{ value: string }[]>([]);
  showExpressionsHelpDialog = signal<boolean>(false);

  // Formula editor state
  showFormulaConfigDialog = signal<boolean>(false);
  selectedFieldForFormulaConfig = signal<any>(null);
  tempFormulaExpression = signal<string>('');
  tempFormulaRounding = signal<number>(2);
  showFormulaHelpDialog = signal<boolean>(false);

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
    { label: 'Lista Desplegable / Listado', value: 'select' },
    { label: 'Archivo / Adjunto', value: 'file' },
    { label: 'Cálculo Matemático / Fórmula', value: 'formula' }
  ];

  // Assignee & Rejection Type options
  assigneeTypeOptions = [
    { label: 'Usuario Específico', value: 'specific_user' },
    { label: 'Creador de la Solicitud', value: 'requester' },
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
      isInitialForm: false,
      isActive: true,
      responsible: '',
      role: '',
      icon: 'tag',
      requireConsecutive: true,
      displayOrder: 0
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

  // --- Field Configurator ---
  openFieldsConfigurator(form: any) {
    this.editingFormForFields.set(form);
    this.formFields.set([]);
    this.showFieldsDialog.set(true);

    this.productionService.getDynamicFormFields(form.id, true).subscribe({
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
          isActive: f.isActive !== false,
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
    const optsObj = field.metadata.options.map((opt: string) => ({ value: opt }));
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
        .map(opt => opt.value.trim())
        .filter(val => val.length > 0);
      field.metadata.options = opts;
    }
    this.showSelectConfigDialog.set(false);
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
    // Return all active fields in the form that are number fields and are not the current field itself
    return this.formFields().filter(f => f.name !== current.name && f.isActive && f.type === 'number');
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
      // Ensure the field is read-only since it is a formula calculated field
      field.isReadOnly = true;
    }
    this.showFormulaConfigDialog.set(false);
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
