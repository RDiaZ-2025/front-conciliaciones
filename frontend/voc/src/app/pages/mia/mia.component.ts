import { LucideIconComponent } from '../../components/lucide-icon/lucide-icon.component';
import { CoreDialogService } from '../../services/core-dialog.service';
import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { DynamicDialogRef, DialogService } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { ProductionService } from '../../services/production.service';
import { AuthService } from '../../services/auth.service';
import { ProductionRequest } from '../../models/common/production-request';
import { ProductionChatDialogComponent } from './production-chat-dialog/production-chat-dialog.component';
import { ProductionDetailDialogComponent } from './production-detail-dialog/production-detail-dialog.component';
import { AnsDialogComponent } from './ans-dialog/ans-dialog.component';
import { AzureStorageService } from '../../services/azure-storage.service';
import { FilePreviewComponent } from '../../components/file-preview/file-preview.component';
import { UploadedFile } from '../../models/common/uploaded-file';

@Component({
  selector: 'app-mia',
  standalone: true,
  imports: [
    LucideIconComponent,
    CommonModule,
    ButtonModule,
    ToastModule,
    TooltipModule,
    BadgeModule,
    DialogModule,
    RippleModule,
    FilePreviewComponent,
    ProductionChatDialogComponent,
    AnsDialogComponent
  ],
  providers: [DialogService, MessageService],
  templateUrl: './mia.component.html',
  styleUrl: './mia.component.scss'
})
export class MiaComponent implements OnInit, OnDestroy {
  productionService = inject(ProductionService);
  dialogService = inject(CoreDialogService);
  messageService = inject(MessageService);
  azureService = inject(AzureStorageService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  requests = signal<ProductionRequest[]>([]);
  loading = signal<boolean>(true);
  loading$ = toObservable(this.loading);

  previewFile = signal<File | string | null>(null);
  previewVisible = signal<boolean>(false);
  isPreviewLoading = signal<boolean>(false);

  slaRulesVisible = signal<boolean>(false);
  showHistorical = signal<boolean>(false);

  workflowStages: { id: string; label: string }[] = [];

  activeRequests = computed(() => this.requests().filter(r => r.stage !== 'completed'));
  historicalRequests = computed(() => this.requests().filter(r => r.stage === 'completed'));

  canViewHistory = computed(() => {
    const user = this.authService.currentUser();
    return user?.permissions?.some(p =>
      ['production_management', 'admin_panel'].includes(p.toLowerCase())
    ) ?? false;
  });

  canCreateRequest = computed(() => {
    const user = this.authService.currentUser();
    return user?.teamId === 6;
  });

  ref: DynamicDialogRef | undefined | null;

  now = signal<Date>(new Date());
  private intervalId: any;
  private alertedRequests = new Set<number>();

  ngOnInit() {
    this.loadRequests();
    this.loadWorkflowStages();

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'open' && params['requestName']) {
        this.handleDeepLink(params['requestName']);
      }
    });

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
      this.openDetailDialog(request);
      this.router.navigate([], {
        queryParams: { action: null, requestName: null },
        queryParamsHandling: 'merge'
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Solicitud no encontrada',
        detail: 'No se encontró la solicitud "' + name + '".'
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
        const mappedData = data.map(req => ({
          ...req,
          stage: (typeof req.status === 'string' ? req.status : req.status?.code) || req.stage || 'request'
        }));
        this.requests.set(mappedData);
        this.loading.set(false);
        this.checkSLAAlerts();
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

  getSLAStatus(deliveryDate?: string): 'success' | 'warn' | 'danger' {
    if (!deliveryDate) return 'success';

    const deadline = new Date(deliveryDate).getTime();
    const now = this.now().getTime();
    const diff = deadline - now;

    if (diff < 0) {
      return 'danger';
    } else if (diff < 24 * 60 * 60 * 1000) {
      return 'warn';
    } else {
      return 'success';
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
    if (days > 0) timeString += days + 'd ';
    if (hours > 0) timeString += hours + 'h ';
    timeString += minutes + 'm';

    return isOverdue ? 'Vencido hace ' + timeString : timeString + ' restantes';
  }

  getTotalTime(request: ProductionRequest): string {
    if (!request.requestDate || !request.deliveryDate) return 'N/A';

    const start = new Date(request.requestDate).getTime();
    const end = new Date(request.deliveryDate).getTime();
    const diff = Math.abs(end - start);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    let result = '';
    if (days > 0) result += days + 'd ';
    result += hours + 'h';

    return result;
  }

  checkSLAAlerts() {
    const now = this.now().getTime();
    const twoHours = 2 * 60 * 60 * 1000;

    this.requests().forEach(request => {
      if (!request.deliveryDate || request.stage === 'completed' || this.alertedRequests.has(request.id)) return;

      const deadline = new Date(request.deliveryDate).getTime();
      const diff = deadline - now;

      if (diff > 0 && diff <= twoHours) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Atención: SLA Próximo',
          detail: 'La solicitud "' + request.name + '" vence en menos de 2 horas.',
          life: 5000
        });
        this.alertedRequests.add(request.id);
      }
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

  getStageLabel(stageId: string): string {
    return this.workflowStages.find(s => s.id === stageId)?.label || stageId;
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
