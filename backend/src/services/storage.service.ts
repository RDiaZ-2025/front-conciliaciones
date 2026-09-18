import {
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  ContainerSASPermissions,
  SASProtocol
} from '@azure/storage-blob';
import {
  StorageSharedKeyCredential as ShareSharedKeyCredential,
  generateAccountSASQueryParameters,
  AccountSASPermissions,
  AccountSASServices,
  AccountSASResourceTypes,
  ShareServiceClient
} from '@azure/storage-file-share';

export interface SasTokenResult {
  sasToken: string;
  url: string;
  accountName: string;
  containerName: string;
  expiresOn: Date;
  serviceType: 'blob' | 'file';
}

export interface StorageFileItem {
  name: string;
  kind: string;
  size: number;
  lastModified?: Date;
}

export class StorageService {
  /**
   * Genera un SAS Token seguro para almacenamiento privado, público o autoconsumo compartido
   */
  generateSasToken(requestedContainer?: string, user?: any): SasTokenResult {
    const allowedContainers = ['private', 'public', 'autoconsumoshared'];
    let containerName = requestedContainer;

    if (!containerName || !allowedContainers.includes(containerName)) {
      containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'private';
    }

    if (containerName === 'autoconsumoshared') {
      const hasCommercialAccess = user && user.permissions && (
        user.permissions.includes('Repositorio Comercial') ||
        user.permissions.includes('repositorioComercial') ||
        user.permissions.includes('view_commercial') ||
        user.permissions.includes('admin_panel')
      );
      if (!hasCommercialAccess) {
        const err: any = new Error('Access denied: Repositorio Comercial permission required');
        err.statusCode = 403;
        throw err;
      }

      const commAccountName = process.env.AZURE_AUTOCONSUMO_ACCOUNT_NAME || 'autoconsumofileserver';
      const commAccountKey = process.env.AZURE_AUTOCONSUMO_ACCOUNT_KEY;

      if (!commAccountKey) {
        throw new Error('Commercial storage configuration missing');
      }

      const sharedKeyCredential = new ShareSharedKeyCredential(commAccountName, commAccountKey);

      const startDate = new Date();
      startDate.setMinutes(startDate.getMinutes() - 5);
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 60);

      const sasOptions = {
        services: AccountSASServices.parse("f").toString(),
        resourceTypes: AccountSASResourceTypes.parse("sco").toString(),
        permissions: AccountSASPermissions.parse("rcw"), // Read, Create, Write
        startsOn: startDate,
        expiresOn: expiryDate,
        protocol: SASProtocol.Https,
      };

      const sasToken = generateAccountSASQueryParameters(sasOptions, sharedKeyCredential).toString();

      return {
        sasToken: `?${sasToken}`,
        url: `https://${commAccountName}.file.core.windows.net/${containerName}?${sasToken}`,
        accountName: commAccountName,
        containerName,
        expiresOn: expiryDate,
        serviceType: 'file'
      };
    }

    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'vocprojectstorage';
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

    if (!accountKey) {
      throw new Error('Azure Storage configuration missing (Account Key)');
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() - 5);
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 60);

    const permissions = ContainerSASPermissions.parse("racwl");

    const sasOptions = {
      containerName,
      permissions,
      startsOn: startDate,
      expiresOn: expiryDate,
      protocol: SASProtocol.Https,
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();

    return {
      sasToken: `?${sasToken}`,
      url: `https://${accountName}.blob.core.windows.net/${containerName}?${sasToken}`,
      accountName,
      containerName,
      expiresOn: expiryDate,
      serviceType: 'blob'
    };
  }

  /**
   * Lista archivos y carpetas del Repositorio Comercial en Azure File Share
   */
  async listCommercialFiles(folderPath: string = ''): Promise<StorageFileItem[]> {
    const accountName = process.env.AZURE_AUTOCONSUMO_ACCOUNT_NAME || 'autoconsumofileserver';
    const accountKey = process.env.AZURE_AUTOCONSUMO_ACCOUNT_KEY;
    const shareName = process.env.AZURE_AUTOCONSUMO_CONTAINER_NAME || 'autoconsumoshared';

    if (!accountKey) {
      throw new Error('Storage configuration missing');
    }

    const credential = new ShareSharedKeyCredential(accountName, accountKey);
    const serviceClient = new ShareServiceClient(`https://${accountName}.file.core.windows.net`, credential);
    const shareClient = serviceClient.getShareClient(shareName);

    const directoryClient = folderPath ? shareClient.getDirectoryClient(folderPath) : shareClient.rootDirectoryClient;

    if (folderPath && !await directoryClient.exists()) {
      return [];
    }

    const files: StorageFileItem[] = [];
    for await (const entity of directoryClient.listFilesAndDirectories()) {
      files.push({
        name: entity.name,
        kind: entity.kind,
        size: entity.kind === 'file' ? entity.properties.contentLength : 0,
        lastModified: entity.kind === 'file' ? entity.properties.lastModified : undefined
      });
    }

    return files;
  }

  /**
   * Obtiene stream descargable de un archivo en el Repositorio Comercial
   */
  async getCommercialFileDownload(filePath: string) {
    const accountName = process.env.AZURE_AUTOCONSUMO_ACCOUNT_NAME || 'autoconsumofileserver';
    const accountKey = process.env.AZURE_AUTOCONSUMO_ACCOUNT_KEY;
    const shareName = process.env.AZURE_AUTOCONSUMO_CONTAINER_NAME || 'autoconsumoshared';

    if (!accountKey) {
      throw new Error('Storage configuration missing');
    }

    const credential = new ShareSharedKeyCredential(accountName, accountKey);
    const serviceClient = new ShareServiceClient(`https://${accountName}.file.core.windows.net`, credential);
    const shareClient = serviceClient.getShareClient(shareName);

    const lastSlash = filePath.lastIndexOf('/');
    const dirName = lastSlash > -1 ? filePath.substring(0, lastSlash) : '';
    const fileName = lastSlash > -1 ? filePath.substring(lastSlash + 1) : filePath;

    const dirClient = dirName ? shareClient.getDirectoryClient(dirName) : shareClient.rootDirectoryClient;
    const fileClient = dirClient.getFileClient(fileName);

    if (!await fileClient.exists()) {
      return null;
    }

    const downloadResponse = await fileClient.download();
    if (!downloadResponse.readableStreamBody) {
      return null;
    }

    return {
      fileName,
      contentType: downloadResponse.contentType || 'application/octet-stream',
      stream: downloadResponse.readableStreamBody
    };
  }
}

export const storageService = new StorageService();
