import React, { useState } from "react";
import { Box, Button, LinearProgress, Typography, Alert, Stepper, Step, StepLabel, Paper, Fade } from "@mui/material";
import { BlobServiceClient } from "@azure/storage-blob";
import claroMediaLogo from "../assets/Claro-Media-Logo.jpg";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf";

// Reemplaza el valor de sasToken con el nuevo token generado desde Azure
const sasToken = "sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2026-07-18T00:00:00Z&st=2025-07-17T12:00:00Z&spr=https&sig=5bOczB2JntgCnxgUF621l2zNepka4FohFR8hzCUuMt0%3D";
const containerName = "conciliacionesv1";
const storageAccountName = "autoconsumofileserver"; 

const REQUIRED_SHEET = "Valorización";
const REQUIRED_CELLS = [
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
];

const REQUIRED_PDF_LABELS = [
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
];

// Configuración recomendada para pdfjs-dist v5.x y Vite:
GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";

function validateExcel(file, setMessage, setDebugExcelValues) {
  if (file.size === 0) {
    setMessage("❌ El archivo Excel (Valorización) está vacío. Por favor, selecciona un archivo válido con datos antes de continuar.");
    setDebugExcelValues([]);
    return false;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        if (!workbook.SheetNames.includes(REQUIRED_SHEET)) {
          setMessage(
            `❌ El archivo Excel debe contener la hoja llamada '${REQUIRED_SHEET}'.`
          );
          setDebugExcelValues([]);
          return resolve(false);
        }
        const ws = workbook.Sheets[REQUIRED_SHEET];
        let missing = [];
        let debugValues = [];
        for (const cell of REQUIRED_CELLS) {
          const cellRef = XLSX.utils.encode_cell({ r: cell.row - 1, c: cell.col });
          const value = ws[cellRef] ? ws[cellRef].v : null;
          debugValues.push(`${cell.label}: ${value}`);
          if (value === null || value === undefined || value === "") {
            missing.push(cell.label);
          }
        }
        setDebugExcelValues(debugValues);
        if (missing.length > 0) {
          setMessage(
            `❌ El archivo Excel está incompleto. Faltan valores en: ${missing.join(", ")}`
          );
          return resolve(false);
        }
        return resolve(true);
      } catch (err) {
        setMessage(`❌ Error leyendo el archivo Excel: ${err.message}`);
        setDebugExcelValues([]);
        return resolve(false);
      }
    };
    reader.onerror = () => {
      setMessage("❌ Error leyendo el archivo Excel.");
      setDebugExcelValues([]);
      resolve(false);
    };
    reader.readAsArrayBuffer(file);
  });
}

async function validatePdf(file, setMessage, setDebugPdfText) {
  if (file.size === 0) {
    setMessage("❌ El archivo PDF (Orden de Compra) está vacío. Por favor, selecciona un archivo PDF válido antes de continuar.");
    setDebugPdfText("");
    return false;
  }
  // Verifica header PDF
  const header = await file.slice(0, 5).arrayBuffer();
  const headerStr = String.fromCharCode(...new Uint8Array(header));
  if (!headerStr.startsWith("%PDF-")) {
    setMessage("❌ El archivo seleccionado no es un PDF válido (Orden de Compra). Por favor, selecciona un archivo PDF real.");
    setDebugPdfText("");
    return false;
  }
  // Extraer texto y validar etiquetas requeridas
  try {
    const pdfData = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(" ");
    setDebugPdfText(text);
    if (!text || text.trim().length === 0) {
      setMessage(
        "❌ El archivo PDF (Orden de Compra) no contiene información legible. Por favor, asegúrate de que el documento no sea solo una imagen escaneada y que incluya los campos requeridos."
      );
      return false;
    }
    const missing = REQUIRED_PDF_LABELS.filter(label => !text.includes(label));
    if (missing.length > 0) {
      setMessage(
        `❌ El archivo PDF (Orden de Compra) que intentas subir no cumple con el formato requerido.\n\nFaltan los siguientes campos obligatorios en la primera página: ${missing.join(", ")}.\n\nPor favor, revisa que el documento contenga todos los campos obligatorios y vuelve a intentarlo.`
      );
      return false;
    }
  } catch (err) {
    setMessage(
      "❌ No se pudo validar el archivo PDF (Orden de Compra). El sistema no pudo procesar el documento. Por favor, verifica que el archivo sea un PDF digital y vuelve a intentarlo. Si el problema persiste, contacta a soporte."
    );
    setDebugPdfText("");
    return false;
  }
  return true;
}

const steps = [
  "Subir Excel",
  "Subir PDF",
  "Materiales y Confirmación"
];

const UploadForm = () => {
  const [excelFile, setExcelFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [excelUploaded, setExcelUploaded] = useState(false);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [materiales, setMateriales] = useState([]);
  const [deseaSubirMateriales, setDeseaSubirMateriales] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [debugExcelValues, setDebugExcelValues] = useState([]);
  const [debugPdfText, setDebugPdfText] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  // Estado para la miniatura del PDF
  const [pdfThumbnail, setPdfThumbnail] = useState(null);
  const [envioExitoso, setEnvioExitoso] = useState(false);

  // Generar miniatura PDF cuando cambia pdfFile
  React.useEffect(() => {
    let cancelled = false;
    async function generateThumbnail() {
      if (!pdfFile) {
        setPdfThumbnail(null);
        return;
      }
      try {
        const pdfData = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setPdfThumbnail(canvas.toDataURL());
      } catch {
        if (!cancelled) setPdfThumbnail(null);
      }
    }
    generateThumbnail();
    return () => { cancelled = true; };
  }, [pdfFile]);

  // Subir Excel
  const handleExcelChange = async (e) => {
    const file = e.target.files[0];
    setExcelFile(null);
    setExcelUploaded(false);
    setDebugExcelValues([]);
    setMessage("");
    if (!file) return;
    // Validar extensión .xlsx
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setMessage("❌ Solo se permiten archivos Excel con extensión .xlsx (Microsoft Excel Open XML). Por favor, selecciona un archivo válido.");
      return;
    }
    setExcelFile(file);
    const valid = await validateExcel(file, setMessage, setDebugExcelValues);
    if (!valid) return;
    setUploading(true);
    try {
      const blobService = new BlobServiceClient(
        `https://${storageAccountName}.blob.core.windows.net/?${sasToken}`
      );
      const containerClient = blobService.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(`EntradaDatosParaProcesar/${file.name}`);
      await blockBlobClient.uploadBrowserData(file);
      setExcelUploaded(true);
      setMessage("✅ Excel subido correctamente.");
    } catch (err) {
      setMessage("❌ Error al subir el Excel a Azure.");
      setExcelUploaded(false);
    }
    setUploading(false);
  };

  // Subir PDF
  const handlePdfChange = async (e) => {
    const file = e.target.files[0];
    setPdfFile(file);
    setMessage("");
    setDebugPdfText("");
    setPdfUploaded(false);
    if (!file) return;
    const valid = await validatePdf(file, setMessage, setDebugPdfText);
    if (!valid) return;
    setUploading(true);
    try {
      const blobService = new BlobServiceClient(
        `https://${storageAccountName}.blob.core.windows.net/?${sasToken}`
      );
      const containerClient = blobService.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(`EntradaDatosParaProcesar/${file.name}`);
      await blockBlobClient.uploadBrowserData(file);
      setPdfUploaded(true);
      setMessage("✅ PDF subido correctamente.");
    } catch (err) {
      setMessage("❌ Error al subir el PDF a Azure.");
      setPdfUploaded(false);
    }
    setUploading(false);
  };

  // Subir materiales (igual que antes)
  const handleMaterialesChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setMateriales(selectedFiles);
  };

  // Notificar a n8n
  const handleNotifyN8N = async () => {
    setUploading(true);
    setMessage("");
    try {
      await fetch("https://renediaz2025.app.n8n.cloud/webhook/a4784977-134a-4f09-9ea3-04c85c5ba3b7",  // <-- comilla cerrada
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archivos: [excelFile?.name, pdfFile?.name],
          deseaSubirMateriales,
          materiales: materiales.map(f => f.name),
          id: crypto.randomUUID(),
          data: debugExcelValues.reduce((acc, curr) => {
            // curr is like "Agencia: XYZ"
            const [key, ...rest] = curr.split(':');
            acc[key.trim()] = rest.join(':').trim();
            return acc;
          }, {}),
        })
      });
      setMessage("");
      setEnvioExitoso(true);
      // No limpiar el estado aquí
    } catch (err) {
      setMessage("❌ Error al notificar a n8n.");
    }
    setUploading(false);
  };

  // Previsualización Excel (primeras filas)
  const renderExcelPreview = () => {
    if (!excelFile) return null;
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, background: '#f8fafc' }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1}>Previsualización de Excel:</Typography>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {debugExcelValues.map((v, i) => (
            <li key={i} style={{ fontSize: 15 }}>{v}</li>
          ))}
        </ul>
      </Paper>
    );
  };

  // Previsualización PDF (miniatura primera página)
  const renderPdfPreview = () => {
    if (!pdfFile || !pdfUploaded || !pdfThumbnail) return null;
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, background: '#f8fafc', textAlign: 'center' }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1}>Previsualización PDF:</Typography>
        <img src={pdfThumbnail} alt="Miniatura PDF" style={{ maxWidth: 180, borderRadius: 4, boxShadow: '0 2px 8px #0001' }} />
      </Paper>
    );
  };

  // Render de cada paso
  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Fade in={activeStep === 0}>
            <Box>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                1. Sube el archivo Excel (Valorización)
              </Typography>
              <input
                id="excel-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelChange}
                style={{ display: "block", margin: "16px auto" }}
                disabled={uploading || excelUploaded}
              />
              {renderExcelPreview()}
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2, fontWeight: 600, fontSize: 16, py: 1, borderRadius: 2 }}
                onClick={() => {
                  setActiveStep(1);
                  setMessage("");
                  const excelInput = document.getElementById("excel-input");
                  if (excelInput) excelInput.value = "";
                }}
                disabled={!excelUploaded}
              >
                Siguiente
              </Button>
            </Box>
          </Fade>
        );
      case 1:
        return (
          <Fade in={activeStep === 1}>
            <Box>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                2. Sube el archivo PDF (Orden de Compra)
              </Typography>
              <input
                id="pdf-input"
                type="file"
                accept=".pdf"
                onChange={handlePdfChange}
                style={{ display: "block", margin: "16px auto" }}
                disabled={uploading || pdfUploaded}
              />
              {renderPdfPreview()}
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2, fontWeight: 600, fontSize: 16, py: 1, borderRadius: 2 }}
                onClick={() => {
                  setActiveStep(2);
                  setMessage("");
                  const pdfInput = document.getElementById("pdf-input");
                  if (pdfInput) pdfInput.value = "";
                }}
                disabled={!pdfUploaded}
              >
                Siguiente
              </Button>
            </Box>
          </Fade>
        );
      case 2:
        if (envioExitoso) {
          return (
            <Fade in={true}>
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Alert severity="success" sx={{ fontSize: 18, fontWeight: 600, mb: 3 }}>
                  ✅ ¡Archivos enviados correctamente!
                </Alert>
                <Paper elevation={1} sx={{ p: 2, mt: 2, background: '#f8fafc' }}>
                  <Typography variant="subtitle2" fontWeight={600} mb={1}>Resumen del envío:</Typography>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Excel: {excelFile?.name || <span style={{ color: '#aaa' }}>No seleccionado</span>}</li>
                    <li>PDF: {pdfFile?.name || <span style={{ color: '#aaa' }}>No seleccionado</span>}</li>
                    <li>Materiales: {materiales.length > 0 ? materiales.length + ' archivo(s)' : 'Ninguno'}</li>
                  </ul>
                </Paper>
                <Button
                  variant="outlined"
                  color="primary"
                  sx={{ mt: 3, fontWeight: 600, fontSize: 16, py: 1, borderRadius: 2 }}
                  onClick={() => window.location.reload()}
                >
                  Reiniciar
                </Button>
              </Box>
            </Fade>
          );
        }
        return (
          <Fade in={activeStep === 2}>
            <Box>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                3. ¿Desea subir materiales?
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <label>
                  <input
                    type="radio"
                    name="deseaSubirMateriales"
                    value="si"
                    checked={deseaSubirMateriales === true}
                    onChange={() => setDeseaSubirMateriales(true)}
                    disabled={uploading}
                  />
                  Sí
                </label>
                <label>
                  <input
                    type="radio"
                    name="deseaSubirMateriales"
                    value="no"
                    checked={deseaSubirMateriales === false}
                    onChange={() => setDeseaSubirMateriales(false)}
                    disabled={uploading}
                  />
                  No
                </label>
              </Box>
              <input
                id="materiales-input"
                type="file"
                multiple
                webkitdirectory="true"
                directory="true"
                onChange={handleMaterialesChange}
                style={{ display: "block", margin: "16px auto" }}
                disabled={uploading || deseaSubirMateriales !== true}
              />
              {materiales.length > 0 && deseaSubirMateriales === true && (
                <Box sx={{ mt: 1, mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {materiales.map((file, idx) => (
                    <Box key={idx} sx={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#f5f7fa',
                      borderRadius: 2,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      px: 2,
                      py: 1.2,
                      fontWeight: 600,
                      fontSize: 15,
                      color: '#222',
                      minHeight: 38,
                      justifyContent: 'space-between'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 22, marginRight: 12, color: '#1976d2' }}>📁</span>
                        <span className="file-name-ellipsis" title={file.webkitRelativePath || file.name}>{file.webkitRelativePath || file.name}</span>
                      </Box>
                      <span
                        style={{
                          fontSize: 20,
                          marginLeft: 18,
                          color: '#1976d2',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'color 0.2s',
                        }}
                        title="Archivo listo para subir"
                      >
                        ✔️
                      </span>
                    </Box>
                  ))}
                </Box>
              )}
              {/* Resumen final */}
              <Paper elevation={1} sx={{ p: 2, mt: 2, background: '#f8fafc' }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>Resumen:</Typography>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Excel: {excelFile?.name || <span style={{ color: '#aaa' }}>No seleccionado</span>}</li>
                  <li>PDF: {pdfFile?.name || <span style={{ color: '#aaa' }}>No seleccionado</span>}</li>
                  <li>Materiales: {materiales.length > 0 ? materiales.length + ' archivo(s)' : 'Ninguno'}</li>
                </ul>
              </Paper>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2, fontWeight: 600, fontSize: 16, py: 1, borderRadius: 2 }}
                onClick={handleNotifyN8N}
                disabled={uploading}
              >
                Enviar archivos
              </Button>
            </Box>
          </Fade>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
        padding: 0,
        margin: 0,
      }}
    >
      <img
        src={claroMediaLogo}
        alt="Claro Media Data Tech"
        style={{ width: 220, marginBottom: 32, marginTop: 0, display: "block" }}
      />
      <Box sx={{ maxWidth: 440, mx: "auto", mt: 8, p: 3, boxShadow: 3, borderRadius: 3, background: "#fff" }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {uploading && <LinearProgress sx={{ mb: 2 }} />}
        {renderStepContent(activeStep)}
        {message && (
          <Alert severity={message.startsWith("✅") ? "success" : "error"} sx={{ mt: 2, mb: 1 }}>
            {message}
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default UploadForm; 
