import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { AzureStorageService } from '../../services/azure-storage.service';
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
  private readonly ROOT_PATH = 'Comercial/Repositorio Comercial';

  // State
  files = signal<FileItem[]>([]);
  loading = signal<boolean>(false);
  currentPath = signal<string>(this.ROOT_PATH);
  breadcrumbItems = signal<MenuItem[]>([]);
  homeItem: MenuItem = { icon: 'pi pi-home', command: () => this.navigateToRoot() };

  ngOnInit() {
    this.updateBreadcrumb();
    this.loadFiles();
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
      // Azure listBlobsFlat lists everything recursively by default if we don't handle it carefully.
      // However, AzureStorageService.getFilesDetails uses listBlobsFlat. 
      // It returns all files. We need to process them to show a folder structure if we want to mimic a file explorer.
      // OR we can rely on a different method if we want "virtual folders".
      
      // Since the existing service `getFilesDetails` lists all blobs recursively (flat), 
      // we might need to filter them client-side or improve the service.
      // But `listBlobsFlat` takes a prefix.
      
      // To simulate folders, we need to:
      // 1. Get all blobs starting with `path`.
      // 2. Identify direct children and "folders" (prefixes).
      
      // Let's use `getFilesDetails` and filter client-side for now as it's the easiest given existing service.
      // A better approach for large datasets is using `listBlobsByHierarchy` but the service doesn't expose it.
      // We will assume the service returns all files with the prefix.
      
      const allFiles = await this.azureService.getFilesDetails(path, this.CONTAINER_NAME);
      
      // Process files to extract folders and direct files
      const items: FileItem[] = [];
      const folders = new Set<string>();
      
      // Normalize path to ensure trailing slash for replacement
      const normalizedPath = path.endsWith('/') ? path : `${path}/`;
      
      for (const file of allFiles) {
        // Remove the current path prefix
        const relativePath = file.id.startsWith(normalizedPath) 
          ? file.id.substring(normalizedPath.length) 
          : file.id; // Should verify if this happens
          
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
          // It's a file in the current directory
          items.push({
            ...file,
            isFolder: false
          });
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
      // Preview or download? 
      // For now, let's just download/open
      window.open(item.url, '_blank');
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
    
    items.push({ 
        label: 'Inicio', 
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

  getFileIcon(type: string): string {
    if (type === 'folder') return 'pi pi-folder text-yellow-500';
    if (type.includes('pdf')) return 'pi pi-file-pdf text-red-500';
    if (type.includes('excel') || type.includes('sheet')) return 'pi pi-file-excel text-green-500';
    if (type.includes('word') || type.includes('document')) return 'pi pi-file-word text-blue-500';
    if (type.includes('image')) return 'pi pi-image text-purple-500';
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
