import { Injectable } from '@angular/core';
import { BlobServiceClient } from '@azure/storage-blob';
import * as XLSX from 'xlsx';
import { AzureConfig, ExcelValidationConfig, PDFValidationConfig, ValidationResult, RequiredCell } from './upload.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private AZURE_CONFIG: AzureConfig = {
    sasToken: "sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2026-07-18T00:00:00Z&st=2025-07-17T12:00:00Z&spr=https&sig=5bOczB2JntgCnxgUF621l2zNepka4FohFR8hzCUuMt0%3D",
    containerName: "conciliacionesv1",
    storageAccountName: "autoconsumofileserver"
  };

  private EXCEL_CONFIG: ExcelValidationConfig = {
    requiredSheet: "Valorización",
    requiredCells: [
      { row: 3, col: 2, label: "Agencia" },
      { row: 4, col: 2, label: "Cliente" },
      { row: 5, col: 2, label: "NIT" },
      { row: 6, col: 2, label: "Direccion" },
      { row: 7, col: 2, label: "Ciudad" },
      { row: 8, col: 2, label: "Persona Contacto" },
      { row: 9, col: 2, label: "Facturación E-mail" },
      { row: 10, col: 2, label: "Cargo" },
      { row: 13, col: 1, label: "MEDIO PUBLICITARIO" },
      { row: 13, col: 2, label: "CANAL / SERVICIO" },
      { row: 13, col: 22, label: "TOTAL NETO" },
    ]
  };

  constructor() { }

  async validateExcel(file: File): Promise<ValidationResult> {
    if (file.size === 0) {
      return {
        isValid: false,
        message: "❌ El archivo Excel (Valorización) está vacío. Por favor, selecciona un archivo válido con datos antes de continuar.",
        debugValues: []
      };
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          if (!workbook.SheetNames.includes(this.EXCEL_CONFIG.requiredSheet)) {
            return resolve({
              isValid: false,
              message: `❌ El archivo Excel debe contener la hoja llamada '${this.EXCEL_CONFIG.requiredSheet}'.`,
              debugValues: []
            });
          }

          const ws = workbook.Sheets[this.EXCEL_CONFIG.requiredSheet];
          let missing: string[] = [];
          let debugValues: string[] = [];

          for (const cell of this.EXCEL_CONFIG.requiredCells) {
            const cellRef = XLSX.utils.encode_cell({ r: cell.row - 1, c: cell.col });
            const value = ws[cellRef] ? ws[cellRef].v : null;
            debugValues.push(`${cell.label}: ${value}`);

            if (value === null || value === undefined || value === "") {
              missing.push(cell.label);
            }
          }

          if (missing.length > 0) {
            return resolve({
              isValid: false,
              message: `❌ El archivo Excel está incompleto. Faltan valores en: ${missing.join(", ")}`,
              debugValues
            });
          }

          return resolve({ isValid: true, debugValues });
        } catch (err: any) {
          return resolve({
            isValid: false,
            message: `❌ Error leyendo el archivo Excel: ${err.message}`,
            debugValues: []
          });
        }
      };

      reader.onerror = () => {
        resolve({
          isValid: false,
          message: "❌ Error leyendo el archivo Excel.",
          debugValues: []
        });
      };

      reader.readAsArrayBuffer(file);
    });
  }

  async validatePdf(file: File): Promise<ValidationResult> {
    if (file.size === 0) {
      return {
        isValid: false,
        message: "❌ El archivo PDF (Orden de Compra) está vacío. Por favor, selecciona un archivo PDF válido antes de continuar."
      };
    }

    const header = await file.slice(0, 5).arrayBuffer();
    const headerStr = String.fromCharCode(...new Uint8Array(header));

    if (!headerStr.startsWith("%PDF-")) {
      return {
        isValid: false,
        message: "❌ El archivo seleccionado no es un PDF válido (Orden de Compra). Por favor, selecciona un archivo PDF real."
      };
    }

    if (file.size < 1000) {
      return {
        isValid: false,
        message: "❌ El archivo PDF (Orden de Compra) parece estar dañado o incompleto. Por favor, selecciona un archivo PDF válido."
      };
    }

    return { isValid: true };
  }

  async uploadToAzure(file: File, path: string): Promise<boolean> {
    try {
      const blobService = new BlobServiceClient(
        `https://${this.AZURE_CONFIG.storageAccountName}.blob.core.windows.net/?${this.AZURE_CONFIG.sasToken}`
      );
      const containerClient = blobService.getContainerClient(this.AZURE_CONFIG.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(`${path}/${file.name}`);
      await blockBlobClient.uploadBrowserData(file);
      return true;
    } catch (err) {
      console.error('Azure Upload Error:', err);
      return false;
    }
  }

  async notifyN8N(payload: any): Promise<boolean> {
    try {
      const response = await fetch("https://renediaz2025.app.n8n.cloud/webhook/a4784977-134a-4f09-9ea3-04c85c5ba3b7", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return response.ok;
    } catch (err) {
      console.error('N8N Error:', err);
      return false;
    }
  }

  async registerInDatabase(payload: any): Promise<boolean> {
    try {
      const response = await fetch(`${environment.apiUrl}/load-documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(payload)
      });
      return response.ok;
    } catch (err) {
      console.error('Database Registration Error:', err);
      return false;
    }
  }
}
