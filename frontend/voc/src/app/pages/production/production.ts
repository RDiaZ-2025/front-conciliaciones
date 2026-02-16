import { Component, inject, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip'; // Or TagModule
import { TagModule } from 'primeng/tag';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { ProductionService } from '../../services/production.service';
import { AuthService } from '../../services/auth.service';
import { ProductionRequest, WORKFLOW_STAGES } from './production.models';
import { ProductionDialogComponent } from './components/production-dialog/production-dialog';
import { ProductionDetailDialogComponent } from './components/production-detail-dialog/production-detail-dialog';
import { StageTransitionUploadDialogComponent } from './components/stage-transition-upload-dialog/stage-transition-upload-dialog.component';
import { AnsDialogComponent } from './components/ans-dialog/ans-dialog';
import { HistoryDialog } from './components/history-dialog/history-dialog';
import { AzureStorageService } from '../../services/azure-storage.service';
import { FilePreviewComponent } from '../../components/file-preview/file-preview';
import { UploadedFile } from './production.models';
import { InSellActionDialogComponent } from './components/in-sell-action-dialog/in-sell-action-dialog.component';
import { MaterialPreparationDialogComponent } from './components/material-preparation-dialog/material-preparation-dialog.component';

@Component({
  selector: 'app-production',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TagModule,
    MenuModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    BadgeModule,
    DialogModule,
    RippleModule,
    FilePreviewComponent,
    PageHeaderComponent,
    AnsDialogComponent
  ],
  providers: [DialogService, ConfirmationService, MessageService],
  templateUrl: './production.html',
  styleUrl: './production.scss'
})
export class ProductionComponent implements OnInit, OnDestroy {
  productionService = inject(ProductionService);
  dialogService = inject(DialogService);
  confirmationService = inject(ConfirmationService);
  messageService = inject(MessageService);
  azureService = inject(AzureStorageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  requests = signal<ProductionRequest[]>([]);
  loading = signal<boolean>(true);
  loading$ = toObservable(this.loading);

  // Preview state
  previewFile = signal<File | string | null>(null);
  previewVisible = signal<boolean>(false);
  isPreviewLoading = signal<boolean>(false);

  // SLA Rules state
  slaRulesVisible = signal<boolean>(false);

  // Historical View state
  showHistorical = signal<boolean>(false);

  workflowStages = WORKFLOW_STAGES;

  // Computed lists
  activeRequests = computed(() => this.requests().filter(r => r.stage !== 'completed'));
  historicalRequests = computed(() => this.requests().filter(r => r.stage === 'completed'));

  canViewHistory = computed(() => {
    const user = this.authService.currentUser();
    // Allow if user has 'production_management' permission (Area Head/Supervisor)
    // Or if user is an admin
    return user?.permissions?.some(p =>
      ['production_management', 'admin_panel'].includes(p.toLowerCase())
    ) ?? false;
  });

  ref: DynamicDialogRef | undefined | null;

  // SLA Monitoring
  now = signal<Date>(new Date());
  private intervalId: any;
  private alertedRequests = new Set<number>(); // Track alerted requests to avoid spam

  // Local Logic State
  campaignTypeSelectionVisible = signal<boolean>(false);
  currentRequestProcessing: ProductionRequest | null = null;

  ngOnInit() {
    this.loadRequests();

    // Handle deep linking
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'open' && params['requestName']) {
        this.handleDeepLink(params['requestName']);
      }
    });

    // Update time every minute
    this.intervalId = setInterval(() => {
      this.now.set(new Date());
      this.checkSLAAlerts();
    }, 60000);
  }

  handleDeepLink(requestName: string) {
    if (this.loading()) {
      this.loading$.pipe(
        filter(loading => !loading),
        take(1)
      ).subscribe(() => {
        this.findAndOpenRequest(requestName);
      });
    } else {
      this.findAndOpenRequest(requestName);
    }
  }

  findAndOpenRequest(name: string) {
    const request = this.requests().find(r => r.name === name);
    if (request) {
      this.openDialog(request);
      // Clear query params
      this.router.navigate([], {
        queryParams: { action: null, requestName: null },
        queryParamsHandling: 'merge'
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Solicitud no encontrada',
        detail: `No se encontró la solicitud "${name}".`
      });
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  loadRequests() {
    this.loading.set(true);
    this.productionService.getProductionRequests().subscribe({
      next: (data) => {
        // Map status.code or status string to stage property required by frontend logic
        const mappedData = data.map(req => ({
          ...req,
          stage: (typeof req.status === 'string' ? req.status : req.status?.code) || req.stage || 'request'
        }));
        this.requests.set(mappedData);
        this.loading.set(false);
        this.checkSLAAlerts(); // Check initially after loading
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load requests' });
        this.loading.set(false);
      }
    });
  }

  // ... (rest of the methods)

  getSLAStatus(deliveryDate?: string): 'success' | 'warn' | 'danger' {
    if (!deliveryDate) return 'success'; // No deadline, so technically "on time" or N/A

    const deadline = new Date(deliveryDate).getTime();
    const now = this.now().getTime();
    const diff = deadline - now;

    if (diff < 0) {
      return 'danger'; // Overdue
    } else if (diff < 24 * 60 * 60 * 1000) { // Less than 24 hours
      return 'warn'; // Approaching deadline
    } else {
      return 'success'; // On time
    }
  }

  getRemainingTime(deliveryDate?: string): string {
    if (!deliveryDate) return '';

    const deadline = new Date(deliveryDate).getTime();
    const now = this.now().getTime();
    let diff = deadline - now;
    const isOverdue = diff < 0;

    diff = Math.abs(diff);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let timeString = '';
    if (days > 0) timeString += `${days}d `;
    if (hours > 0) timeString += `${hours}h `;
    timeString += `${minutes}m`;

    return isOverdue ? `Vencido hace ${timeString}` : `${timeString} restantes`;
  }

  getTotalTime(request: ProductionRequest): string {
    if (!request.requestDate || !request.deliveryDate) return 'N/A';

    const start = new Date(request.requestDate).getTime();
    const end = new Date(request.deliveryDate).getTime();
    const diff = Math.abs(end - start);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    let result = '';
    if (days > 0) result += `${days}d `;
    result += `${hours}h`;

    return result;
  }

  checkSLAAlerts() {
    const now = this.now().getTime();
    const twoHours = 2 * 60 * 60 * 1000;

    this.requests().forEach(request => {
      if (!request.deliveryDate || request.stage === 'completed' || this.alertedRequests.has(request.id)) return;

      const deadline = new Date(request.deliveryDate).getTime();
      const diff = deadline - now;

      // Trigger alert if within 2 hours and not overdue yet (or just about to be)
      if (diff > 0 && diff <= twoHours) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Atención: SLA Próximo',
          detail: `La solicitud "${request.name}" vence en menos de 2 horas.`,
          life: 5000
        });
        this.alertedRequests.add(request.id);
      }
    });
  }


  authService = inject(AuthService);

  openDialog(request?: ProductionRequest, readonly: boolean = false) {
    this.ref = this.dialogService.open(ProductionDialogComponent, {
      header: request ? (readonly ? 'Detalles de Solicitud' : 'Editar Solicitud') : 'Nueva Solicitud',
      width: '70%',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true,
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw'
      },
      data: request ? { id: request.id, readonly } : {}
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: Partial<ProductionRequest>) => {
        if (result) {
          // Reload requests to ensure we have the latest data and correct status mapping
          this.loadRequests();
        }
      });
    }
  }

  openHistory(request: ProductionRequest) {
    this.ref = this.dialogService.open(HistoryDialog, {
      header: `Historial de Cambios - ${request.name}`,
      width: '70%',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true,
      data: { id: request.id }
    });
  }

  openDetailDialog(request: ProductionRequest) {
    this.ref = this.dialogService.open(ProductionDetailDialogComponent, {
      header: 'Detalle de Solicitud',
      width: '50vw',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true,
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw'
      },
      data: { request }
    });
  }

  openStageTransitionUploadDialog(request: ProductionRequest, targetStage: string) {
    this.ref = this.dialogService.open(StageTransitionUploadDialogComponent, {
      header: 'Carga de Documentos',
      width: '50vw',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true,
      data: { request }
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: any) => {
        if (result && result.success) {
          this.performMove(request, targetStage);
        }
      });
    }
  }

  createRequest(request: Partial<ProductionRequest>) {
    this.productionService.createProductionRequest(request).subscribe({
      next: (newRequest) => {
        this.requests.update(current => [...current, newRequest]);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Request created' });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create request' });
      }
    });
  }

  updateRequest(id: number, request: Partial<ProductionRequest>) {
    this.productionService.updateProductionRequest(id, request).subscribe({
      next: (updatedRequest) => {
        this.requests.update(current => current.map(r => r.id === id ? updatedRequest : r));
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Request updated' });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update request' });
      }
    });
  }

  deleteRequest(id: number) {
    this.confirmationService.confirm({
      message: '¿Está seguro de eliminar esta solicitud?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.productionService.deleteProductionRequest(id).subscribe({
          next: () => {
            this.requests.update(current => current.filter(r => r.id !== id));
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Request deleted' });
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete request' });
          }
        });
      }
    });
  }

  openMaterialPreparation(request: ProductionRequest) {
    this.ref = this.dialogService.open(MaterialPreparationDialogComponent, {
      header: 'Preparación de Materiales',
      width: '600px',
      contentStyle: { "overflow": "auto" },
      baseZIndex: 10000,
      data: { request }
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: any) => {
        if (result) {
          // Save material data first
          this.productionService.saveMaterialData(request.id, result).subscribe({
            next: () => {
              if (result.status === 'COMPLETED') {
                 this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Material data submitted' });
                 // Move request only if completed
                 this.performMove(request, 'gestion_operativa');
              } else {
                 this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Material data draft saved' });
                 this.loadRequests();
              }
            },
            error: (err) => {
              console.error('Error saving material data:', err);
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save material data' });
            }
          });
        }
      });
    }
  }

  moveRequest(request: ProductionRequest) {
    const currentStage = request.stage;
    let nextStageId = '';

    // Budget cleaning helper
    const getBudget = (req: ProductionRequest): number => {
      const budgetStr = String(req.campaignDetail?.budget || '0');
      const cleanBudget = budgetStr.replace(/[^0-9]/g, '');
      return parseFloat(cleanBudget);
    };

    switch (currentStage) {
      case 'request':
        // Skip quotation, go directly to in_sell or get_data based on budget
        const budget = getBudget(request);
        if (budget >= 50000000) {
          nextStageId = 'create_proposal';
        } else {
          nextStageId = 'in_sell';
        }
        break;

      case 'quotation':
        // Legacy path, just in case
        const budgetQ = getBudget(request);
        if (budgetQ >= 50000000) {
          nextStageId = 'create_proposal';
        } else {
          nextStageId = 'in_sell';
        }
        break;

      case 'create_proposal':
        this.openStageTransitionUploadDialog(request, 'get_data');
        return;

      case 'get_data': // formerly obtener_datos
        this.openStageTransitionUploadDialog(request, 'in_sell');
        return;


      case 'in_sell': // formerly venta
        this.ref = this.dialogService.open(InSellActionDialogComponent, {
          header: 'Confirmar Venta',
          width: '400px',
          contentStyle: { "overflow": "auto" },
          baseZIndex: 10000
        });

        if (this.ref) {
          this.ref.onClose.subscribe((result: any) => {
            if (result && result.action) {
              if (result.action === 'sold') {
                this.performMove(request, 'material_preparation');
              } else if (result.action === 'not_sold') {
                this.performMove(request, 'completed');
              }
              // 'cancel' or other results do nothing
            }
          });
        }
        return;

      case 'material_preparation':
        this.openMaterialPreparation(request);
        return;

      case 'val_materiales_mobile':
      case 'val_materiales_programatica':
      case 'val_materiales_red_plus':
        nextStageId = 'gestion_operativa';
        break;

      case 'gestion_operativa':
        nextStageId = 'cierre';
        break;

      case 'cierre':
        nextStageId = 'completed';
        break;

      case 'completed':
        return;

      default:
        // Fallback for any other stage
        const currentIndex = this.workflowStages.findIndex(s => s.id === request.stage);
        if (currentIndex !== -1 && currentIndex < this.workflowStages.length - 1) {
          nextStageId = String(this.workflowStages[currentIndex + 1].id);
        }
        break;
    }

    if (nextStageId) {
      this.performMove(request, nextStageId);
    }
  }

  selectCampaignType(stageId: string) {
    if (this.currentRequestProcessing) {
      this.performMove(this.currentRequestProcessing, stageId);
      this.campaignTypeSelectionVisible.set(false);
      this.currentRequestProcessing = null;
    }
  }

  performMove(request: ProductionRequest, nextStageId: string) {
    this.productionService.moveRequest(request.id, nextStageId).subscribe({
      next: (updatedRequest) => {
        const nextStageLabel = this.getStageLabel(nextStageId);
        this.requests.update(current => current.map(r => r.id === request.id ? updatedRequest : r));
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Moved to ${nextStageLabel}` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to move request' });
      }
    });
  }

  getStageLabel(stageId: string): string {
    return this.workflowStages.find(s => s.id === stageId)?.label || stageId;
  }

  // Method to get severity for Tag based on stage (optional but nice)
  getStageSeverity(stageId: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (stageId) {
      case 'completed': return 'success';
      case 'cierre': return 'success';
      case 'gestion_operativa': return 'contrast';
      case 'val_materiales_mobile':
      case 'val_materiales_programatica':
      case 'val_materiales_red_plus':
        return 'secondary';
      case 'material_preparation': return 'warn';
      case 'venta': return 'info';
      case 'obtener_datos': return 'danger';
      case 'create_proposal': return 'warn';
      case 'quotation': return 'warn';
      case 'request': return 'secondary';
      default: return 'info';
    }
  }

  async downloadFile(fileId: string, fileName: string) {
    try {
      await this.azureService.downloadSingleFile(fileId, fileName);
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'File downloaded' });
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to download file' });
    }
  }

  async openPreview(file: UploadedFile) {
    this.isPreviewLoading.set(true);
    try {
      const blob = await this.azureService.getBlobData(file.id);
      const fileObj = new File([blob], file.name, { type: blob.type });
      this.previewFile.set(fileObj);
      this.previewVisible.set(true);
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la vista previa del archivo' });
    } finally {
      this.isPreviewLoading.set(false);
    }
  }

  downloadPreviewFile() {
    const file = this.previewFile();
    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }
}
