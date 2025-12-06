import { useState } from 'react';
import { BlobServiceClient } from '@azure/storage-blob';
import type { Portada15MinutosState, UsePortada15MinutosReturn, AzureConfig } from './types';

const AZURE_CONFIG: AzureConfig = {
  sasToken: "sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2026-07-18T00:00:00Z&st=2025-07-17T12:00:00Z&spr=https&sig=5bOczB2JntgCnxgUF621l2zNepka4FohFR8hzCUuMt0%3D",
  containerName: "conciliacionesv1",
  storageAccountName: "autoconsumofileserver"
};

export const usePortada15Minutos = (): UsePortada15MinutosReturn => {
  const [state, setState] = useState<Portada15MinutosState>({
    selectedFile: null,
    previewUrl: null,
    uploading: false,
    error: null,
    success: false,
    message: null
  });

  const updateState = (updates: Partial<Portada15MinutosState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      
      updateState({
        selectedFile: file,
        previewUrl,
        error: null,
        success: false,
        message: null
      });
    }
  };

  const handleClear = () => {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }
    updateState({
      selectedFile: null,
      previewUrl: null,
      error: null,
      success: false,
      message: null
    });
  };

  const handleUpload = async () => {
    if (!state.selectedFile) {
      updateState({ error: "Por favor selecciona una imagen primero." });
      return;
    }

    updateState({ uploading: true, error: null, message: "Subiendo imagen..." });

    try {
      const blobServiceClient = new BlobServiceClient(
        `https://${AZURE_CONFIG.storageAccountName}.blob.core.windows.net?${AZURE_CONFIG.sasToken}`
      );

      const containerClient = blobServiceClient.getContainerClient(AZURE_CONFIG.containerName);
      
      // The path is fixed as requested: /15minutes/portrait.png
      const blobName = "15minutes/portrait.png";
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Upload the file, overwriting if it exists
      await blockBlobClient.uploadData(state.selectedFile, {
        blobHTTPHeaders: { blobContentType: state.selectedFile.type }
      });

      updateState({
        uploading: false,
        success: true,
        message: "Imagen subida exitosamente como portrait.png",
        // Keep the preview and file selected so the user sees what they uploaded
      });

    } catch (error: any) {
      console.error("Error uploading to Azure:", error);
      updateState({
        uploading: false,
        error: `Error al subir la imagen: ${error.message}`,
        success: false
      });
    }
  };

  return {
    state,
    handleFileSelect,
    handleUpload,
    handleClear
  };
};
