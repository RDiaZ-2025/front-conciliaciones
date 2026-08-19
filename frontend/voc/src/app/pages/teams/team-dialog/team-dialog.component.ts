import { LucideIconComponent } from '../../../components/lucide-icon/lucide-icon.component';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { TeamService } from '../../../services/team.service';
import { UserService, User } from '../../../services/user.service';
import { ProductionService } from '../../../services/production.service';
import { Team } from '../../../models/common/team';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';

export interface ConditionItem {
  fieldKey: string;
  operator: string;
  value: any;
  selectedValues?: string[];
}

export interface FormFieldOption {
  label: string;
  fieldKey: string;
  formName: string;
  type: string;
  options?: { label: string; value: string }[];
}

@Component({
  selector: 'app-team-dialog',
  standalone: true,
  imports: [
    LucideIconComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    MultiSelectModule,
    TooltipModule
  ],
  templateUrl: './team-dialog.component.html',
  styleUrl: './team-dialog.component.scss'
})
export class TeamDialogComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private teamService = inject(TeamService);
  private userService = inject(UserService);
  private productionService = inject(ProductionService);
  private messageService = inject(MessageService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() team: Team | null = null;
  @Output() save = new EventEmitter<void>();

  form: FormGroup;
  saving = signal(false);
  users = signal<User[]>([]);
  availableFields = signal<FormFieldOption[]>([]);
  conditionsList = signal<ConditionItem[]>([]);

  operatorOptions = [
    { label: 'Contiene', value: 'contains' },
    { label: 'Es igual a (=)', value: 'eq' },
    { label: 'Es diferente de (≠)', value: 'neq' },
    { label: 'Mayor que (>)', value: 'gt' },
    { label: 'Mayor o igual que (≥)', value: 'gte' },
    { label: 'Menor que (<)', value: 'lt' },
    { label: 'Menor o igual que (≤)', value: 'lte' },
    { label: 'No está vacío', value: 'is_not_empty' },
    { label: 'Está vacío', value: 'is_empty' }
  ];

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      leaderId: [null]
    });
  }

  ngOnInit() {
    this.loadUsers();
    this.loadInitialFormFields();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && this.visible) {
      this.resetForm();
    }
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe({
      next: (list) => {
        this.users.set((list || []).filter((u: any) => u.status === 1 || u.status === undefined));
      },
      error: () => {}
    });
  }

  loadInitialFormFields() {
    this.productionService.getInitialForm().subscribe({
      next: (forms: any[]) => {
        const list = Array.isArray(forms) ? forms : (forms ? [forms] : []);
        if (list.length === 0) return;

        const observables = list.map(f => this.productionService.getDynamicFormFields(f.id));
        forkJoin(observables).subscribe({
          next: (allFieldsArray: any[][]) => {
            const options: FormFieldOption[] = [];
            list.forEach((form, idx) => {
              const fields = allFieldsArray[idx] || [];
              fields.forEach((field: any) => {
                if (field.type !== 'section_header') {
                  let parsedMeta = field.metadata;
                  if (typeof parsedMeta === 'string') {
                    try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
                  }
                  let fieldOpts: { label: string; value: string }[] = [];
                  if (parsedMeta && Array.isArray(parsedMeta.options)) {
                    fieldOpts = parsedMeta.options.map((opt: any) => {
                      if (typeof opt === 'object' && opt !== null) {
                        return {
                          label: String(opt.label || opt.value || opt.name || ''),
                          value: String(opt.value || opt.label || opt.name || '')
                        };
                      }
                      return { label: String(opt), value: String(opt) };
                    });
                  }
                  options.push({
                    label: `${form.name} ➔ ${field.label}`,
                    fieldKey: `${form.id}_${field.name}`,
                    formName: form.name,
                    type: field.type,
                    options: fieldOpts
                  });
                }
              });
            });
            this.availableFields.set(options);
          },
          error: () => {}
        });
      },
      error: () => {}
    });
  }

  getFieldByKey(fieldKey: string): FormFieldOption | undefined {
    return this.availableFields().find(f => f.fieldKey === fieldKey);
  }

  hasFieldOptions(fieldKey: string): boolean {
    const f = this.getFieldByKey(fieldKey);
    return !!(f && f.options && f.options.length > 0);
  }

  getFieldOptions(fieldKey: string): { label: string; value: string }[] {
    const f = this.getFieldByKey(fieldKey);
    return f?.options || [];
  }

  onFieldChange(cond: ConditionItem) {
    cond.selectedValues = [];
    cond.value = '';
  }

  onMultiValuesChange(cond: ConditionItem, values: string[]) {
    cond.selectedValues = values || [];
    cond.value = values && values.length === 1 ? values[0] : (values || []);
  }

  resetForm() {
    if (this.team) {
      this.form.patchValue({
        name: this.team.name,
        description: this.team.description,
        leaderId: this.team.leaderId || null
      });

      let conds: ConditionItem[] = [];
      if (this.team.metadata) {
        try {
          const meta = typeof this.team.metadata === 'string' ? JSON.parse(this.team.metadata) : this.team.metadata;
          if (meta.enableConditions && Array.isArray(meta.enableConditions)) {
            conds = meta.enableConditions.map((c: any) => {
              const val = c.value ?? '';
              let selectedVals: string[] = [];
              if (Array.isArray(val)) {
                selectedVals = val.map(String);
              } else if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
                try {
                  const parsed = JSON.parse(val);
                  selectedVals = Array.isArray(parsed) ? parsed.map(String) : [val];
                } catch(e) {
                  selectedVals = [val];
                }
              } else if (val !== '') {
                selectedVals = [String(val)];
              }
              return {
                fieldKey: c.fieldKey || (c.fieldKeys && c.fieldKeys[0]) || '',
                operator: c.operator || 'contains',
                value: val,
                selectedValues: selectedVals
              };
            });
          }
        } catch (e) {}
      }
      this.conditionsList.set(conds);
    } else {
      this.form.reset({
        name: '',
        description: '',
        leaderId: null
      });
      this.conditionsList.set([]);
    }
  }

  addCondition() {
    const firstKey = this.availableFields()[0]?.fieldKey || '';
    this.conditionsList.update(list => [
      ...list,
      { fieldKey: firstKey, operator: 'contains', value: '', selectedValues: [] }
    ]);
  }

  removeCondition(index: number) {
    this.conditionsList.update(list => list.filter((_, i) => i !== index));
  }

  onSubmit() {
    if (this.form.valid) {
      this.saving.set(true);
      const formData = { ...this.form.value };

      const validConds = this.conditionsList().filter(c => c.fieldKey);
      if (validConds.length > 0) {
        formData.metadata = JSON.stringify({
          enableConditions: validConds.map(c => {
            let finalVal = c.value;
            if (c.selectedValues && c.selectedValues.length > 0) {
              finalVal = c.selectedValues.length === 1 ? c.selectedValues[0] : c.selectedValues;
            }
            return {
              fieldKey: c.fieldKey,
              operator: c.operator,
              value: finalVal
            };
          })
        });
      } else {
        formData.metadata = null;
      }

      const request = this.team ?
        this.teamService.updateTeam(this.team.id, formData) :
        this.teamService.createTeam(formData);

      request.subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Equipo guardado' });
            this.save.emit();
            this.visibleChange.emit(false);
            this.saving.set(false);
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al guardar equipo' });
          this.saving.set(false);
        }
      });
    }
  }

  cancel() {
    this.visibleChange.emit(false);
  }
}
