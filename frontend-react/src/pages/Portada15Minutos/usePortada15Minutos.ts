import { useState, useEffect } from 'react';
import { BlobServiceClient } from '@azure/storage-blob';
import { useAuth } from '../../contexts/AuthContext';
import { cover15MinuteService } from '../../services/cover15MinuteService';
import type { Portada15MinutosState, UsePortada15MinutosReturn, AzureConfig, CoverHistoryItem } from './types';

const AZURE_CONFIG: AzureConfig = {
  sasToken: "sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2026-07-18T00:00:00Z&st=2025-07-17T12:00:00Z&spr=https&sig=5bOczB2JntgCnxgUF621l2zNepka4FohFR8hzCUuMt0%3D",
  containerName: "conciliacionesv1",
  storageAccountName: "autoconsumofileserver"
};

export const usePortada15Minutos = (): UsePortada15MinutosReturn => {
  const { user } = useAuth();
  const [state, setState] = useState<Portada15MinutosState>({
    selectedFile: null,
    previewUrl: null,
    uploading: false,
    error: null,
    success: false,
    message: null
  });

  const [history, setHistory] = useState<CoverHistoryItem[]>([]);

  // State to force refresh of the image after upload
  const [imageRefreshTrigger, setImageRefreshTrigger] = useState<number>(Date.now());

  const currentImageUrl = `https://${AZURE_CONFIG.storageAccountName}.blob.core.windows.net/${AZURE_CONFIG.containerName}/15minutes/cover.png?${AZURE_CONFIG.sasToken}&t=${imageRefreshTrigger}`;

  const updateState = (updates: Partial<Portada15MinutosState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const fetchHistory = async () => {
    try {
      const response = await cover15MinuteService.getAllCovers();
      if (response.success) {
        // Append SAS token to URLs
        const historyWithSas = response.data.map((item: CoverHistoryItem) => ({
          ...item,
          url: `${item.url}?${AZURE_CONFIG.sasToken}`
        }));
        setHistory(historyWithSas);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

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

      // 1. Upload with random name for history
      const randomName = `15minutes/${crypto.randomUUID()}.png`;
      const randomBlobClient = containerClient.getBlockBlobClient(randomName);

      await randomBlobClient.uploadData(state.selectedFile, {
        blobHTTPHeaders: { blobContentType: state.selectedFile.type }
      });

      // 2. Upload as cover.png (fixed name)
      const fixedName = "15minutes/cover.png";
      const fixedBlobClient = containerClient.getBlockBlobClient(fixedName);

      // Upload the file, overwriting if it exists
      await fixedBlobClient.uploadData(state.selectedFile, {
        blobHTTPHeaders: { blobContentType: state.selectedFile.type }
      });

      // 3. Save record in database
      const uploaderLog = user ? `${user.name} (${user.email})` : 'Unknown User';
      // URL without SAS token for storage in DB
      const publicUrl = `https://${AZURE_CONFIG.storageAccountName}.blob.core.windows.net/${AZURE_CONFIG.containerName}/${randomName}`;

      await cover15MinuteService.saveCover(uploaderLog, publicUrl);

      updateState({
        uploading: false,
        success: true,
        message: "Imagen subida exitosamente.",
        // Keep the preview and file selected so the user sees what they uploaded
      });

      // Update the refresh trigger to reload the current image
      setImageRefreshTrigger(Date.now());
      fetchHistory();

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
    currentImageUrl,
    history,
    handleFileSelect,
    handleUpload,
    handleClear
  };
};