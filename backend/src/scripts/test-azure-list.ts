
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function listBlobs() {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'vocprojectstorage';
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const containerName = 'autoconsumoshared';
  const prefix = 'Comercial/Repositorio Comercial/';

  if (!accountKey) {
    console.error('No account key found');
    return;
  }

  console.log(`Listing blobs in container: ${containerName}`);
  console.log(`Prefix: ${prefix}`);
  console.log(`Account: ${accountName}`);

  try {
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );

    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Check if container exists
    const exists = await containerClient.exists();
    console.log(`Container exists: ${exists}`);

    if (!exists) return;

    let count = 0;
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      console.log(`- ${blob.name}`);
      count++;
      if (count >= 10) {
        console.log('... (limiting output to 10)');
        break;
      }
    }
    
    if (count === 0) {
        console.log('No blobs found with that prefix.');
        // Try listing root to see if we are close
        console.log('Listing first 10 blobs in container root:');
        let rootCount = 0;
        for await (const blob of containerClient.listBlobsFlat()) {
            console.log(`[Root] ${blob.name}`);
            rootCount++;
            if (rootCount >= 10) break;
        }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

listBlobs();
