export interface UploadFormProps {
  onUploadComplete: () => void;
  onBackToLogin: () => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
  onGoToAdmin: () => void;
  onGoToDashboard: () => void;
  hideHeader?: boolean;
}

export interface UploadFormState {
  tipoUsuario: 'cliente' | 'agencia' | null;
  excelFile: File | null;
  pdfFile: File | null;
  excelUploaded: boolean;
  pdfUploaded: boolean;
  materiales: File[];
  deseaSubirMateriales: boolean | null;
  message: string;
  pdfWarning: string;
  uploading: boolean;
  debugExcelValues: string[];
  debugPdfText: string;
  activeStep: number;
  pdfThumbnail: string | null;
  envioExitoso: boolean;
  manualPdfConfirmation: boolean | null;
  uploadCompleted: boolean;
}

export interface RequiredCell {
  row: number;
  col: number;
  label: string;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  debugValues?: string[];
}

export interface UseUploadFormReturn {
  state: UploadFormState;
  handleExcelChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handlePdfChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleMaterialesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNotifyN8N: () => Promise<void>;
  setTipoUsuario: (tipo: 'cliente' | 'agencia' | null) => void;
  setActiveStep: (step: number) => void;
  setMessage: (message: string) => void;
  setPdfWarning: (warning: string) => void;
  setManualPdfConfirmation: (confirmation: boolean | null) => void;
  setUploadCompleted: (completed: boolean) => void;
  setDeseaSubirMateriales: (desea: boolean | null) => void;
  setMateriales: (materiales: File[]) => void;
}

export interface AzureConfig {
  sasToken: string;
  containerName: string;
  storageAccountName: string;
}

export interface PDFValidationConfig {
  requiredLabels: string[];
  signatureCoords: Array<{ x: number; y: number }>;
  tolerance: number;
}

export interface ExcelValidationConfig {
  requiredSheet: string;
  requiredCells: RequiredCell[];
}