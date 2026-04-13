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
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { ProductionService } from '../../services/production.service';
import { AuthService } from '../../services/auth.service';
import { ProductionRequest } from './production.models';
import { ProductionDialogComponent } from './components/production-dialog/production-dialog';
import { ProductionChatDialogComponent } from './components/production-chat-dialog/production-chat-dialog.component';
import { ProductionDetailDialogComponent } from './components/production-detail-dialog/production-detail-dialog';
import { StageTransitionUploadDialogComponent } from './components/stage-transition-upload-dialog/stage-transition-upload-dialog.component';
import { AnsDialogComponent } from './components/ans-dialog/ans-dialog';
import { HistoryDialog } from './components/history-dialog/history-dialog';
import { AzureStorageService } from '../../services/azure-storage.service';
import { FilePreviewComponent } from '../../components/file-preview/file-preview';
import { UploadedFile } from './production.models';
import { InSellActionDialogComponent } from './components/in-sell-action-dialog/in-sell-action-dialog.component';
import { UploadDialogComponent } from './components/upload-dialog/upload-dialog.component';
import { ConsecutiveDialogComponent } from './components/consecutive-dialog/consecutive-dialog.component';
import { AssignImplementationDialogComponent } from './components/assign-implementation-dialog/assign-implementation-dialog.component';
import { MaterialRegisterListDialogComponent } from './components/material-register-list-dialog/material-register-list-dialog.component';

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
    ProgressSpinnerModule,
    FilePreviewComponent,
    PageHeaderComponent,
    AnsDialogComponent,
    // Dynamic components do not strictly need to be in imports if opened via DialogService, 
    // but good practice if used in template or for standalone verification
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

  workflowStages: { id: string; label: string }[] = [];

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

  canCreateRequest = computed(() => {
    const user = this.authService.currentUser();
    return user?.teamId === 6;
  });

  ref: DynamicDialogRef | undefined | null;

  // SLA Monitoring
  now = signal<Date>(new Date());
  private intervalId: any;
  private alertedRequests = new Set<number>(); // Track alerted requests to avoid spam

  // Local Logic State
  campaignTypeSelectionVisible = signal<boolean>(false);
  isProcessingMove = signal<boolean>(false);
  currentRequestProcessing: ProductionRequest | null = null;

  ngOnInit() {
    this.loadRequests();
    this.loadWorkflowStages();

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

  loadWorkflowStages() {
    this.productionService.getWorkflowStages().subscribe({
      next: (stages) => {
        this.workflowStages = stages;
      },
      error: (error) => {
        console.error('Error loading workflow stages', error);
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
    if (!request) {
      // Open new Chat Dialog for new requests
      this.ref = this.dialogService.open(ProductionChatDialogComponent, {
        header: 'Nueva Solicitud (Asistente Inteligente)',
        showHeader: false,
        width: '90%',
        contentStyle: { padding: '0', overflow: 'hidden', height: '85vh', 'max-height': '90vh' },
        baseZIndex: 10000,
        maximizable: true,
        styleClass: 'chat-dialog',
        breakpoints: {
          '960px': '95vw',
          '640px': '100vw'
        },
        data: {}
      });
    } else {
      // Open traditional form dialog for editing/viewing
      this.ref = this.dialogService.open(ProductionDialogComponent, {
        header: readonly ? 'Detalles de Solicitud' : 'Editar Solicitud',
        width: '70%',
        contentStyle: { overflow: 'auto' },
        baseZIndex: 10000,
        maximizable: true,
        breakpoints: {
          '960px': '75vw',
          '640px': '90vw'
        },
        data: { id: request.id, readonly }
      });
    }

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

  openStageTransitionUploadDialog(request: ProductionRequest, nextStageId: string) {
    this.ref = this.dialogService.open(StageTransitionUploadDialogComponent, {
      header: 'Subir Archivos',
      width: '500px',
      contentStyle: { "overflow": "auto" },
      baseZIndex: 10000,
      data: { request, nextStageId }
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: any) => {
        if (result && result.success) {
          this.performMove(request, nextStageId);
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

  openUploadDialog(request: ProductionRequest) {
    this.ref = this.dialogService.open(UploadDialogComponent, {
      header: 'Carga de Documentos (Orden de Compra)',
      width: '70%',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true,
      data: { request }
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: any) => {
        if (result && result.success) {
          this.performMove(request, 'consecutive_generation');
        }
      });
    }
  }

  openConsecutiveDialog(request: ProductionRequest) {
    this.ref = this.dialogService.open(ConsecutiveDialogComponent, {
      header: 'Generar Consecutivo',
      width: '400px',
      contentStyle: { "overflow": "auto" },
      baseZIndex: 10000,
      data: { request }
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: any) => {
        if (result && result.consecutive) {
          this.performMove(request, 'closed_won', { consecutive: result.consecutive });
        }
      });
    }
  }

  openAssignImplementationDialog(request: ProductionRequest) {
    this.ref = this.dialogService.open(AssignImplementationDialogComponent, {
      header: 'Asignar Implementación',
      width: '400px',
      contentStyle: { "overflow": "auto" },
      baseZIndex: 10000,
      data: { request }
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: any) => {
        if (result) {
          this.performMove(request, 'implementation', {
            unitAssigned: result.unit,
            assignedUserId: result.assignedUser
          });
        }
      });
    }
  }

  openMaterialRegisterListDialog(request: ProductionRequest) {
    this.ref = this.dialogService.open(MaterialRegisterListDialogComponent, {
      header: 'Gestión de Materiales',
      width: '800px',
      contentStyle: { "overflow": "auto" },
      baseZIndex: 10000,
      data: { request }
    });

    if (this.ref) {
      this.ref.onClose.subscribe(() => {
        this.loadRequests();
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
        if (budget < 50000000) {
          nextStageId = 'get_data';
        } else {
          nextStageId = 'create_proposal';
        }
        break;

      case 'quotation':
        // Legacy path, just in case
        const budgetQ = getBudget(request);
        if (budgetQ < 50000000) {
          nextStageId = 'get_data';
        } else {
          nextStageId = 'create_proposal';
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
                this.openUploadDialog(request);
              } else if (result.action === 'not_sold') {
                this.performMove(request, 'completed');
              }
              // 'cancel' or other results do nothing
            }
          });
        }
        return;

      case 'closed_won':
        this.confirmationService.confirm({
          message: '¿Estás seguro de continuar a la etapa de Implementación?',
          header: 'Confirmación',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sí, continuar',
          rejectLabel: 'Cancelar',
          accept: () => {
            this.openAssignImplementationDialog(request);
          }
        });
        return;

      case 'consecutive_generation':
        this.openConsecutiveDialog(request);
        return;

      case 'material_preparation':
        // Left here for backward compatibility if any request is currently in this stage
        this.openAssignImplementationDialog(request);
        return;

      case 'implementation':
        this.openStageTransitionUploadDialog(request, 'customer_review');
        return;

      case 'customer_review':
        this.confirmationService.confirm({
          message: '¿Estás seguro de finalizar la solicitud y marcarla como completada?',
          header: 'Confirmación de Cierre',
          icon: 'pi pi-check-circle',
          acceptLabel: 'Sí, finalizar',
          rejectLabel: 'Cancelar',
          accept: () => {
            this.performMove(request, 'completed');
          }
        });
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

  performMove(request: ProductionRequest, nextStageId: string, data?: any) {
    this.isProcessingMove.set(true);
    this.productionService.moveRequest(request.id, nextStageId, data).subscribe({
      next: (updatedRequest) => {
        this.isProcessingMove.set(false);
        const stage = (typeof updatedRequest.status === 'string' ? updatedRequest.status : (updatedRequest.status as any)?.code) || updatedRequest.stage || 'request';
        const mappedRequest = { ...updatedRequest, stage };

        const nextStageLabel = this.getStageLabel(nextStageId);
        this.requests.update(current => current.map(r => r.id === request.id ? mappedRequest : r));
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Moved to ${nextStageLabel}` });
      },
      error: () => {
        this.isProcessingMove.set(false);
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
      case 'customer_review': return 'info';
      case 'gestion_operativa': return 'contrast';
      case 'val_materiales_mobile':
      case 'val_materiales_programatica':
      case 'val_materiales_red_plus':
        return 'secondary';
      case 'implementation': return 'warn';
      case 'material_preparation': return 'warn';
      case 'consecutive_generation': return 'info';
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
