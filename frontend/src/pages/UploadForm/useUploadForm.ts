import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BlobServiceClient } from '@azure/storage-blob';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import type { UploadFormProps, UploadFormState, UseUploadFormReturn, RequiredCell, ValidationResult, AzureConfig, PDFValidationConfig, ExcelValidationConfig } from './types';

GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';

const AZURE_CONFIG: AzureConfig = {
  sasToken: "sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2026-07-18T00:00:00Z&st=2025-07-17T12:00:00Z&spr=https&sig=5bOczB2JntgCnxgUF621l2zNepka4FohFR8hzCUuMt0%3D",
  containerName: "conciliacionesv1",
  storageAccountName: "autoconsumofileserver"
};

const EXCEL_CONFIG: ExcelValidationConfig = {
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

const PDF_CONFIG: PDFValidationConfig = {
  requiredLabels: [
    "Agencia",
    "Cliente",
    "NIT",
    "Direccion",
    "Ciudad",
    "Persona Contacto",
    "Facturación E-mail",
    "Cargo",
    "MEDIO PUBLICITARIO",
    "CANAL / SERVICIO",
    "TOTAL NETO"
  ],
  signatureCoords: [
    { x: 152.5, y: 584.5 },
    { x: 443.5, y: 584.5 }
  ],
  tolerance: 80
};

const steps = [
  "Tipo de Usuario",
  "Subir Excel", 
  "Subir PDF",
  "Materiales y Confirmación"
];

export const useUploadForm = (props: UploadFormProps): UseUploadFormReturn => {
  const { user } = useAuth();
  const [state, setState] = useState<UploadFormState>({
    tipoUsuario: null,
    excelFile: null,
    pdfFile: null,
    excelUploaded: false,
    pdfUploaded: false,
    materiales: [],
    deseaSubirMateriales: null,
    message: "",
    pdfWarning: "",
    uploading: false,
    debugExcelValues: [],
    debugPdfText: "",
    activeStep: 0,
    pdfThumbnail: null,
    envioExitoso: false,
    manualPdfConfirmation: null,
    uploadCompleted: false
  });

  const updateState = (updates: Partial<UploadFormState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const setTipoUsuario = (tipo: 'cliente' | 'agencia' | null) => {
    updateState({ tipoUsuario: tipo });
  };

  const setActiveStep = (step: number) => {
    updateState({ activeStep: step });
  };

  const setMessage = (message: string) => {
    updateState({ message });
  };

  const setPdfWarning = (pdfWarning: string) => {
    updateState({ pdfWarning });
  };

  const setManualPdfConfirmation = (manualPdfConfirmation: boolean | null) => {
    updateState({ manualPdfConfirmation });
  };

  const setUploadCompleted = (uploadCompleted: boolean) => {
    updateState({ uploadCompleted });
  };

  const setDeseaSubirMateriales = (deseaSubirMateriales: boolean | null) => {
    updateState({ deseaSubirMateriales });
  };

  const setMateriales = (materiales: File[]) => {
    updateState({ materiales });
  };

  const validateExcel = async (file: File): Promise<ValidationResult> => {
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
          
          if (!workbook.SheetNames.includes(EXCEL_CONFIG.requiredSheet)) {
            return resolve({
              isValid: false,
              message: `❌ El archivo Excel debe contener la hoja llamada '${EXCEL_CONFIG.requiredSheet}'.`,
              debugValues: []
            });
          }

          const ws = workbook.Sheets[EXCEL_CONFIG.requiredSheet];
          let missing: string[] = [];
          let debugValues: string[] = [];

          for (const cell of EXCEL_CONFIG.requiredCells) {
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
  };

  const validatePdf = async (file: File): Promise<ValidationResult> => {
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
  };

  const uploadToAzure = async (file: File, path: string): Promise<boolean> => {
    try {
      const blobService = new BlobServiceClient(
        `https://${AZURE_CONFIG.storageAccountName}.blob.core.windows.net/?${AZURE_CONFIG.sasToken}`
      );
      const containerClient = blobService.getContainerClient(AZURE_CONFIG.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(`${path}/${file.name}`);
      await blockBlobClient.uploadBrowserData(file);
      return true;
    } catch (err) {
      return false;
    }
  };

  const generatePdfThumbnail = async (file: File): Promise<string | null> => {
    try {
      const fileUrl = URL.createObjectURL(file);
      return fileUrl;
    } catch {
      return null;
    }
  };

  const handleExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    updateState({ 
      excelFile: null, 
      excelUploaded: false, 
      debugExcelValues: [], 
      message: "" 
    });
    
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setMessage("❌ Solo se permiten archivos Excel con extensión .xlsx (Microsoft Excel Open XML). Por favor, selecciona un archivo válido.");
      return;
    }

    updateState({ excelFile: file });
    const validation = await validateExcel(file);
    
    if (!validation.isValid) {
      setMessage(validation.message!);
      updateState({ debugExcelValues: validation.debugValues || [] });
      return;
    }

    updateState({ uploading: true });
    const uploaded = await uploadToAzure(file, "EntradaDatosParaProcesar");
    
    if (uploaded) {
      updateState({ 
        excelUploaded: true, 
        debugExcelValues: validation.debugValues || [],
        message: "✅ Excel subido correctamente." 
      });
    } else {
      updateState({ 
        excelUploaded: false,
        message: "❌ Error al subir el Excel a Azure." 
      });
    }
    
    updateState({ uploading: false });
  };

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    updateState({ 
      pdfFile: file || null, 
      message: "", 
      debugPdfText: "", 
      pdfUploaded: false, 
      pdfWarning: "" 
    });
    
    if (!file) return;

    const validation = await validatePdf(file);
    
    if (!validation.isValid) {
      setMessage(validation.message!);
      return;
    }

    updateState({ uploading: true });
    const uploaded = await uploadToAzure(file, "EntradaDatosParaProcesar");
    
    if (uploaded) {
      updateState({ 
        pdfUploaded: true,
        uploading: false 
      });
    } else {
      updateState({ 
        pdfUploaded: false,
        uploading: false,
        message: "❌ Error al subir el PDF a Azure." 
      });
    }
    
    updateState({ uploading: false });
  };

  const handleMaterialesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setMateriales(files);
  };

  const handleNotifyN8N = async () => {
    updateState({ uploading: true, message: "" });
    let n8nOk = false;
    let dbOk = false;
    let uuid = crypto.randomUUID();
    
    try {
      const n8nResponse = await fetch("https://renediaz2025.app.n8n.cloud/webhook-test/a4784977-134a-4f09-9ea3-04c85c5ba3b7", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoUsuario: state.tipoUsuario,
          archivos: [state.excelFile?.name, state.pdfFile?.name],
          deseaSubirMateriales: state.deseaSubirMateriales,
          materiales: state.materiales.map(f => f.name),
          id: uuid,
          data: state.debugExcelValues.reduce((acc, curr) => {
            const [key, ...rest] = curr.split(":");
            acc[key.trim()] = rest.join(":").trim();
            return acc;
          }, {} as Record<string, string>),
        })
      });
      
      if (!n8nResponse.ok) {
        setMessage("❌ Error: No se pudo notificar a n8n. Verifica la conexión o el flujo externo.");
        updateState({ uploading: false });
        return;
      }
      
      n8nOk = true;
      setMessage("✅ Notificación a n8n exitosa. Registrando en base de datos...");
      
      const userId = user?.id || 1;
      const folderId = uuid;
      const fecha = new Date().toISOString();
      const status = "uploaded";
      
      const response = await fetch("/api/load-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          iduser: userId,
          idfolder: folderId,
          fecha,
          status,
          filename: state.excelFile?.name || state.pdfFile?.name || ""
        })
      });
      
      if (!response.ok) {
        setMessage("✅ Notificación a n8n exitosa. ❌ Error al registrar en base de datos.");
        updateState({ uploading: false });
        return;
      }
      
      dbOk = true;
      setMessage("✅ Notificación a n8n exitosa. ✅ Registro en base de datos exitoso.");
      updateState({ envioExitoso: true });
    } catch (err: any) {
      if (!n8nOk) {
        setMessage("❌ Error al notificar a n8n: " + err.message);
      } else if (!dbOk) {
        setMessage("✅ Notificación a n8n exitosa. ❌ Error al registrar en base de datos: " + err.message);
      } else {
        setMessage("❌ Error inesperado: " + err.message);
      }
    }
    
    updateState({ uploading: false });
  };

  useEffect(() => {
    if (props.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    
    return () => {
      document.body.classList.remove('dark-mode');
    };
  }, [props.darkMode]);

  useEffect(() => {
    let cancelled = false;
    
    const generateThumbnail = async () => {
      if (!state.pdfFile) {
        updateState({ pdfThumbnail: null });
        return;
      }
      
      const thumbnail = await generatePdfThumbnail(state.pdfFile);
      if (!cancelled) {
        updateState({ pdfThumbnail: thumbnail });
      }
    };
    
    generateThumbnail();
    return () => { cancelled = true; };
  }, [state.pdfFile]);

  useEffect(() => {
    if (state.manualPdfConfirmation === true && state.pdfUploaded) {
      setTimeout(() => {
        const siguienteButton = document.getElementById('siguiente-button');
        if (siguienteButton) {
          const buttonRect = siguienteButton.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          
          if (buttonRect.bottom > windowHeight || buttonRect.top < 0) {
            const targetPosition = window.pageYOffset + buttonRect.top - (windowHeight / 2) + (buttonRect.height / 2);
            
            window.scrollTo({
              top: Math.max(0, targetPosition),
              behavior: 'smooth'
            });
          }
        }
      }, 500);
    }
  }, [state.manualPdfConfirmation, state.pdfUploaded]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [state.activeStep]);

  return {
    state,
    handleExcelChange,
    handlePdfChange,
    handleMaterialesChange,
    handleNotifyN8N,
    setTipoUsuario,
    setActiveStep,
    setMessage,
    setPdfWarning,
    setManualPdfConfirmation,
    setUploadCompleted,
    setDeseaSubirMateriales,
    setMateriales
  };
};