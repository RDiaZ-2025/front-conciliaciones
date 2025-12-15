import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SessionInfoComponent } from '../../components/shared/session-info/session-info';
import { LoadDocumentsService } from './load-documents.service';
import { AzureStorageService } from '../../services/azure-storage.service';
import { LoadDocument } from './load-documents.models';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-load-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TagModule,
    ToastModule,
    TooltipModule,
    PageHeaderComponent,
    SessionInfoComponent
  ],
  providers: [MessageService],
  templateUrl: './load-documents.html',
  styleUrl: './load-documents.scss'
})
export class LoadDocumentsComponent implements OnInit {
  private loadDocumentsService = inject(LoadDocumentsService);
  private azureStorageService = inject(AzureStorageService);
  private messageService = inject(MessageService);

  documents = signal<LoadDocument[]>([]);
  loading = signal<boolean>(true);
  downloading = signal<boolean>(false);

  // For global filter
  searchValue = signal<string>('');

  ngOnInit() {
    this.loadDocuments();
  }

  loadDocuments() {
    this.loading.set(true);
    this.loadDocumentsService.getDocuments().subscribe({
      next: (response) => {
        const docs = response.data || response.documents || response.result || response || [];
        // Sort descending by date
        const sortedDocs = Array.isArray(docs) ? docs.sort((a: any, b: any) => {
          return new Date(b.Fecha || 0).getTime() - new Date(a.Fecha || 0).getTime();
        }) : [];
        this.documents.set(sortedDocs);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading documents:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los documentos.' });
        this.loading.set(false);
      }
    });
  }

  async downloadFiles(doc: LoadDocument) {
    if (!doc.IdFolder) return;

    this.downloading.set(true);
    this.messageService.add({ severity: 'info', summary: 'Descargando', detail: 'Preparando archivos para descarga...' });

    try {
      const idFolder = doc.IdFolder;
      const lowerIdFolder = idFolder.toLowerCase();

      const possiblePaths = [
        `validationsOC/${lowerIdFolder}`,
        `validationsOC/${lowerIdFolder}/`,
        `validationsoc/${lowerIdFolder}`,
        `validationsoc/${lowerIdFolder}/`,
        `validationsOC/${idFolder}`,
        `validationsOC/${idFolder}/`,
        `${lowerIdFolder}`,
        `${idFolder}`
      ];

      let blobsFound = false;
      const zip = new JSZip();

      for (const path of possiblePaths) {
        const blobs = await this.azureStorageService.listBlobs(path);

        if (blobs.length > 0) {
          blobsFound = true;

          for (const blobName of blobs) {
            const blob = await this.azureStorageService.downloadBlob(blobName);
            if (blob) {
              const fileName = blobName.split('/').pop() || blobName;
              zip.file(fileName, blob);
            }
          }
          break; // Found files in this path, stop searching
        }
      }

      if (blobsFound) {
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `documentos-${idFolder}.zip`);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Descarga completada.' });
      } else {
        this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'No se encontraron archivos para este registro.' });
      }

    } catch (error) {
      console.error('Download error:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al descargar los archivos.' });
    } finally {
      this.downloading.set(false);
    }
  }

  getStatusSeverity(status: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined {
    switch (status?.toLowerCase()) {
      case 'uploaded':
      case 'completado':
        return 'success';
      case 'pending':
      case 'pendiente':
        return 'warn';
      case 'error':
        return 'danger';
      default:
        return 'info';
    }
  }
}
