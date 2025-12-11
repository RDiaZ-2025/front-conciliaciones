import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip'; // Or TagModule
import { TagModule } from 'primeng/tag';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SessionInfoComponent } from '../../components/shared/session-info/session-info';
import { ProductionService } from '../../services/production';
import { ProductionRequest, WORKFLOW_STAGES } from './production.models';
import { ProductionDialogComponent } from './components/production-dialog/production-dialog';
import { AzureStorageService } from '../../services/azure-storage';
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
    FilePreviewComponent,
    PageHeaderComponent,
    SessionInfoComponent
  ],
  providers: [DialogService, ConfirmationService, MessageService],
  templateUrl: './production.html',
  styleUrl: './production.scss'
})
export class ProductionComponent implements OnInit {
  productionService = inject(ProductionService);
  dialogService = inject(DialogService);
  confirmationService = inject(ConfirmationService);
  messageService = inject(MessageService);
  azureService = inject(AzureStorageService);

  requests = signal<ProductionRequest[]>([]);
  loading = signal<boolean>(true);

  // Preview state
  previewFile = signal<File | string | null>(null);
  previewVisible = signal<boolean>(false);
  isPreviewLoading = signal<boolean>(false);

  workflowStages = WORKFLOW_STAGES;

  ref: DynamicDialogRef | undefined | null;

  ngOnInit() {
    this.loadRequests();
  }

  loadRequests() {
    this.loading.set(true);
    this.productionService.getProductionRequests().subscribe({
      next: (data) => {
        this.requests.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load requests' });
        this.loading.set(false);
      }
    });
  }

  openDialog(request?: ProductionRequest) {
    this.ref = this.dialogService.open(ProductionDialogComponent, {
      header: request ? 'Editar Solicitud' : 'Nueva Solicitud',
      width: '70%',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      maximizable: true,
      data: request ? { ...request } : {}
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: Partial<ProductionRequest>) => {
        if (result) {
          if (result.id && this.requests().find(r => r.id === result.id)) {
            this.updateRequest(result.id, result);
          } else {
            this.createRequest(result);
          }
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
