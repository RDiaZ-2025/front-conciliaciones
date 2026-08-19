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