import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import axios from 'axios';
import { ProductionRequest, FormData, SnackbarState, UseProductionReturn } from './types';

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
  const handleOpenDialog = (request: ProductionRequest | null = null) => {
    if (request) {
      setFormData(request);
    } else {
      setFormData({
        ...initialFormData,
      });
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

  // Handle form submit
  const handleSubmit = async () => {
    try {
      if (formData.id) {
        // Update existing request
        await axios.put(`${API_BASE_URL}/production/${formData.id}`, formData, {
          headers: getAuthHeaders()
        });
        setSnackbar({
          open: true,
          message: 'Solicitud actualizada correctamente',
          severity: 'success'
        });
        
        // Update local state
        setProductionRequests(prev => 
          prev.map(req => req.id === formData.id ? { ...formData as ProductionRequest } : req)
        );
      } else {
        // Create new request
        const newRequest: ProductionRequest = {
          ...formData as Omit<ProductionRequest, 'id' | 'requestDate'>,
          id: Date.now().toString(), // Temporary ID for mock data
          requestDate: new Date().toISOString(),
          stage: 'request'
        };
        
        // In a production environment, the server would return the created request with a proper ID
        await axios.post(`${API_BASE_URL}/production`, newRequest, {
          headers: getAuthHeaders()
        });
        
        // Add to local state
        setProductionRequests(prev => [...prev, newRequest]);
        
        setSnackbar({
          open: true,
          message: 'Solicitud creada correctamente',
          severity: 'success'
        });
      }
      
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
        if (formData.id) {
          setProductionRequests(prev => 
            prev.map(req => req.id === formData.id ? { ...formData as ProductionRequest } : req)
          );
        } else {
          const newRequest: ProductionRequest = {
            ...formData as Omit<ProductionRequest, 'id' | 'requestDate'>,
            id: Date.now().toString(),
            requestDate: new Date().toISOString(),
            stage: 'request'
          };
          setProductionRequests(prev => [...prev, newRequest]);
        }
        
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
    handleOpenDialog,
    handleCloseDialog,
    handleInputChange,
    handleSelectChange,
    handleSubmit,
    handleMoveRequest,
    handleDeleteRequest,
    handleCloseSnackbar,
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