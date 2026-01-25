
import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService, MenuItem } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { AzureStorageService } from '../../services/azure-storage.service';
import { AuthService } from '../../services/auth.service';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadDate: string;
  isFolder?: boolean;
}

@Component({
  selector: 'app-commercial',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    ToastModule,
    BreadcrumbModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    PageHeaderComponent
  ],
  providers: [MessageService],
  templateUrl: './commercial.component.html',
  styleUrls: ['./commercial.component.scss']
})
export class CommercialComponent implements OnInit {
  private azureService = inject(AzureStorageService);
  private messageService = inject(MessageService);

  // Configuration
  private readonly CONTAINER_NAME = 'autoconsumoshared';
  // Use the path exactly as seen in Azure, but be careful with slashes
  private readonly ROOT_PATH = 'Comercial/Repositorio Comercial';

  // State
  files = signal<FileItem[]>([]);
  loading = signal<boolean>(false);
  currentPath = signal<string>(this.ROOT_PATH);
  breadcrumbItems = signal<MenuItem[]>([]);
  searchValue = signal<string>('');

  filteredFiles = computed(() => {
    const term = this.searchValue().toLowerCase();
    const currentFiles = this.files();
    if (!term) return currentFiles;
    return currentFiles.filter(f => f.name.toLowerCase().includes(term));
  });

  homeItem: MenuItem = { icon: 'pi pi-home', command: () => this.navigateToRoot() };

  ngOnInit() {
    this.updateBreadcrumb();
    this.loadFiles();
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchValue.set(target.value);
  }

  navigateToRoot() {
    this.currentPath.set(this.ROOT_PATH);
    this.updateBreadcrumb();
    this.loadFiles();
  }

  async loadFiles() {
    this.loading.set(true);
    try {
      const path = this.currentPath();
      console.log('Loading files for path:', path);

      const allFiles = await this.azureService.getFilesDetails(path, this.CONTAINER_NAME);
      console.log('Raw files from Azure:', allFiles);

      // Process files to extract folders and direct files
      const items: FileItem[] = [];
      const folders = new Set<string>();

      // Normalize path to ensure trailing slash for replacement
      const normalizedPath = path.endsWith('/') ? path : `${path}/`;

      for (const file of allFiles) {
        // Remove the current path prefix
        const relativePath = file.id.startsWith(normalizedPath)
          ? file.id.substring(normalizedPath.length)
          : file.id;

        if (!relativePath) continue;

        const parts = relativePath.split('/');

        if (parts.length > 1) {
          // It's in a subfolder
          const folderName = parts[0];
          if (!folders.has(folderName)) {
            folders.add(folderName);
            items.push({
              id: `${normalizedPath}${folderName}`,
              name: folderName,
              size: 0,
              type: 'folder',
              url: '',
              uploadDate: '',
              isFolder: true
            });
          }
        } else {
          // It's a file or a direct folder (from Share)
          const isDirectory = file.type === 'directory';

          if (isDirectory) {
            if (!folders.has(file.name)) {
              folders.add(file.name);
              items.push({
                ...file,
                isFolder: true
              });
            }
          } else {
            items.push({
              ...file,
              isFolder: false
            });
          }
        }
      }

      this.files.set(items.sort((a, b) => {
        // Folders first
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      }));

    } catch (error) {
      console.error('Error loading files:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los archivos.' });
    } finally {
      this.loading.set(false);
    }
  }

  onItemClick(item: FileItem) {
    if (item.isFolder) {
      this.currentPath.set(item.id);
      this.updateBreadcrumb();
      this.loadFiles();
    } else {
      // Download file on click since actions column is removed
      this.azureService.downloadSingleFile(item.id, item.name, this.CONTAINER_NAME);
    }
  }

  downloadFile(item: FileItem, event: Event) {
    event.stopPropagation();
    this.azureService.downloadSingleFile(item.id, item.name, this.CONTAINER_NAME);
  }

  updateBreadcrumb() {
    const relative = this.currentPath().substring(this.ROOT_PATH.length);
    const parts = relative.split('/').filter(p => p);

    const items: MenuItem[] = [];
    let current = this.ROOT_PATH;

    // Always add Root (Repositorio Comercial)
    items.push({
      label: 'Repositorio Comercial',
      command: () => {
        this.currentPath.set(this.ROOT_PATH);
        this.updateBreadcrumb();
        this.loadFiles();
      }
    });

    for (const part of parts) {
      current = `${current}/${part}`;
      const path = current; // Capture for closure
      items.push({
        label: part,
        command: () => {
          this.currentPath.set(path);
          this.updateBreadcrumb();
          this.loadFiles();
        }
      });
    }

    this.breadcrumbItems.set(items);
  }

  getFileIcon(file: FileItem): string {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();

    if (name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.avi') || type.includes('video')) {
      return 'pi pi-video text-orange-500';
    }
    if (type.includes('pdf') || name.endsWith('.pdf')) return 'pi pi-file-pdf text-red-500';
    if (type.includes('excel') || type.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.xls')) return 'pi pi-file-excel text-green-500';
    if (type.includes('word') || type.includes('document') || name.endsWith('.docx') || name.endsWith('.doc')) return 'pi pi-file-word text-blue-500';
    if (type.includes('image') || name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.jpeg')) return 'pi pi-image text-purple-500';
    if (type.includes('presentation') || name.endsWith('.pptx') || name.endsWith('.ppt')) return 'pi pi-file text-orange-500';
    return 'pi pi-file text-gray-500';
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '-';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
