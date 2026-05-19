import { Component, input, output, signal, effect, computed, OnDestroy, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, TooltipModule, ProgressBarModule, SafeUrlPipe],
  templateUrl: './file-preview.html',
  styleUrls: ['./file-preview.scss']
})
export class FilePreviewComponent implements OnDestroy {
  file = input<File | string | null>(null);
  fileName = input<string>('');
  fileSize = input<number>(0);
  visible = model<boolean>(false);
  onDownload = output<void>();

  fileUrl = signal<string | null>(null);
  zoom = signal<number>(1);
  rotation = signal<number>(0);
  error = signal<string | null>(null);
  loading = signal<boolean>(false);
  downloading = signal<boolean>(false);
  downloadProgress = signal<number>(0);

  displayName = computed(() => {
    const fileData = this.file();
    if (fileData instanceof File) return fileData.name;
    return this.fileName() || 'Archivo';
  });

  fileType = computed(() => {
    const fileData = this.file();
    if (!fileData) return 'unknown';

    let name = '';
    if (fileData instanceof File) {
      name = fileData.name;
    } else {
      name = this.fileName() || (typeof fileData === 'string' ? fileData : '');
    }

    const extension = (name || '').toLowerCase().split('.').pop() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(extension)) return 'audio';
    if (extension === 'pdf') return 'pdf';
    if (['pptx', 'ppt'].includes(extension)) return 'presentation';
    if (['doc', 'docx', 'txt', 'rtf'].includes(extension)) return 'document';
    return 'unknown';
  });

  presentationUrl = computed(() => {
    const url = this.fileUrl();
    const type = this.fileType();
    if (type === 'presentation' && url) {
      // Office viewer needs encoded URL
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }
    return null;
  });

  constructor() {
    effect(() => {
      // Create URL when file and visible change
      const fileData = this.file();
      const isVisible = this.visible();
      const type = this.fileType();
      const size = this.fileSize();
      
      if (fileData && isVisible) {
        // Size checks for Office Online Viewer (increased to 250MB for heavy use cases)
        if (type === 'presentation' && size > 250 * 1024 * 1024) {
          this.error.set('El archivo es demasiado grande para previsualizarlo con el visor de Office (Máximo 250MB). Por favor, descárgalo para verlo.');
          return;
        }

        try {
          this.loading.set(true);
          if (fileData instanceof File) {
            const url = URL.createObjectURL(fileData);
            this.fileUrl.set(url);
          } else if (typeof fileData === 'string') {
            this.fileUrl.set(fileData);
          }
          this.resetState();
          this.error.set(null);
        } catch (e) {
          this.error.set('Error al cargar el archivo');
          this.loading.set(false);
        }
      } else {
        this.cleanupUrl();
      }
    });
  }

  onLoadComplete() {
    this.loading.set(false);
  }

  ngOnDestroy() {
    this.cleanupUrl();
  }

  private cleanupUrl() {
    // Only revoke if we created it (i.e. if file was a File object)
    // But we don't store if it was a blob url or string url easily in signal.
    // Actually, createObjectURL returns "blob:..."
    const url = this.fileUrl();
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    this.fileUrl.set(null);
  }

  onHide() {
    this.visible.set(false);
    this.resetState();
  }

  resetState() {
    this.zoom.set(1);
    this.rotation.set(0);
  }

  zoomIn() {
    this.zoom.update(z => Math.min(z * 1.2, 5));
  }

  zoomOut() {
    this.zoom.update(z => Math.max(z / 1.2, 0.1));
  }

  rotateLeft() {
    this.rotation.update(r => r - 90);
  }

  rotateRight() {
    this.rotation.update(r => r + 90);
  }

  download() {
    this.downloading.set(true);
    this.downloadProgress.set(0);
    this.onDownload.emit();
  }

  // Method to be called from parent to update progress or reset state
  setDownloadProgress(progress: number) {
    this.downloadProgress.set(progress);
    if (progress >= 100) {
      setTimeout(() => {
        this.downloading.set(false);
        this.downloadProgress.set(0);
      }, 1000);
    }
  }

  resetDownloadState() {
    this.downloading.set(false);
    this.downloadProgress.set(0);
  }

  handleError(type: string) {
    this.error.set(`Error al cargar ${type}`);
  }
}
