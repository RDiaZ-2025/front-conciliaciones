import { useState, useEffect } from 'react';
import { BlobServiceClient } from '@azure/storage-blob';
import { getApiBaseUrl } from '../../services/baseApiService';
import type { LoadDocumentsState, UseLoadDocumentsReturn, Document, AzureDownloadConfig } from './types';
import JSZip from 'jszip';

const AZURE_CONFIG: AzureDownloadConfig = {
  sasToken: "sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2026-07-18T00:00:00Z&st=2025-07-17T12:00:00Z&spr=https&sig=5bOczB2JntgCnxgUF621l2zNepka4FohFR8hzCUuMt0%3D",
  containerName: "conciliacionesv1",
  storageAccountName: "autoconsumofileserver"
};

export const useLoadDocumentsOCbyUserView = (): UseLoadDocumentsReturn => {
  const [state, setState] = useState<LoadDocumentsState>({
    documents: [],
    loading: true,
    error: null,
    page: 0,
    rowsPerPage: 10,
    search: ''
  });

  const updateState = (updates: Partial<LoadDocumentsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const setSearch = (search: string) => {
    updateState({ search });
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    updateState({ page: newPage });
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateState({ 
      rowsPerPage: parseInt(event.target.value, 10),
      page: 0
    });
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/load-documents`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        let errorMsg = 'Error al obtener documentos subidos';
        if (response.status === 403) {
          errorMsg = 'No tienes permisos para ver los documentos subidos.';
        } else if (response.status === 401) {
          errorMsg = 'No estás autenticado. Por favor, inicia sesión.';
        }
        throw new Error(errorMsg);
      }
      
      const result = await response.json();
      const docs = result.data || result.documents || result.result || result;
      const sortedDocs = Array.isArray(docs) ? docs.sort((a, b) => {
        const dateA = new Date(a.Fecha || 0).getTime();
        const dateB = new Date(b.Fecha || 0).getTime();
        return dateB - dateA; // Newest first (descending order)
      }) : [];
      updateState({ 
        documents: sortedDocs,
        error: null
      });
    } catch (err: any) {
      updateState({ error: err.message });
    } finally {
      updateState({ loading: false });
    }
  };

  const handleDownload = async (idFolder: string): Promise<void> => {
    if (!idFolder) return;
    
    console.log('Starting download for ID:', idFolder);
    console.log('Azure Config:', {
      storageAccountName: AZURE_CONFIG.storageAccountName,
      containerName: AZURE_CONFIG.containerName,
      sasTokenLength: AZURE_CONFIG.sasToken.length
    });
    
    try {
      const blobService = new BlobServiceClient(
        `https://${AZURE_CONFIG.storageAccountName}.blob.core.windows.net/?${AZURE_CONFIG.sasToken}`
      );
      const containerClient = blobService.getContainerClient(AZURE_CONFIG.containerName);
      
      console.log('Successfully connected to Azure Blob Storage');
      
      // Convert ID to lowercase to match Azure storage
      const lowerIdFolder = idFolder.toLowerCase();
      
      // Try different possible folder path variations
       const possiblePaths = [
         `${lowerIdFolder}`, // Try just the ID first (most likely based on Azure structure)
         `${lowerIdFolder}/`,
         `salidadatosprocesados/${lowerIdFolder}`,
         `SalidaDatosProcesados/${lowerIdFolder}`,
         `salidadatosprocesados/${lowerIdFolder}/`,
         `SalidaDatosProcesados/${lowerIdFolder}/`,
         // Also try original case as fallback
         `${idFolder}`,
         `${idFolder}/`
       ];
      
      let blobs: string[] = [];
      let selectedPrefix: string | null = null;
      
      for (const folderPath of possiblePaths) {
         console.log('Searching for blobs with prefix:', folderPath);
         
         try {
           let foundInThisPath = 0;
           for await (const blob of containerClient.listBlobsFlat({ prefix: folderPath })) {
             console.log('Found blob:', blob.name);
             if (!blobs.includes(blob.name)) {
               blobs.push(blob.name);
               foundInThisPath++;
             }
           }
           
           console.log(`Found ${foundInThisPath} new blobs with prefix: ${folderPath}`);
           
           if (foundInThisPath > 0) {
             selectedPrefix = folderPath;
           }
           
           if (blobs.length > 0) {
             console.log(`Total blobs found so far: ${blobs.length}`);
             break; // Stop searching once we find files
           }
         } catch (pathError) {
           console.error(`Error searching with prefix ${folderPath}:`, pathError);
         }
       }
      
      console.log('Total unique blobs found:', blobs.length);
      
      if (blobs.length === 0) {
        // List first 20 blobs in container to help debug
        console.log('No blobs found with any prefix. Listing first 20 blobs in container for debugging:');
        try {
          let debugCount = 0;
          for await (const blob of containerClient.listBlobsFlat()) {
            console.log(`Container blob ${debugCount + 1}:`, blob.name);
            debugCount++;
            if (debugCount >= 20) break;
          }
          console.log(`Total blobs checked: ${debugCount}`);
        } catch (debugError) {
          console.error('Error listing container blobs for debugging:', debugError);
        }
        alert(`No se encontraron archivos para el ID: ${idFolder}. Revisa la consola para más detalles.`);
        return;
      }
      
      // Create a ZIP and add each blob content
      const zip = new JSZip();
      
      for (const blobName of blobs) {
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const downloadResponse = await blockBlobClient.download();
        const blobObj = await downloadResponse.blobBody;
        
        if (blobObj) {
          const arrayBuffer = await blobObj.arrayBuffer();
          const relativeName = (selectedPrefix && blobName.startsWith(selectedPrefix))
            ? blobName.substring(selectedPrefix.length).replace(/^\/+/, '')
            : (blobName.split('/').pop() || blobName);
          zip.file(relativeName, arrayBuffer);
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${idFolder}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading files:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        type: typeof err,
        idFolder: idFolder
      });
      
      if (err instanceof Error) {
        if (err.message.includes('403') || err.message.includes('Forbidden')) {
          alert('Error de permisos al acceder a Azure. Verifica el token SAS.');
        } else if (err.message.includes('404') || err.message.includes('NotFound')) {
          alert('Contenedor no encontrado en Azure. Verifica la configuración.');
        } else {
          alert(`Error al descargar los archivos: ${err.message}. Revisa la consola para más detalles.`);
        }
      } else {
        alert('Error desconocido al descargar los archivos. Revisa la consola para más detalles.');
      }
    }
  };

  const filteredDocs = state.documents.filter((doc: Document) => {
    const userName = typeof doc.UserName === 'string' ? doc.UserName : (doc.IdUser ? String(doc.IdUser) : '');
    const fileName = typeof doc.FileName === 'string' ? doc.FileName : (typeof doc.NombreArchivo === 'string' ? doc.NombreArchivo : '');
    const status = typeof doc.Status === 'string' ? doc.Status : '';
    
    return userName.toLowerCase().includes(state.search.toLowerCase()) ||
           fileName.toLowerCase().includes(state.search.toLowerCase()) ||
           status.toLowerCase().includes(state.search.toLowerCase());
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    state,
    handleChangePage,
    handleChangeRowsPerPage,
    setSearch,
    handleDownload,
    filteredDocs
  };
};