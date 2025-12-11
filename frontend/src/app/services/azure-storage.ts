import { Injectable } from '@angular/core';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

export interface AzureConfig {
  sasToken: string;
  containerName: string;
  storageAccountName: string;
}

export interface UploadOptions {
  folderPath: string;
  onProgress?: (progress: number) => void;
  metadata?: Record<string, string>;
}

export interface DownloadOptions {
  folderPath: string;
  fileName?: string;
}

export interface UploadResult {
  success: boolean;
  fileName: string;
  url: string;
  error?: string;
}

const AZURE_CONFIG: AzureConfig = {
  sasToken: "sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2026-07-18T00:00:00Z&st=2025-07-17T12:00:00Z&spr=https&sig=5bOczB2JntgCnxgUF621l2zNepka4FohFR8hzCUuMt0%3D",
  containerName: "conciliacionesv1",
  storageAccountName: "autoconsumofileserver"
};

@Injectable({
  providedIn: 'root'
})
export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;

  constructor() {
    this.blobServiceClient = new BlobServiceClient(
      `https://${AZURE_CONFIG.storageAccountName}.blob.core.windows.net/?${AZURE_CONFIG.sasToken}`
    );
    this.containerClient = this.blobServiceClient.getContainerClient(AZURE_CONFIG.containerName);
  }

  /**
   * Upload a single file to Azure Storage
   */
  async uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
    try {
      const fileName = this.sanitizeFileName(file.name);
      const blobName = `${options.folderPath}/${fileName}`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

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
    } catch (error) {
      console.error('Error uploading file:', error);
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
  async listBlobs(prefix: string): Promise<string[]> {
    const blobs: string[] = [];
    try {
      for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
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
  async downloadBlob(blobName: string): Promise<Blob | undefined> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
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
  async uploadBlob(file: Blob | File, blobName: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
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
          for await (const blob of this.containerClient.listBlobsFlat({ prefix: searchPath })) {
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

        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
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
  async listFiles(folderPath: string): Promise<string[]> {
    try {
      const blobs: string[] = [];
      const searchPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

      for await (const blob of this.containerClient.listBlobsFlat({ prefix: searchPath })) {
        blobs.push(blob.name);
      }

      return blobs;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Get detailed file information for a specific folder
   */
  async getFilesDetails(folderPath: string): Promise<Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    uploadDate: string;
  }>> {
    try {
      const files: Array<{
        id: string;
        name: string;
        size: number;
        type: string;
        url: string;
        uploadDate: string;
      }> = [];

      const searchPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

      for await (const blob of this.containerClient.listBlobsFlat({
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
          url: `https://${AZURE_CONFIG.storageAccountName}.blob.core.windows.net/${AZURE_CONFIG.containerName}/${blob.name}`,
          uploadDate: blob.properties.lastModified?.toISOString() || new Date().toISOString()
        });
      }

      return files;
    } catch (error) {
      console.error('Error getting files details:', error);
      throw error;
    }
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'mp3': 'audio/mpeg',
      'mp4': 'video/mp4',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Delete a file from Azure Storage
   */
  async deleteFile(blobName: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
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
  getFileUrl(blobName: string): string {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.url;
  }

  /**
   * Check if a file exists
   */
  async fileExists(blobName: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
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
  async downloadSingleFile(blobName: string, fileName?: string): Promise<void> {
    try {
      // Allow passing a full URL; extract blob path if needed
      let resolvedBlobName = blobName;
      if (/^https?:\/\//i.test(blobName)) {
        const url = new URL(blobName);
        const parts = url.pathname.split('/').filter(Boolean);
        // parts: [container, ...blobSegments]
        resolvedBlobName = decodeURIComponent(parts.slice(1).join('/'));
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(resolvedBlobName);
      const downloadResponse = await blockBlobClient.download();
      const blobData = await downloadResponse.blobBody;

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
      let resolvedBlobName = blobNameOrUrl;
      if (/^https?:\/\//i.test(blobNameOrUrl)) {
        const url = new URL(blobNameOrUrl);
        const parts = url.pathname.split('/').filter(Boolean);
        resolvedBlobName = decodeURIComponent(parts.slice(1).join('/'));
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(resolvedBlobName);
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

  static generateDocumentFolderPath(userId: string): string {
    return `salidadatosprocesados/${userId}`;
  }
}
