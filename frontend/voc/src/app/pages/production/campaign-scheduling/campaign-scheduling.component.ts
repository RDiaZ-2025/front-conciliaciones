import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../../components/shared/page-header/page-header';
import { TeamService } from '../../../services/team.service';
import { CampaignService, Campaign } from '../../../services/campaign.service';
import { Team } from '../production.models';

@Component({
  selector: 'app-campaign-scheduling',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    FloatLabelModule,
    SelectModule,
    TextareaModule,
    DatePickerModule,
    TableModule,
    ToastModule,
    MessageModule,
    TagModule,
    DialogModule,
    PageHeaderComponent
  ],
  providers: [MessageService],
  templateUrl: './campaign-scheduling.component.html',
  styleUrl: './campaign-scheduling.component.scss'
})
export class CampaignSchedulingComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private teamService = inject(TeamService);
  private campaignService = inject(CampaignService);

  campaignForm!: FormGroup;
  teams = signal<Team[]>([]);
  loading = signal<boolean>(false);
  
  // Time Window State
  currentTime = signal<Date>(new Date());
  currentSlot = computed(() => this.determineSlot(this.currentTime()));
  isLocked = computed(() => this.currentSlot().locked);
  
  private timeInterval: any;

  // Traceability Data
  traceabilityData = signal<any[]>([]);
  selectedCampaign = signal<Campaign | null>(null);
  detailsVisible = signal<boolean>(false);

  ngOnInit() {
    this.initForm();
    this.loadTeams();
    this.startTimeTicker();
    this.loadTraceability();

    // Initial check
    if (this.isLocked()) {
        this.campaignForm.disable();
    } else {
        this.campaignForm.enable();
        // Keep read-only fields disabled
        this.campaignForm.get('slot')?.disable();
    }
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private initForm() {
    this.campaignForm = this.fb.group({
      name: ['', [Validators.required]],
      area: [null, [Validators.required]],
      slot: [{ value: '', disabled: true }],
      copy: ['', [
        Validators.required, 
        Validators.maxLength(260), 
        this.noSpecialCharsValidator
      ]],
      url: ['', [Validators.required, this.urlValidator]],
      startDate: [null, [Validators.required]],
      endDate: [null, [Validators.required]],
      impacts: this.fb.array([])
    }, { validators: this.dateRangeValidator });

    // Update slot field when computed signal changes
    // (Though it's disabled, we want to show the value)
    this.campaignForm.patchValue({ slot: this.currentSlot().label });
    
    // Add initial impact row
    this.addImpactRow();
  }

  private startTimeTicker() {
    this.timeInterval = setInterval(() => {
      const now = new Date();
      this.currentTime.set(now);
      
      const slot = this.determineSlot(now);
      if (this.campaignForm.get('slot')?.value !== slot.label) {
        this.campaignForm.patchValue({ slot: slot.label });
      }

      if (slot.locked && this.campaignForm.enabled) {
        this.campaignForm.disable();
        this.messageService.add({ severity: 'warn', summary: 'Horario Cerrado', detail: 'La ventana de programación se ha cerrado.' });
      } else if (!slot.locked && this.campaignForm.disabled) {
        this.campaignForm.enable();
        this.campaignForm.get('slot')?.disable();
        this.messageService.add({ severity: 'success', summary: 'Horario Abierto', detail: 'La ventana de programación está activa.' });
      }
    }, 1000 * 60); // Check every minute
  }

  private determineSlot(date: Date): { label: string, locked: boolean, execution: string } {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const time = hours + minutes / 60;

    // Slot 1: 08:00 (8.0) - 12:00 (12.0)
    if (time >= 8 && time < 12) {
      return { label: 'Mañana (08:00 - 12:00)', locked: false, execution: 'Ejecución Tarde' };
    }
    
    // Slot 2: 14:00 (14.0) - 16:30 (16.5)
    if (time >= 14 && time < 16.5) {
      return { label: 'Tarde (14:00 - 16:30)', locked: false, execution: 'Ejecución Siguiente Mañana' };
    }

    return { label: 'Cerrado - Fuera de Horario', locked: true, execution: 'N/A' };
  }

  private loadTeams() {
    this.teamService.getTeams().subscribe({
      next: (response) => {
        if (response.success) {
          this.teams.set(response.data);
        }
      },
      error: (err) => console.error('Error loading teams', err)
    });
  }

  get impacts() {
    return this.campaignForm.get('impacts') as FormArray;
  }

  addImpactRow() {
    const impactGroup = this.fb.group({
      date: [null, Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]]
    });
    this.impacts.push(impactGroup);
  }

  removeImpactRow(index: number) {
    this.impacts.removeAt(index);
  }

  // Validators
  noSpecialCharsValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const regex = /^[a-zA-Z0-9\s.,-]*$/;
    const valid = regex.test(control.value);
    return valid ? null : { specialChars: true };
  }

  urlValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    try {
      new URL(control.value);
      return null;
    } catch {
      return { invalidUrl: true };
    }
  }

  dateRangeValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    
    if (start && end && new Date(end) < new Date(start)) {
      return { dateRange: true };
    }
    return null;
  }

  validateUrl() {
    const url = this.campaignForm.get('url')?.value;
    if (!url) return;
    
    if (this.campaignForm.get('url')?.valid) {
        window.open(url, '_blank');
        this.messageService.add({ severity: 'success', summary: 'URL Válida', detail: 'El enlace tiene un formato correcto.' });
    } else {
        this.messageService.add({ severity: 'error', summary: 'URL Inválida', detail: 'Por favor ingrese un enlace válido.' });
    }
  }

  onSubmit() {
    if (this.campaignForm.invalid) {
      this.campaignForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const formValue = this.campaignForm.getRawValue();

    const campaignData: Campaign = {
        name: formValue.name,
        teamId: formValue.area,
        slot: formValue.slot,
        copy: formValue.copy,
        url: formValue.url,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        impacts: formValue.impacts
    };

    this.campaignService.createCampaign(campaignData).subscribe({
        next: (response) => {
            if (response.success) {
                this.messageService.add({ severity: 'success', summary: 'Campaña Programada', detail: 'La campaña se ha programado correctamente.' });
                this.campaignForm.reset();
                this.initForm(); 
                this.loadTraceability();
            } else {
                 this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo programar la campaña.' });
            }
        },
        error: (err) => {
            console.error('Error creating campaign', err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al procesar la solicitud.' });
        },
        complete: () => this.loading.set(false)
    });
  }

  loadTraceability() {
    this.campaignService.getCampaigns().subscribe({
        next: (res) => {
            if (res.success) {
                const mapped = res.data.map(c => ({
                    date: c.createdAt,
                    user: c.creator?.name || 'Sistema',
                    details: `Campaña "${c.name}" creada`,
                    status: 'Programada',
                    data: c
                }));
                this.traceabilityData.set(mapped);
            }
        },
        error: (err) => console.error('Error loading history', err)
    });
  }

  viewDetails(campaign: Campaign) {
      this.selectedCampaign.set(campaign);
      this.detailsVisible.set(true);
  }
  
  getSlotBadgeSeverity(slotLabel: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined {
      if (slotLabel.includes('Mañana')) return 'info';
      if (slotLabel.includes('Tarde')) return 'warn';
      return 'danger';
  }
}
