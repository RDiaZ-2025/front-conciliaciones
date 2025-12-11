import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { ImageModule } from 'primeng/image';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth';
import { AzureStorageService } from '../../services/azure-storage';
import { Cover15MinutesService } from './cover15minutes.service';
import { CoverHistoryItem } from './cover15minutes.models';

@Component({
  selector: 'app-cover15minutes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    FileUploadModule,
    ImageModule,
    CardModule,
    TableModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './cover15minutes.html',
  styleUrl: './cover15minutes.scss'
})
export class Cover15MinutesComponent implements OnInit {
  private coverService = inject(Cover15MinutesService);
  private azureService = inject(AzureStorageService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);

  // Constants (should match AzureStorageService config basically)
  private readonly containerName = "conciliacionesv1";
  private readonly storageAccountName = "autoconsumofileserver";
  private readonly sasToken = "sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2026-07-18T00:00:00Z&st=2025-07-17T12:00:00Z&spr=https&sig=5bOczB2JntgCnxgUF621l2zNepka4FohFR8hzCUuMt0%3D";

  currentImageUrl = signal<string>('');
  history = signal<CoverHistoryItem[]>([]);
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  uploading = signal<boolean>(false);

  ngOnInit() {
    this.refreshCurrentImage();
    this.loadHistory();
  }

  refreshCurrentImage() {
    this.currentImageUrl.set(
      `https://${this.storageAccountName}.blob.core.windows.net/${this.containerName}/15minutes/cover.png?${this.sasToken}&t=${Date.now()}`
    );
  }

  loadHistory() {
    this.coverService.getAllCovers().subscribe({
      next: (response) => {
        if (response.success) {
          const historyWithSas = response.data.map(item => ({
            ...item,
            url: `${item.url}?${this.sasToken}`
          }));
          // Sort by timestamp desc
          historyWithSas.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          this.history.set(historyWithSas);
        }
      },
      error: (err) => console.error('Error loading history:', err)
    });
  }

  onFileSelect(event: any) {
    const file = event.files[0];
    if (file) {
      this.selectedFile.set(file);
      this.previewUrl.set(URL.createObjectURL(file));
    }
  }

  clearSelection() {
    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl()!);
    }
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  async upload() {
    const file = this.selectedFile();
    if (!file) return;

    this.uploading.set(true);
    this.messageService.add({ severity: 'info', summary: 'Subiendo', detail: 'Subiendo imagen...' });

    try {
      const randomName = `15minutes/${crypto.randomUUID()}.png`;
      const fixedName = `15minutes/cover.png`;

      // 1. Upload with random name (for history)
      await this.azureService.uploadBlob(file, randomName);

      // 2. Upload with fixed name (for current cover)
      await this.azureService.uploadBlob(file, fixedName);

      // 3. Save to DB
      const historyUrl = `https://${this.storageAccountName}.blob.core.windows.net/${this.containerName}/${randomName}`;

      this.coverService.createCover({ url: historyUrl }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Portada actualizada' });
          this.clearSelection();
          this.refreshCurrentImage();
          this.loadHistory();
          this.uploading.set(false);
        },
        error: (err: any) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al guardar en BD' });
          this.uploading.set(false);
        }
      });

    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al subir a Azure' });
      this.uploading.set(false);
    }
  }

  copyLink(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      this.messageService.add({ severity: 'success', summary: 'Copiado', detail: 'Enlace copiado al portapapeles' });
    });
  }
}
