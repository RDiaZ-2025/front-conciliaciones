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
import { ProductionRequest, WORKFLOW_STAGES } from './production.models';
import { ProductionDialogComponent } from './components/production-dialog/production-dialog';
import { ProductionDetailDialogComponent } from './components/production-detail-dialog/production-detail-dialog';
import { AnsDialogComponent } from './components/ans-dialog/ans-dialog';
import { HistoryDialog } from './components/history-dialog/history-dialog';
import { AzureStorageService } from '../../services/azure-storage.service';
import { FilePreviewComponent } from '../../components/file-preview/file-preview';
import { UploadedFile } from './production.models';

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

  ref: DynamicDialogRef | undefined | null;

  // SLA Monitoring
  now = signal<Date>(new Date());
  private intervalId: any;
  private alertedRequests = new Set<string>(); // Track alerted requests to avoid spam

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
        this.requests.set(data);
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


  openDialog(request?: ProductionRequest) {
    this.ref = this.dialogService.open(ProductionDialogComponent, {
      header: request ? 'Editar Solicitud' : 'Nueva Solicitud',
      width: '90%',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true,
      data: request ? { id: request.id } : {}
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: Partial<ProductionRequest>) => {
        if (result) {
          // If we have an ID, update the existing request in the list
          if (result.id && this.requests().some(r => r.id === result.id)) {
            this.requests.update(current => current.map(r => r.id === result.id ? (result as ProductionRequest) : r));
          } else {
            // Otherwise add as new
            this.requests.update(current => [...current, (result as ProductionRequest)]);
          }
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

  updateRequest(id: string, request: Partial<ProductionRequest>) {
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

  deleteRequest(id: string) {
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

  moveRequest(request: ProductionRequest) {
    const currentIndex = this.workflowStages.findIndex(s => s.id === request.stage);
    if (currentIndex < this.workflowStages.length - 1) {
      const nextStage = this.workflowStages[currentIndex + 1];
      this.productionService.moveRequest(request.id, nextStage.id).subscribe({
        next: () => {
          this.requests.update(current => current.map(r => r.id === request.id ? { ...r, stage: nextStage.id } : r));
          this.messageService.add({ severity: 'success', summary: 'Success', detail: `Moved to ${nextStage.label}` });
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to move request' });
        }
      });
    }
  }

  getStageLabel(stageId: string): string {
    return this.workflowStages.find(s => s.id === stageId)?.label || stageId;
  }

  // Method to get severity for Tag based on stage (optional but nice)
  getStageSeverity(stageId: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (stageId) {
      case 'completed': return 'success';
      case 'in_production': return 'info';
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
