import { Component, Input, Output, EventEmitter, signal, effect, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, TooltipModule, SafeUrlPipe],
  templateUrl: './file-preview.html',
  styleUrls: ['./file-preview.scss']
})
export class FilePreviewComponent implements OnDestroy {
  @Input() file: File | string | null = null;
  @Input() fileName: string = '';
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onDownload = new EventEmitter<void>();

  fileUrl = signal<string | null>(null);
  zoom = signal<number>(1);
  rotation = signal<number>(0);
  error = signal<string | null>(null);

  displayName = computed(() => {
    if (this.file instanceof File) return this.file.name;
    return this.fileName || 'Archivo';
  });

  fileType = computed(() => {
    if (!this.file) return 'unknown';

    let name = '';
    if (this.file instanceof File) {
      name = this.file.name;
    } else {
      name = this.fileName || (typeof this.file === 'string' ? this.file : '');
    }

    const extension = (name || '').toLowerCase().split('.').pop() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(extension)) return 'audio';
    if (extension === 'pdf') return 'pdf';
    if (['doc', 'docx', 'txt', 'rtf'].includes(extension)) return 'document';
    return 'unknown';
  });

  constructor() {
    effect(() => {
      // Create URL when file and visible change
      if (this.file && this.visible) {
        try {
          if (this.file instanceof File) {
            const url = URL.createObjectURL(this.file);
            this.fileUrl.set(url);
          } else if (typeof this.file === 'string') {
            this.fileUrl.set(this.file);
          }
          this.resetState();
          this.error.set(null);
        } catch (e) {
          this.error.set('Error al cargar el archivo');
        }
      } else {
        this.cleanupUrl();
      }
    });
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
    this.visibleChange.emit(false);
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
    this.onDownload.emit();
  }

  handleError(type: string) {
    this.error.set(`Error al cargar ${type}`);
  }
}
