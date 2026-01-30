import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule, FileUpload } from 'primeng/fileupload';
import { ImageModule } from 'primeng/image';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { AuthService } from '../../services/auth.service';
import { AzureStorageService } from '../../services/azure-storage.service';
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
    ToastModule,
    TooltipModule,
    PageHeaderComponent
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

  @ViewChild('fileUpload') fileUpload!: FileUpload;

  currentImageUrl = signal<string>('');
  history = signal<CoverHistoryItem[]>([]);
  uploading = signal<boolean>(false);

  ngOnInit() {
    this.refreshCurrentImage();
    this.loadHistory();
  }

  async refreshCurrentImage() {
    try {
      // Add timestamp to bypass browser cache
      const url = await this.azureService.getFileUrl('15minutes/cover.jpg', 'public');
      this.currentImageUrl.set(`${url}&t=${Date.now()}`);
    } catch (error) {
      console.error('Error refreshing current image:', error);
    }
  }

  loadHistory() {
    this.coverService.getAllCovers().subscribe({
      next: async (response) => {
        if (response.success) {
          // Process history items to get fresh SAS URLs
          const historyPromises = response.data.map(async (item) => {
            // Extract blob name from URL if possible, or assume it's stored as full URL
            // If stored as full URL: https://account.blob.../container/15minutes/guid.jpg
            let blobName = item.url;
            if (item.url.includes('/15minutes/')) {
              const parts = item.url.split('/15minutes/');
              blobName = `15minutes/${parts[1]}`;
            }

            // Clean up query params if any
            blobName = blobName.split('?')[0];

            const signedUrl = await this.azureService.getFileUrl(blobName, 'public');
            return {
              ...item,
              url: signedUrl
            };
          });

          const historyWithSas = await Promise.all(historyPromises);

          // Sort by timestamp desc
          historyWithSas.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          this.history.set(historyWithSas);
        }
      },
      error: (err) => console.error('Error loading history:', err)
    });
  }

  formatSize(bytes: number) {
    if (bytes === 0) {
      return '0 B';
    }
    const k = 1024;
    const dm = 2;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  onCustomUpload(event: any) {
    const file = event.files[0];
    if (file) {
      this.upload(file);
    }
  }

  async upload(file: File) {
    if (!file) return;

    this.uploading.set(true);
    this.messageService.add({ severity: 'info', summary: 'Subiendo', detail: 'Subiendo imagen...' });

    try {
      const randomName = `15minutes/${crypto.randomUUID()}.jpg`;
      const fixedName = `15minutes/cover.jpg`;

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: file.type,
          blobContentDisposition: 'inline'
        }
      };

      // 1. Upload with random name (for history)
      await this.azureService.uploadBlob(file, randomName, 'public', uploadOptions);

      // 2. Upload with fixed name (for current cover)
      await this.azureService.uploadBlob(file, fixedName, 'public', uploadOptions);

      // 3. Save to DB
      // Get signed URL to extract the base URL
      const signedUrl = await this.azureService.getFileUrl(randomName, 'public');
      const historyUrl = signedUrl.split('?')[0]; // Store URL without SAS token

      const user = this.authService.currentUser();
      const uploaderLog = user ? `${user.name} (${user.email})` : 'Unknown User';

      this.coverService.createCover({ uploaderLog, url: historyUrl }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Portada actualizada' });
          this.refreshCurrentImage();
          this.loadHistory();
          this.uploading.set(false);
          if (this.fileUpload) {
            this.fileUpload.clear();
          }
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
    const cleanUrl = url.split('?')[0];
    navigator.clipboard.writeText(cleanUrl).then(() => {
      this.messageService.add({ severity: 'success', summary: 'Copiado', detail: 'Enlace copiado al portapapeles' });
    });
  }
}

