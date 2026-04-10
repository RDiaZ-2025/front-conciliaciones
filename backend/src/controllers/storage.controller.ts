import { Request, Response } from 'express';
import { StorageSharedKeyCredential, generateBlobSASQueryParameters, ContainerSASPermissions, SASProtocol } from '@azure/storage-blob';
import {
  StorageSharedKeyCredential as ShareSharedKeyCredential,
  generateAccountSASQueryParameters,
  AccountSASPermissions,
  AccountSASServices,
  AccountSASResourceTypes,
  ShareServiceClient
} from '@azure/storage-file-share';
import { asyncHandler } from "../utils/asyncHandler";

export class StorageController {
  generateSasToken = asyncHandler(async (req: Request, res: Response) => {
    const allowedContainers = ['private', 'public', 'autoconsumoshared'];
    let containerName = req.query.container as string;

    if (!containerName || !allowedContainers.includes(containerName)) {
      containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'private';
    }

    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'vocprojectstorage';
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

    if (!accountKey) {
      return res.status(500).json({
        success: false,
        message: 'Azure Storage configuration missing (Account Key)'
      });
    }

    if (containerName === 'autoconsumoshared') {
      const user = (req as any).user;
      if (!user || !user.permissions || !user.permissions.includes('view_commercial')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: view_commercial permission required'
        });
      }

      const sharedKeyCredential = new ShareSharedKeyCredential(accountName, accountKey);

      const startDate = new Date();
      startDate.setMinutes(startDate.getMinutes() - 5);
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 60);

      const sasOptions = {
        services: AccountSASServices.parse("f").toString(),
        resourceTypes: AccountSASResourceTypes.parse("sco").toString(),
        permissions: AccountSASPermissions.parse("racwdl"),
        startsOn: startDate,
        expiresOn: expiryDate,
        protocol: SASProtocol.Https,
      };

      const sasToken = generateAccountSASQueryParameters(sasOptions, sharedKeyCredential).toString();

      return res.status(200).json({
        success: true,
        data: {
          sasToken: `?${sasToken}`,
          url: `https://${accountName}.file.core.windows.net/${containerName}?${sasToken}`,
          accountName,
          containerName,
          expiresOn: expiryDate,
          serviceType: 'file'
        }
      });
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() - 5);

    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 60);

    const permissions = ContainerSASPermissions.parse("racwdl");

    const sasOptions = {
      containerName,
      permissions,
      startsOn: startDate,
      expiresOn: expiryDate,
      protocol: SASProtocol.Https,
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();

    return res.status(200).json({
      success: true,
      data: {
        sasToken: `?${sasToken}`,
        url: `https://${accountName}.blob.core.windows.net/${containerName}?${sasToken}`,
        accountName,
        containerName,
        expiresOn: expiryDate,
        serviceType: 'blob'
      }
    });
  });

  listCommercialFiles = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user || !user.permissions || !user.permissions.includes('view_commercial')) {
      return res.status(403).json({ success: false, message: 'Access denied: view_commercial permission required' });
    }

    const accountName = process.env.AZURE_AUTOCONSUMO_ACCOUNT_NAME || 'autoconsumofileserver';
    const accountKey = process.env.AZURE_AUTOCONSUMO_ACCOUNT_KEY;
    const shareName = process.env.AZURE_AUTOCONSUMO_CONTAINER_NAME || 'autoconsumoshared';

    if (!accountKey) {
      return res.status(500).json({ success: false, message: 'Storage configuration missing' });
    }

    const credential = new ShareSharedKeyCredential(accountName, accountKey);
    const serviceClient = new ShareServiceClient(`https://${accountName}.file.core.windows.net`, credential);
    const shareClient = serviceClient.getShareClient(shareName);
    const folderPath = req.query.path as string || '';

    const directoryClient = folderPath ? shareClient.getDirectoryClient(folderPath) : shareClient.rootDirectoryClient;
    console.log('Directory client created:', directoryClient);

    console.log('Checking if directory exists:', folderPath);
    if (folderPath && !await directoryClient.exists()) {
      return res.json({ success: true, data: [] });
    }

    const files = [];
    for await (const entity of directoryClient.listFilesAndDirectories()) {
      files.push({
        name: entity.name,
        kind: entity.kind,
        size: entity.kind === 'file' ? entity.properties.contentLength : 0,
        lastModified: entity.kind === 'file' ? entity.properties.lastModified : undefined
      });
    }

    return res.json({ success: true, data: files });
  });

  downloadCommercialFile = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user || !user.permissions || !user.permissions.includes('view_commercial')) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ message: 'Path required' });

    const accountName = process.env.AZURE_AUTOCONSUMO_ACCOUNT_NAME || 'autoconsumofileserver';
    const accountKey = process.env.AZURE_AUTOCONSUMO_ACCOUNT_KEY;
    const shareName = process.env.AZURE_AUTOCONSUMO_CONTAINER_NAME || 'autoconsumoshared';

    if (!accountKey) {
      return res.status(500).send('Storage configuration missing');
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
      return res.status(404).send('File not found');
    }

    const downloadResponse = await fileClient.download();

    if (!downloadResponse.readableStreamBody) {
      return res.status(404).send('File content not available');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', downloadResponse.contentType || 'application/octet-stream');

    downloadResponse.readableStreamBody.pipe(res);
    return res;
  });
}
