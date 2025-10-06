import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import axios from 'axios';
import { ProductionRequest, FormData, SnackbarState, UseProductionReturn, UploadedFile } from './types';
import { azureStorageService, AzureStorageService, UploadResult } from '../../services/azureStorageService';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Initial form data
const initialFormData: FormData = {
  name: '',
  department: '',
  contactPerson: '',
  assignedTeam: '',
  deliveryDate: '',
  observations: '',
  stage: 'request'
};

// API base URL - should be configured from environment variables
const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:22741';

export const useProduction = (): UseProductionReturn => {
  const [productionRequests, setProductionRequests] = useState<ProductionRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Fetch production requests
  const fetchProductionRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/production`, {
        headers: getAuthHeaders()
      });
      setProductionRequests(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching production requests:', err);
      setError('Error al cargar las solicitudes de producción');
      // For development, use mock data if API fails
      setProductionRequests(mockProductionRequests);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load production requests on component mount
  useEffect(() => {
    fetchProductionRequests();
  }, [fetchProductionRequests]);

  // Handle dialog open
  const handleOpenDialog = async (request: ProductionRequest | null = null) => {
    if (request) {
      setFormData(request);
      // Fetch existing files from Azure Storage
      if (request.id) {
        try {
          const existingFiles = await fetchExistingFiles(request.id);
          // Convert existing files to File objects for the FileUpload component
          const fileObjects: File[] = [];
          // For now, we'll just clear the uploaded files and show the existing ones in the request data
          setUploadedFiles(fileObjects);
          // Update the form data with the actual files from storage
          setFormData(prev => ({ ...prev, files: existingFiles }));
        } catch (error) {
          console.error('Error loading existing files:', error);
        }
      }
    } else {
      setFormData({
        ...initialFormData,
      });
      setUploadedFiles([]);
    }
    setOpenDialog(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(initialFormData);
  };
  
  // Handle input change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select change
  const handleSelectChange = (e: ChangeEvent<{ name?: string; value: unknown }>) => {
    const name = e.target.name as string;
    const value = e.target.value as string;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handle file upload
  const handleFileUpload = (files: File[]) => {
    setUploadedFiles(files);
  };

  // Fetch existing files from Azure Storage
  const fetchExistingFiles = async (requestId: string): Promise<UploadedFile[]> => {
    try {
      const folderPath = AzureStorageService.generateProductionFolderPath(requestId);
      const filesDetails = await azureStorageService.getFilesDetails(folderPath);
      return filesDetails;
    } catch (error) {
      console.error('Error fetching existing files:', error);
      return [];
    }
  };

  // Upload files to Azure Storage
  const uploadFilesToAzure = async (requestId: string, files: File[]): Promise<UploadedFile[]> => {
    if (files.length === 0) return [];

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const folderPath = AzureStorageService.generateProductionFolderPath(requestId);
      const uploadResults: UploadResult[] = await azureStorageService.uploadFiles(files, {
        folderPath,
        metadata: {
          requestId,
          uploadedBy: 'current-user', // Replace with actual user info
          uploadType: 'production'
        }
      });

      const uploadedFiles: UploadedFile[] = uploadResults.map((result, index) => ({
        id: `${requestId}-${Date.now()}-${index}`,
        name: result.fileName,
        size: files[index].size,
        type: files[index].type,
        url: result.url,
        uploadDate: new Date().toISOString()
      }));

      // Check for failed uploads
      const failedUploads = uploadResults.filter(result => !result.success);
      if (failedUploads.length > 0) {
        setSnackbar({
          open: true,
          message: `${failedUploads.length} archivo(s) no se pudieron subir`,
          severity: 'warning'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Archivos subidos correctamente',
          severity: 'success'
        });
      }

      setUploadProgress(100);
      return uploadedFiles;
    } catch (error) {
      console.error('Error uploading files:', error);
      setSnackbar({
        open: true,
        message: 'Error al subir los archivos',
        severity: 'error'
      });
      return [];
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  // Download files from Azure Storage
  const downloadFilesFromAzure = async (requestId: string) => {
    try {
      const folderPath = AzureStorageService.generateProductionFolderPath(requestId);
      await azureStorageService.downloadFiles({ folderPath });
      
      setSnackbar({
        open: true,
        message: 'Archivos descargados correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error downloading files:', error);
      setSnackbar({
        open: true,
        message: 'Error al descargar los archivos',
        severity: 'error'
      });
    }
  };

  // Download single file from Azure Storage
  const downloadSingleFile = async (fileId: string, fileName: string) => {
    try {
      await azureStorageService.downloadSingleFile(fileId, fileName);
      setSnackbar({
        open: true,
        message: `Archivo ${fileName} descargado exitosamente`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      setSnackbar({
        open: true,
        message: `Error al descargar el archivo ${fileName}`,
        severity: 'error'
      });
    }
  };

  // Handle form submit
  const handleSubmit = async () => {
    try {
      let requestId = formData.id;
      let uploadedFilesList: UploadedFile[] = [];

      if (formData.id) {
        // Update existing request
        await axios.put(`${API_BASE_URL}/production/${formData.id}`, formData, {
          headers: getAuthHeaders()
        });
        
        // Upload files if any
        if (uploadedFiles.length > 0) {
          uploadedFilesList = await uploadFilesToAzure(String(formData.id), uploadedFiles);
        }
        
        // Update local state with files
        const updatedRequest = { 
          ...formData as ProductionRequest, 
          files: [...(formData.files || []), ...uploadedFilesList]
        };
        
        setProductionRequests(prev => 
          prev.map(req => req.id === formData.id ? updatedRequest : req)
        );
        
        setSnackbar({
          open: true,
          message: 'Solicitud actualizada correctamente',
          severity: 'success'
        });
      } else {
        // Create new request
        const { files, id, requestDate, stage, ...requestData } = formData;
        const requestPayload = {
          ...requestData
        };
        
        // Create the request on the server and get the actual ID
        const response = await axios.post(`${API_BASE_URL}/production`, requestPayload, {
          headers: getAuthHeaders()
        });
        
        const createdRequest = response.data;
        requestId = createdRequest.id.toString();
        
        // Upload files if any using the actual request ID
        if (uploadedFiles.length > 0) {
          uploadedFilesList = await uploadFilesToAzure(requestId, uploadedFiles);
          createdRequest.files = uploadedFilesList;
        }
        
        // Add to local state with the actual request from server
        setProductionRequests(prev => [...prev, createdRequest]);
        
        setSnackbar({
          open: true,
          message: 'Solicitud creada correctamente',
          severity: 'success'
        });
      }
      
      // Clear uploaded files and close dialog
      setUploadedFiles([]);
      handleCloseDialog();
    } catch (err) {
      console.error('Error submitting production request:', err);
      setSnackbar({
        open: true,
        message: 'Error al guardar la solicitud',
        severity: 'error'
      });
      
      // For development only - in production, we would not update the state on error
      if (process.env.NODE_ENV === 'development') {
        let uploadedFilesList: UploadedFile[] = [];
        
        if (formData.id) {
          // Upload files if any
          if (uploadedFiles.length > 0) {
            uploadedFilesList = await uploadFilesToAzure(String(formData.id), uploadedFiles);
          }
          
          const updatedRequest = { 
            ...formData as ProductionRequest, 
            files: [...(formData.files || []), ...uploadedFilesList]
          };
          
          setProductionRequests(prev => 
            prev.map(req => req.id === formData.id ? updatedRequest : req)
          );
        } else {
          const newRequest: ProductionRequest = {
            ...formData as Omit<ProductionRequest, 'id' | 'requestDate'>,
            id: Date.now().toString(),
            requestDate: new Date().toISOString(),
            stage: 'request',
            files: []
          };
          
          // Upload files if any
          if (uploadedFiles.length > 0) {
            uploadedFilesList = await uploadFilesToAzure(newRequest.id, uploadedFiles);
            newRequest.files = uploadedFilesList;
          }
          
          setProductionRequests(prev => [...prev, newRequest]);
        }
        
        // Clear uploaded files and close dialog
        setUploadedFiles([]);
        handleCloseDialog();
      }
    }
  };

  // Workflow stages definition
  const workflowStages = [
    'request',
    'quotation',
    'material_adjustment',
    'pre_production',
    'in_production',
    'in_editing',
    'delivered_approval',
    'client_approved',
    'completed'
  ];

  // Handle move request to next stage
  const handleMoveRequest = async (requestId: string) => {
    try {
      const request = productionRequests.find(req => req.id === requestId);
      if (!request) return;

      const currentStageIndex = workflowStages.indexOf(request.stage);
      if (currentStageIndex === -1 || currentStageIndex === workflowStages.length - 1) return;

      const nextStage = workflowStages[currentStageIndex + 1];
      const updatedRequest = { ...request, stage: nextStage };

      await axios.put(`${API_BASE_URL}/production/${requestId}/move`, { stage: nextStage }, {
        headers: getAuthHeaders()
      });
      
      // Update local state
      setProductionRequests(prev => 
        prev.map(req => req.id === requestId ? updatedRequest : req)
      );

      setSnackbar({
        open: true,
        message: `Solicitud movida a ${getStageLabel(nextStage)}`,
        severity: 'success'
      });
    } catch (err) {
      console.error('Error moving production request:', err);
      setSnackbar({
        open: true,
        message: 'Error al mover la solicitud',
        severity: 'error'
      });
      
      // For development only - in production, we would not update the state on error
      if (process.env.NODE_ENV === 'development') {
        const request = productionRequests.find(req => req.id === requestId);
        if (!request) return;

        const currentStageIndex = workflowStages.indexOf(request.stage);
        if (currentStageIndex === -1 || currentStageIndex === workflowStages.length - 1) return;

        const nextStage = workflowStages[currentStageIndex + 1];
        const updatedRequest = { ...request, stage: nextStage };
        
        // Update local state
        setProductionRequests(prev => 
          prev.map(req => req.id === requestId ? updatedRequest : req)
        );
      }
    }
  };

  // Handle delete request
  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta solicitud?')) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/production/${requestId}`, {
        headers: getAuthHeaders()
      });
      
      // Update local state
      setProductionRequests(prev => prev.filter(req => req.id !== requestId));

      setSnackbar({
        open: true,
        message: 'Solicitud eliminada correctamente',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error deleting production request:', err);
      setSnackbar({
        open: true,
        message: 'Error al eliminar la solicitud',
        severity: 'error'
      });
      
      // For development only - in production, we would not update the state on error
      if (process.env.NODE_ENV === 'development') {
        setProductionRequests(prev => prev.filter(req => req.id !== requestId));
      }
    }
  };

  // Helper function to get stage label
  const getStageLabel = (stageId: string): string => {
    const stageMap = {
      'request': 'Solicitud',
      'quotation': 'Cotización',
      'material_adjustment': 'Ajuste de Material',
      'pre_production': 'Pre-producción',
      'in_production': 'En producción',
      'in_editing': 'En edición',
      'delivered_approval': 'Entregado para aprobación',
      'client_approved': 'Aprobado por cliente',
      'completed': 'Completado y entregado'
    };
    return stageMap[stageId] || stageId;
  };

  return {
    productionRequests,
    loading,
    error,
    openDialog,
    formData,
    setFormData,
    snackbar,
    setSnackbar,
    uploadedFiles,
    uploadProgress,
    isUploading,
    handleOpenDialog,
    handleCloseDialog,
    handleInputChange,
    handleSelectChange,
    handleSubmit,
    handleMoveRequest,
    handleDeleteRequest,
    handleCloseSnackbar,
    handleFileUpload,
    uploadFilesToAzure,
    downloadFilesFromAzure,
    downloadSingleFile,
    fetchProductionRequests
  };
};

// Mock data for development
const mockProductionRequests: ProductionRequest[] = [
  {
    id: '1',
    name: 'Campaña Publicitaria Q3',
    requestDate: '2023-07-15T10:30:00Z',
    department: 'Marketing',
    contactPerson: 'Ana Martínez',
    assignedTeam: 'Equipo Creativo A',
    deliveryDate: '2023-08-30',
    observations: 'Necesitamos enfocarnos en el nuevo producto estrella',
    stage: 'in_production'
  },
  {
    id: '2',
    name: 'Video Corporativo Anual',
    requestDate: '2023-06-20T14:15:00Z',
    department: 'Comunicación',
    contactPerson: 'Carlos Rodríguez',
    assignedTeam: 'Equipo Audiovisual',
    deliveryDate: '2023-09-15',
    observations: 'Debe incluir testimonios de los directivos',
    stage: 'pre_production'
  },
  {
    id: '3',
    name: 'Spot Televisivo Navidad',
    requestDate: '2023-08-05T09:45:00Z',
    department: 'Ventas',
    contactPerson: 'Laura Sánchez',
    assignedTeam: 'Equipo Creativo B',
    deliveryDate: '2023-11-20',
    observations: 'Formato de 30 segundos para prime time',
    stage: 'quotation'
  },
  {
    id: '4',
    name: 'Contenido Redes Sociales',
    requestDate: '2023-07-28T11:20:00Z',
    department: 'Marketing Digital',
    contactPerson: 'Miguel Torres',
    assignedTeam: 'Equipo Social Media',
    deliveryDate: '2023-08-15',
    stage: 'completed'
  },
  {
    id: '5',
    name: 'Documental Proceso Productivo',
    requestDate: '2023-08-10T16:30:00Z',
    department: 'Operaciones',
    contactPerson: 'Patricia Gómez',
    assignedTeam: 'Equipo Documental',
    deliveryDate: '2023-10-30',
    observations: 'Necesitamos acceso a todas las plantas de producción',
    stage: 'request'
  }
];