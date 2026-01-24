import { Request, Response } from 'express';
import { StorageSharedKeyCredential, generateBlobSASQueryParameters, ContainerSASPermissions, SASProtocol } from '@azure/storage-blob';

export class StorageController {
  static async generateSasToken(req: Request, res: Response) {
    try {
      // Get container from query or env
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

      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

      // Set start and expiry time
      const startDate = new Date();
      startDate.setMinutes(startDate.getMinutes() - 5); // Allow for clock skew

      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 60); // Valid for 1 hour

      // Set permissions (Read, Add, Create, Write, Delete, List)
      // We use ContainerSASPermissions to include 'list' (l) permission which is needed for listing blobs
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
          expiresOn: expiryDate
        }
      });
    } catch (error) {
      console.error('Error generating SAS token:', error);
      return res.status(500).json({
        success: false,
        message: 'Error generating SAS token',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
