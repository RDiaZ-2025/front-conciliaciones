// Tipos para la página de Producción
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadDate: string;
}

export interface ProductionRequest {
  id: string;
  name: string;
  requestDate: string;
  department: string;
  contactPerson: string;
  assignedTeam: string;
  deliveryDate?: string;
  observations?: string;
  stage: string;
  files?: UploadedFile[];
}

export interface ProductionProps {
  darkMode?: boolean;
}

export interface FormData extends Omit<ProductionRequest, 'id' | 'requestDate'> {
  id?: string;
  requestDate?: string;
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

export interface UseProductionReturn {
  productionRequests: ProductionRequest[];
  loading: boolean;
  error: string | null;
  openDialog: boolean;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  snackbar: SnackbarState;
  setSnackbar: React.Dispatch<React.SetStateAction<SnackbarState>>;
  handleOpenDialog: (request?: ProductionRequest | null) => void;
  handleCloseDialog: () => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (e: React.ChangeEvent<{ name?: string; value: unknown }>) => void;
  handleSubmit: () => Promise<void>;
  handleDeleteRequest: (id: string) => Promise<void>;
  handleMoveRequest: (id: string) => Promise<void>;
  handleCloseSnackbar: () => void;
  fetchProductionRequests: () => Promise<void>;
}