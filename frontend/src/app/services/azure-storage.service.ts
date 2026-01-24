import { Injectable, inject } from '@angular/core';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { ShareServiceClient, ShareClient, ShareDirectoryClient } from '@azure/storage-file-share';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UploadOptions {
  folderPath: string;
  onProgress?: (progress: number) => void;
  metadata?: Record<string, string>;
  containerName?: string;
}

export interface DownloadOptions {
  folderPath: string;
  fileName?: string;
  containerName?: string;
}

export interface UploadResult {
  success: boolean;
  fileName: string;
  url: string;
  error?: string;
}

interface SasTokenResponse {
  success: boolean;
  data: {
    sasToken: string;
    url: string;
    accountName: string;
    containerName: string;
    expiresOn: string;
    serviceType?: 'blob' | 'file';
  };
}

@Injectable({
  providedIn: 'root'
})
export class AzureStorageService {
  private http = inject(HttpClient);

  // Cache for container sessions
  private sessions = new Map<string, {
    client: ContainerClient | ShareClient;
    expiry: Date;
    accountName: string;
    sasToken: string;
    serviceType: 'blob' | 'file';
  }>();

  constructor() { }

  private async getClient(containerName: string = 'private'): Promise<ContainerClient | ShareClient> {
    const session = this.sessions.get(containerName);

    // Check if we have a valid session
    if (session && session.expiry > new Date()) {
      return session.client;
    }

    try {
      // Pass container parameter to backend
      const response = await firstValueFrom(
        this.http.get<SasTokenResponse>(`${environment.apiUrl}/storage/sas-token`, {
          params: { container: containerName }
        })
      );

      if (!response.success) {
        throw new Error('Failed to retrieve SAS token');
      }

      const expiryDate = new Date(response.data.expiresOn);
      // Ensure we subtract a buffer (e.g., 5 mins) to refresh before actual expiry
      expiryDate.setMinutes(expiryDate.getMinutes() - 5);

      const serviceType = response.data.serviceType || 'blob';
      let client: ContainerClient | ShareClient;

      if (serviceType === 'file') {
         const shareServiceClient = new ShareServiceClient(
            `https://${response.data.accountName}.file.core.windows.net/${response.data.sasToken}`
         );
         client = shareServiceClient.getShareClient(response.data.containerName);
      } else {
         const blobServiceClient = new BlobServiceClient(
            `https://${response.data.accountName}.blob.core.windows.net/${response.data.sasToken}`
         );
         client = blobServiceClient.getContainerClient(response.data.containerName);
      }

      // Store in cache
      this.sessions.set(containerName, {
        client,
        expiry: expiryDate,
        accountName: response.data.accountName,
        sasToken: response.data.sasToken,
        serviceType
      });

      return client;
    } catch (error: any) {
      // Handle missing configuration gracefully
      if (error.status === 500 && error.error?.message?.includes('Azure Storage configuration missing')) {
        console.warn(`Azure Storage not configured: ${error.error.message}`);
        throw new Error('Azure Storage not configured');
      }
      
      console.error(`Error initializing Azure Storage client for container ${containerName}:`, error);
      throw error;
    }
  }

  // Backwards compatibility alias
  private async getContainerClient(containerName: string = 'private'): Promise<ContainerClient> {
      const client = await this.getClient(containerName);
      if (this.isShareClient(client)) {
          throw new Error('Expected Blob ContainerClient but got ShareClient');
      }
      return client;
  }

  private isShareClient(client: any): client is ShareClient {
      return (client as ShareClient).getDirectoryClient !== undefined;
  }


  /**
   * Upload a single file to Azure Storage
   */
  async uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
    try {
      const containerClient = await this.getContainerClient(options.containerName);
      const fileName = this.sanitizeFileName(file.name);
      const blobName = `${options.folderPath}/${fileName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Upload with progress tracking
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: file.type,
        },
        metadata: {
          originalName: file.name,
          uploadDate: new Date().toISOString(),
          ...options.metadata,
        },
        onProgress: options.onProgress ? (ev: any) => {
          const progress = (ev.loadedBytes / file.size) * 100;
          options.onProgress!(progress);
        } : undefined,
      };

      await blockBlobClient.uploadData(file, uploadOptions);

      return {
        success: true,
        fileName,
        url: blockBlobClient.url,
      };
    } catch (error: any) {
      if (error.message !== 'Azure Storage not configured') {
        console.error('Error uploading file:', error);
      }
      return {
        success: false,
        fileName: file.name,
        url: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * List blobs with a prefix
   */
  async listBlobs(prefix: string, containerName: string = 'private'): Promise<string[]> {
    const blobs: string[] = [];
    try {
      const containerClient = await this.getContainerClient(containerName);
      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        blobs.push(blob.name);
      }
    } catch (error) {
      console.error('Error listing blobs:', error);
    }
    return blobs;
  }

  /**
   * Download a blob as a Blob object
   */
  async downloadBlob(blobName: string, containerName: string = 'private'): Promise<Blob | undefined> {
    try {
      const containerClient = await this.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const downloadResponse = await blockBlobClient.download(0);
      return await downloadResponse.blobBody;
    } catch (error) {
      console.error('Error downloading blob:', error);
      return undefined;
    }
  }

  /**
   * Upload a single blob with a specific name
   */
  async uploadBlob(file: Blob | File, blobName: string, containerName: string = 'private'): Promise<boolean> {
    try {
      const containerClient = await this.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.uploadData(file);
      return true;
    } catch (error) {
      console.error('Error uploading blob:', error);
      return false;
    }
  }

  /**
   * Upload multiple files to Azure Storage
   */
  async uploadFiles(files: File[], options: UploadOptions): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, {
      ...options,
      onProgress: undefined, // Individual progress tracking not supported for batch uploads
    }));

    return Promise.all(uploadPromises);
  }

  /**
   * Download files from a specific folder
   */
  async downloadFiles(options: DownloadOptions): Promise<void> {
    try {
      const containerClient = await this.getContainerClient(options.containerName);
      const folderPath = options.folderPath.toLowerCase();

      // Try different possible folder path variations
      const possiblePaths = [
        folderPath,
        `${folderPath}/`,
        `salidadatosprocesados/${folderPath}`,
        `SalidaDatosProcesados/${folderPath}`,
        `salidadatosprocesados/${folderPath}/`,
        `SalidaDatosProcesados/${folderPath}/`,
        options.folderPath, // Original case
        `${options.folderPath}/`,
      ];

      let blobs: string[] = [];

      for (const searchPath of possiblePaths) {
        try {
          for await (const blob of containerClient.listBlobsFlat({ prefix: searchPath })) {
            if (!blobs.includes(blob.name)) {
              blobs.push(blob.name);
            }
          }

          if (blobs.length > 0) {
            break; // Stop searching once we find files
          }
        } catch (pathError) {
          console.error(`Error searching with prefix ${searchPath}:`, pathError);
        }
      }

      if (blobs.length === 0) {
        throw new Error(`No files found in folder: ${options.folderPath}`);
      }

      // Download each blob
      for (const blobName of blobs) {
        if (options.fileName && !blobName.includes(options.fileName)) {
          continue; // Skip if specific file requested and this isn't it
        }

        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const downloadResponse = await blockBlobClient.download();
        const blobData = await downloadResponse.blobBody;

        if (blobData) {
          const url = window.URL.createObjectURL(await blobData);
          const a = document.createElement('a');
          a.href = url;
          a.download = blobName.split('/').pop() || 'download';
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Error downloading files:', error);
      throw error;
    }
  }

  /**
   * List files in a specific folder
   */
  async listFiles(folderPath: string, containerName: string = 'private'): Promise<string[]> {
    try {
      const containerClient = await this.getContainerClient(containerName);
      const blobs: string[] = [];
      const searchPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

      for await (const blob of containerClient.listBlobsFlat({ prefix: searchPath })) {
        blobs.push(blob.name);
      }

      return blobs;
    } catch (error: any) {
      if (error.message === 'Azure Storage not configured') {
        return [];
      }
      console.error('Error listing files:', error);
      throw error;
    }
  }

  private async getCommercialFiles(folderPath: string): Promise<any[]> {
      try {
        const response = await firstValueFrom(
            this.http.get<{success: boolean, data: any[]}>(`${environment.apiUrl}/storage/commercial/files`, {
                params: { path: folderPath }
            })
        );
        
        if (!response.success) throw new Error('Failed to load commercial files');
        
        return response.data.map(item => {
            const normalizedPath = folderPath.endsWith('/') ? folderPath.slice(0, -1) : folderPath;
            const fullPath = normalizedPath ? `${normalizedPath}/${item.name}` : item.name;
            
            return {
                id: fullPath,
                name: item.name,
                size: item.size,
                type: item.kind === 'directory' ? 'directory' : this.getMimeType(item.name.split('.').pop()?.toLowerCase() || ''),
                url: '', 
                uploadDate: item.lastModified || new Date().toISOString()
            };
        });
      } catch (error) {
          console.error('Error fetching commercial files via proxy:', error);
          throw error;
      }
  }

  /**
   * Get detailed file information for a specific folder
   */
  async getFilesDetails(folderPath: string, containerName: string = 'private'): Promise<Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    uploadDate: string;
  }>> {
    // If commercial container, use proxy to avoid CORS issues
    if (containerName === 'autoconsumoshared') {
        return this.getCommercialFiles(folderPath);
    }

    try {
      const client = await this.getClient(containerName);
      const session = this.sessions.get(containerName);
      const accountName = session?.accountName || 'vocprojectstorage';

      const files: Array<{
        id: string;
        name: string;
        size: number;
        type: string;
        url: string;
        uploadDate: string;
      }> = [];

      if (this.isShareClient(client)) {
          // Share Logic
          // Remove trailing slash for Share Directory Client
          let searchPath = folderPath;
          if (searchPath.endsWith('/')) searchPath = searchPath.slice(0, -1);
          
          const directoryClient = searchPath ? client.getDirectoryClient(searchPath) : client.rootDirectoryClient;

          // Check existence (only if not root, root always exists in valid share)
          if (searchPath && !await directoryClient.exists()) {
             return [];
          }

          try {
            for await (const entity of directoryClient.listFilesAndDirectories()) {
               const entityPath = searchPath ? `${searchPath}/${entity.name}` : entity.name;
               
               if (entity.kind === 'directory') {
                    files.push({
                        id: entityPath,
                        name: entity.name,
                        size: 0,
                        type: 'directory',
                        url: '',
                        uploadDate: new Date().toISOString()
                    });
               } else {
                    files.push({
                        id: entityPath,
                        name: entity.name,
                        size: entity.properties.contentLength || 0,
                        type: this.getMimeType(entity.name.split('.').pop()?.toLowerCase() || ''),
                        // Generate URL with SAS token
                        url: `https://${accountName}.file.core.windows.net/${containerName}/${entityPath}${session?.sasToken}`,
                        uploadDate: entity.properties.lastModified?.toISOString() || new Date().toISOString()
                    });
               }
            }
          } catch (e) {
             console.error('Error listing share files:', e);
             throw e;
          }
      } else {
          // Blob Logic
          const searchPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

          for await (const blob of client.listBlobsFlat({
            prefix: searchPath,
            includeMetadata: true
          })) {
            const fileName = blob.name.split('/').pop() || blob.name;
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
            const mimeType = this.getMimeType(fileExtension);

            files.push({
              id: blob.name,
              name: fileName,
              size: blob.properties.contentLength || 0,
              type: mimeType,
              url: `https://${accountName}.blob.core.windows.net/${containerName}/${blob.name}`,
              uploadDate: blob.properties.lastModified?.toISOString() || new Date().toISOString()
            });
          }
      }

      return files;
    } catch (error: any) {
      if (error.message === 'Azure Storage not configured') {
        return [];
      }
      console.error('Error getting files details:', error);
      throw error;
    }
  }

  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'txt': 'text/plain',
      'csv': 'text/csv'
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Delete a file from Azure Storage
   */
  async deleteFile(blobName: string, containerName: string = 'private'): Promise<boolean> {
    try {
      const containerClient = await this.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.delete();
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get file URL for preview/download
   */
  async getFileUrl(blobName: string, containerName: string = 'private'): Promise<string> {
    const containerClient = await this.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.url;
  }

  /**
   * Check if a file exists
   */
  async fileExists(blobName: string): Promise<boolean> {
    try {
      const containerClient = await this.getContainerClient();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const exists = await blockBlobClient.exists();
      return exists;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  /**
   * Sanitize file name for Azure Storage
   */
  private sanitizeFileName(fileName: string): string {
    // Remove or replace invalid characters for Azure blob names
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  /**
   * Download a single file by its blob name
   */
  async downloadSingleFile(blobName: string, fileName?: string, containerName: string = 'private'): Promise<void> {
    if (containerName === 'autoconsumoshared') {
        // Use proxy download
        const url = `${environment.apiUrl}/storage/commercial/download?path=${encodeURIComponent(blobName)}`;
        try {
            const blob = await firstValueFrom(
                this.http.get(url, { responseType: 'blob' })
            );
            
            const objectUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = fileName || blobName.split('/').pop() || 'download';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(objectUrl);
            return;
        } catch (error) {
            console.error('Error downloading commercial file:', error);
            throw error;
        }
    }

    try {
      const client = await this.getClient(containerName);
      
      // Allow passing a full URL; extract blob path if needed
      let resolvedBlobName = blobName;
      if (/^https?:\/\//i.test(blobName)) {
        const url = new URL(blobName);
        const parts = url.pathname.split('/').filter(Boolean);
        // parts: [container, ...blobSegments]
        resolvedBlobName = decodeURIComponent(parts.slice(1).join('/'));
      }

      let blobData: Blob | undefined;

      if (this.isShareClient(client)) {
         // Share Logic
         // resolvedBlobName is the full path relative to the share (e.g. "Folder/file.txt")
         const lastSlashIndex = resolvedBlobName.lastIndexOf('/');
         const directoryPath = lastSlashIndex > -1 ? resolvedBlobName.substring(0, lastSlashIndex) : '';
         const name = lastSlashIndex > -1 ? resolvedBlobName.substring(lastSlashIndex + 1) : resolvedBlobName;
         
         const directoryClient = directoryPath ? client.getDirectoryClient(directoryPath) : client.rootDirectoryClient;
         const fileClient = directoryClient.getFileClient(name);
         
         const downloadResponse = await fileClient.download();
         blobData = await downloadResponse.blobBody;
      } else {
         // Blob Logic
         const blockBlobClient = client.getBlockBlobClient(resolvedBlobName);
         const downloadResponse = await blockBlobClient.download();
         blobData = await downloadResponse.blobBody;
      }

      if (blobData) {
        const objectUrl = window.URL.createObjectURL(await blobData);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName || resolvedBlobName.split('/').pop() || 'download';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Get blob data for preview
   */
  async getBlobData(blobNameOrUrl: string): Promise<Blob> {
    try {
      const containerClient = await this.getContainerClient();
      let resolvedBlobName = blobNameOrUrl;
      if (/^https?:\/\//i.test(blobNameOrUrl)) {
        const url = new URL(blobNameOrUrl);
        const parts = url.pathname.split('/').filter(Boolean);
        resolvedBlobName = decodeURIComponent(parts.slice(1).join('/'));
      }

      const blockBlobClient = containerClient.getBlockBlobClient(resolvedBlobName);
      const downloadResponse = await blockBlobClient.download();
      const blobBody = await downloadResponse.blobBody;
      if (!blobBody) {
        throw new Error('Blob body not available');
      }
      return await blobBody; // actual Blob
    } catch (error) {
      console.error('Error getting blob data:', error);
      throw error;
    }
  }

  static generateProductionFolderPath(requestId: string): string {
    return `Produccion/${requestId}`;
  }

  static generateProductionRequestFolderPath(productionRequestId: string): string {
    return `productionRequest/${productionRequestId}`;
  }

  static generateDocumentFolderPath(userId: string): string {
    return `salidadatosprocesados/${userId}`;
  }
}
