export interface PDFValidationConfig {
  requiredLabels: string[];
  signatureCoords: Array<{ x: number; y: number }>;
  tolerance: number;
}