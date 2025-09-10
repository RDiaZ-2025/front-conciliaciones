import { useState, useEffect } from 'react';
import { BlobServiceClient } from '@azure/storage-blob';
import { getApiBaseUrl } from '../../services/baseApiService';
import type { LoadDocumentsState, UseLoadDocumentsReturn, Document, AzureDownloadConfig } from './types';

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
      updateState({ 
        documents: Array.isArray(docs) ? docs : [],
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
    
    try {
      const blobService = new BlobServiceClient(
        `https://${AZURE_CONFIG.storageAccountName}.blob.core.windows.net/?${AZURE_CONFIG.sasToken}`
      );
      const containerClient = blobService.getContainerClient(AZURE_CONFIG.containerName);
      
      const folderPath = `SalidaDatosProcesados/${idFolder}`;
      let blobs: string[] = [];
      
      for await (const blob of containerClient.listBlobsFlat({ prefix: folderPath })) {
        blobs.push(blob.name);
      }
      
      if (blobs.length === 0) {
        alert("No se encontraron archivos en la carpeta de Azure.");
        return;
      }
      
      for (const blobName of blobs) {
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
    } catch (err: any) {
      alert("Error al descargar archivos de Azure: " + err.message);
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