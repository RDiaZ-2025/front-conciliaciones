import { Injectable, inject } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { ExcelValidationConfig, ValidationResult, RequiredCell } from '../pages/upload/upload.models';
import { environment } from '../../environments/environment';
import { AzureStorageService } from './azure-storage.service';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private azureService = inject(AzureStorageService);

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

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.getWorksheet(this.EXCEL_CONFIG.requiredSheet);
      if (!worksheet) {
        return {
          isValid: false,
          message: `❌ El archivo Excel debe contener la hoja llamada '${this.EXCEL_CONFIG.requiredSheet}'.`,
          debugValues: []
        };
      }

      let missing: string[] = [];
      let debugValues: string[] = [];

      for (const cell of this.EXCEL_CONFIG.requiredCells) {
        // cell.row is 1-based. cell.col is 0-based. ExcelJS uses 1-based indices for both row and column.
        const worksheetCell = worksheet.getCell(cell.row, cell.col + 1);
        let value = worksheetCell.value;

        // If the cell contains a formula, get the result of the formula
        if (value && typeof value === 'object') {
          if ('result' in value) {
            value = value.result;
          } else if ('text' in value) {
            value = value.text;
          }
        }

        debugValues.push(`${cell.label}: ${value}`);

        if (value === null || value === undefined || value === "") {
          missing.push(cell.label);
        }
      }

      if (missing.length > 0) {
        return {
          isValid: false,
          message: `❌ El archivo Excel está incompleto. Faltan valores en: ${missing.join(", ")}`,
          debugValues
        };
      }

      return { isValid: true, debugValues };
    } catch (err: any) {
      return {
        isValid: false,
        message: `❌ Error leyendo el archivo Excel: ${err.message}`,
        debugValues: []
      };
    }
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
      const blobName = `${path}/${file.name}`;
      return await this.azureService.uploadBlob(file, blobName);
    } catch (err) {
      console.error('Azure Upload Error:', err);
      return false;
    }
  }

  async notifyN8N(payload: any): Promise<boolean> {
    try {
      const response = await fetch(environment.uploadNotifyUrl, {
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
