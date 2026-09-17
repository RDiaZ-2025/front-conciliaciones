import { BaseApiService } from './base-api.service';
import { Injectable, inject } from '@angular/core';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { ShareServiceClient, ShareClient, ShareDirectoryClient } from '@azure/storage-file-share';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { firstValueFrom, filter, tap } from 'rxjs';
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
export class AzureStorageService extends BaseApiService {

  private sessions = new Map<string, {
    client: ContainerClient | ShareClient;
    expiry: Date;
    accountName: string;
    sasToken: string;
    serviceType: 'blob' | 'file';
  }>();

  constructor() {
    super();
  }

  private async getClient(containerName: string = 'private'): Promise<ContainerClient | ShareClient> {
    const session = this.sessions.get(containerName);

    if (session && session.expiry > new Date()) {
      return session.client;
    }

    try {

      const response = await firstValueFrom(
        this.http.get<SasTokenResponse>(`${environment.apiUrl}/storage/sas-token`, {
          params: { container: containerName }
        })
      );

      if (!response.success) {
        throw new Error('Failed to retrieve SAS token');
      }

      const expiryDate = new Date(response.data.expiresOn);

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

      this.sessions.set(containerName, {
        client,
        expiry: expiryDate,
        accountName: response.data.accountName,
        sasToken: response.data.sasToken,
        serviceType
      });

      return client;
    } catch (error: any) {

      if (error.status === 500 && error.error?.message?.includes('Azure Storage configuration missing')) {
        console.warn(`Azure Storage not configured: ${error.error.message}`);
        throw new Error('Azure Storage not configured');
      }

      console.error(`Error initializing Azure Storage client for container ${containerName}:`, error);
      throw error;
    }
  }

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

  async uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
    try {
      const containerClient = await this.getContainerClient(options.containerName);
      const fileName = this.sanitizeFileName(file.name);
      const blobName = `${options.folderPath}/${fileName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const sanitizedMetadata: Record<string, string> = {
        originalName: this.toAscii(file.name),
        uploadDate: new Date().toISOString()
      };

      if (options.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
          if (value !== undefined && value !== null) {
            sanitizedMetadata[key] = this.toAscii(String(value));
          }
        }
      }

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: file.type,
        },
        metadata: sanitizedMetadata,
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

  async downloadBlob(blobName: string, containerName: string = 'private'): Promise<Blob | undefined> {
    if (containerName === 'autoconsumoshared') {
      const url = `${environment.apiUrl}/storage/commercial/download?path=${encodeURIComponent(blobName)}`;
      try {
        return await firstValueFrom(
          this.http.get(url, { responseType: 'blob' })
        );
      } catch (error) {
        console.error('Error downloading commercial blob:', error);
        return undefined;
      }
    }

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

  async uploadBlob(file: Blob | File, blobName: string, containerName: string = 'private', options?: { blobHTTPHeaders?: any }): Promise<boolean> {
    try {
      const containerClient = await this.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const uploadOptions: any = {};
      if (options?.blobHTTPHeaders) {
        uploadOptions.blobHTTPHeaders = options.blobHTTPHeaders;
      }

      await blockBlobClient.uploadData(file, uploadOptions);
      return true;
    } catch (error) {
      console.error('Error uploading blob:', error);
      return false;
    }
  }

  async uploadFiles(files: File[], options: UploadOptions): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => {

      const fileCategory = (file as any).category;
      const metadata = { ...options.metadata };
      if (fileCategory) {
        metadata['category'] = fileCategory;
      }

      return this.uploadFile(file, {
        ...options,
        metadata,
        onProgress: undefined,
      });
    });

    return Promise.all(uploadPromises);
  }

  async downloadFiles(options: DownloadOptions): Promise<void> {
    try {
      const containerClient = await this.getContainerClient(options.containerName);
      const folderPath = options.folderPath.toLowerCase();

      const possiblePaths = [
        folderPath,
        `${folderPath}/`,
        `salidadatosprocesados/${folderPath}`,
        `SalidaDatosProcesados/${folderPath}`,
        `salidadatosprocesados/${folderPath}/`,
        `SalidaDatosProcesados/${folderPath}/`,
        options.folderPath,
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
            break;
          }
        } catch (pathError) {
          console.error(`Error searching with prefix ${searchPath}:`, pathError);
        }
      }

      if (blobs.length === 0) {
        throw new Error(`No files found in folder: ${options.folderPath}`);
      }

      for (const blobName of blobs) {
        if (options.fileName && !blobName.includes(options.fileName)) {
          continue;
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
        this.http.get<{ success: boolean, data: any[] }>(`${environment.apiUrl}/storage/commercial/files`, {
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

  async getFilesDetails(folderPath: string, containerName: string = 'private'): Promise<Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    uploadDate: string;
  }>> {

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

        let searchPath = folderPath;
        if (searchPath.endsWith('/')) searchPath = searchPath.slice(0, -1);

        const directoryClient = searchPath ? client.getDirectoryClient(searchPath) : client.rootDirectoryClient;

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

  async getFileUrl(blobName: string, containerName: string = 'private'): Promise<string> {
    await this.getClient(containerName);
    const session = this.sessions.get(containerName);

    if (!session) {
      throw new Error(`No session found for container ${containerName}`);
    }

    const client = session.client;

    if (this.isShareClient(client)) {

      const lastSlashIndex = blobName.lastIndexOf('/');
      const directoryPath = lastSlashIndex > -1 ? blobName.substring(0, lastSlashIndex) : '';
      const fileName = lastSlashIndex > -1 ? blobName.substring(lastSlashIndex + 1) : blobName;

      const directoryClient = directoryPath ? client.getDirectoryClient(directoryPath) : client.rootDirectoryClient;
      const fileClient = directoryClient.getFileClient(fileName);

      let url = fileClient.url;
      if (session.sasToken && !url.includes('sig=')) {
        url += (url.includes('?') ? '&' : '?') + session.sasToken.replace(/^\?/, '');
      }
      return url;
    } else {

      const blobClient = client as ContainerClient;
      const blockBlobClient = blobClient.getBlockBlobClient(blobName);
      let url = blockBlobClient.url;

      if (session.sasToken && !url.includes('sig=')) {
        url += (url.includes('?') ? '&' : '?') + session.sasToken.replace(/^\?/, '');
      }
      return url;
    }
  }

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

  private sanitizeFileName(fileName: string): string {

    return fileName
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  private toAscii(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x00-\x7F]/g, '_');
  }

  async downloadSingleFile(blobName: string, fileName?: string, containerName: string = 'private', onProgress?: (progress: number) => void, fileSize?: number): Promise<void> {
    if (containerName === 'autoconsumoshared') {

      const url = `${environment.apiUrl}/storage/commercial/download?path=${encodeURIComponent(blobName)}`;
      try {
        let blob: Blob;
        if (onProgress) {
          const req = new HttpRequest('GET', url, {
            reportProgress: true,
            responseType: 'blob'
          });
          const response: any = await firstValueFrom(
            this.http.request(req).pipe(
              tap(event => {
                if (event.type === HttpEventType.DownloadProgress) {

                  const total = event.total || fileSize;
                  const percentDone = total ? Math.round(100 * event.loaded / total) : 0;
                  onProgress(percentDone);
                }
              }),
              filter(event => event.type === HttpEventType.Response)
            )
          );
          blob = response.body;
        } else {
          blob = await firstValueFrom(
            this.http.get(url, { responseType: 'blob' })
          );
        }

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

      let resolvedBlobName = blobName;
      if (/^https?:\/\//i.test(blobName)) {
        const url = new URL(blobName);
        const parts = url.pathname.split('/').filter(Boolean);

        resolvedBlobName = decodeURIComponent(parts.slice(1).join('/'));
      }

      let blobData: Blob | undefined;

      if (this.isShareClient(client)) {

        const lastSlashIndex = resolvedBlobName.lastIndexOf('/');
        const directoryPath = lastSlashIndex > -1 ? resolvedBlobName.substring(0, lastSlashIndex) : '';
        const name = lastSlashIndex > -1 ? resolvedBlobName.substring(lastSlashIndex + 1) : resolvedBlobName;

        const directoryClient = directoryPath ? client.getDirectoryClient(directoryPath) : client.rootDirectoryClient;
        const fileClient = directoryClient.getFileClient(name);

        let totalSize = fileSize;
        if (onProgress && !totalSize) {
          try {
            const props = await fileClient.getProperties();
            totalSize = props.contentLength;
          } catch (e) { }
        }

        const downloadResponse = await fileClient.download(0, undefined, {
          onProgress: onProgress ? (ev) => {
            if (totalSize) {
              onProgress(Math.round(100 * ev.loadedBytes / totalSize));
            }
          } : undefined
        });
        blobData = await downloadResponse.blobBody;
      } else {

        const blockBlobClient = client.getBlockBlobClient(resolvedBlobName);

        let totalSize = fileSize;
        if (onProgress && !totalSize) {
          try {
            const props = await blockBlobClient.getProperties();
            totalSize = props.contentLength;
          } catch (e) { }
        }

        const downloadResponse = await blockBlobClient.download(0, undefined, {
          onProgress: onProgress ? (ev) => {
            if (totalSize) {
              onProgress(Math.round(100 * ev.loadedBytes / totalSize));
            }
          } : undefined
        });
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
      return await blobBody;
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
