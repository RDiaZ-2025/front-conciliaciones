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
  guid: string | null;
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

export interface AzureConfig {
  sasToken: string;
  containerName: string;
  storageAccountName: string;
}

export interface ExcelValidationConfig {
  requiredSheet: string;
  requiredCells: RequiredCell[];
}

export interface PDFValidationConfig {
  requiredLabels: string[];
  signatureCoords: Array<{ x: number; y: number }>;
  tolerance: number;
}
