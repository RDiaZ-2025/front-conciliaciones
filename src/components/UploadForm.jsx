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

// Función para validar firma digital en PDF
async function isPdfDigitallySigned(file) {
  const pdfData = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const annotations = await page.getAnnotations();
    if (annotations.some(a => a.subtype === "Widget" && a.fieldType === "Sig")) {
      return true;
    }
  }
  return false;
}

// Función para contar el número total de firmas (imágenes) en el PDF
async function countPdfSignatures(file) {
  const pdfData = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  let totalSignatures = 0;
  
  // Contar imágenes en todas las páginas
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    console.log(`Dimensiones de página ${pageNum}: width=${viewport.width}, height=${viewport.height}`);
    const ops = await page.getOperatorList();
    
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject) {
        totalSignatures++;
      }
    }
    
    // También verificar firmas digitales
    const annotations = await page.getAnnotations();
    if (annotations.some(a => a.subtype === "Widget" && a.fieldType === "Sig")) {
      totalSignatures++;
    }
  }
  
  return totalSignatures;
}

// Función para validar si hay imágenes cerca de coordenadas específicas en cualquier página
async function pdfHasImagesAtSignatureCoords(file) {
  // Coordenadas de referencia y tolerancia
  const coords = [
    // Firma RESPONSABLE CLARO
    { x: 152.5, y: 584.5 },
    // Firma CLIENTE
    { x: 443.5, y: 584.5 }
  ];
  const tolerance = 80;
  const pdfData = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  let imgsAllPages = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const ops = await page.getOperatorList();
    let imgs = [];
    let currentTransform = null;
    let lastWidth = null;
    let lastHeight = null;
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];
      if (fn === pdfjsLib.OPS.transform) {
        currentTransform = args;
      }
      if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject) {
        // pdf.js no expone directamente ancho/alto, pero podemos inferirlo del transform
        if (currentTransform) {
          const [a, b, c, d, e, f] = currentTransform;
          const width = Math.sqrt(a * a + b * b);
          const height = Math.sqrt(c * c + d * d);
          // Heurística similar a la de Python: alto < 15, ancho > 40
          if (height < 15 && width > 40 && f > 100) {
            imgs.push({ x: e, y: f, width, height });
            console.log(`✔ Imagen candidata a firma en página ${pageNum}: (${e},${f}), tamaño: ${width.toFixed(1)}x${height.toFixed(1)}`);
          } else {
            console.log(`Imagen ignorada en página ${pageNum}: (${e},${f}), tamaño: ${width.toFixed(1)}x${height.toFixed(1)}`);
          }
        }
      }
    }
    imgsAllPages.push({ page: pageNum, imgs });
  }
  // Mostrar en consola las coordenadas detectadas por página
  imgsAllPages.forEach(p => {
    console.log(`Página ${p.page}:`, p.imgs);
  });
  console.log('Coordenadas de referencia:', coords);
  // Mostrar imágenes detectadas y coordenadas objetivo para depuración
  imgsAllPages.forEach(p => {
    p.imgs.forEach(img => {
      coords.forEach((coord, idx) => {
        const dx = Math.abs(img.x - coord.x);
        const dy = Math.abs(img.y - coord.y);
        console.log(`Comparando imagen en (${img.x},${img.y}) con coordenada ${idx} (${coord.x},${coord.y}): dx=${dx}, dy=${dy}`);
      });
    });
  });
  // Validar que haya una imagen cerca de cada coordenada en cualquier página
  let allCoordsHaveImage = coords.every(coord =>
    imgsAllPages.some(p =>
      p.imgs.some(img => Math.abs(img.x - coord.x) <= tolerance && Math.abs(img.y - coord.y) <= tolerance)
    )
  );
  return allCoordsHaveImage;
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
  const [pdfWarning, setPdfWarning] = useState("");
  const [uploading, setUploading] = useState(false);
  const [debugExcelValues, setDebugExcelValues] = useState([]);
  const [debugPdfText, setDebugPdfText] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  // Estado para la miniatura del PDF
  const [pdfThumbnail, setPdfThumbnail] = useState(null);
  const [envioExitoso, setEnvioExitoso] = useState(false);
  const [manualPdfConfirmation, setManualPdfConfirmation] = useState(null);

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
    setPdfWarning("");
    if (!file) return;

    // Validar que sea PDF válido y que tenga los campos requeridos
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
      // setMessage("✅ PDF subido correctamente."); // <-- Eliminar aquí
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
      await fetch("https://renediaz2025.app.n8n.cloud/webhook-test/a4784977-134a-4f09-9ea3-04c85c5ba3b7",  // <-- comilla cerrada
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
        {/* Confirmación manual de firmas */}
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
            ¿Este documento contiene las dos firmas requeridas?
          </Typography>
          <Button
            variant={manualPdfConfirmation === true ? "contained" : "outlined"}
            color="success"
            sx={{
              fontWeight: 600,
              borderWidth: 2,
              borderColor: '#222 !important',
              boxShadow: manualPdfConfirmation === true ? '0 0 0 2px #222 !important' : undefined,
              '&.Mui-focusVisible': {
                boxShadow: '0 0 0 2px #222 !important',
                borderColor: '#222 !important',
                outline: '2px solid #222 !important',
                outlineOffset: '0px',
              },
              '&:focus': {
                boxShadow: '0 0 0 2px #222 !important',
                borderColor: '#222 !important',
                outline: '2px solid #222 !important',
                outlineOffset: '0px',
              },
              '&:active': {
                boxShadow: '0 0 0 2px #222 !important',
                borderColor: '#222 !important',
                outline: '2px solid #222 !important',
                outlineOffset: '0px',
              }
            }}
            onClick={() => {
              setManualPdfConfirmation(true);
              setMessage("✅ PDF subido correctamente.");
            }}
            disabled={!pdfUploaded}
          >
            ✅ Sí, continuar
          </Button>
          <Button
            variant={manualPdfConfirmation === false ? "contained" : "outlined"}
            color="error"
            sx={{ fontWeight: 600, borderWidth: 2, borderColor: '#222 !important', color: manualPdfConfirmation === false ? '#fff' : '#d32f2f', background: manualPdfConfirmation === false ? '#d32f2f' : undefined, boxShadow: manualPdfConfirmation === false ? '0 0 0 2px #222' : undefined }}
            onClick={() => {
              setManualPdfConfirmation(false);
              setPdfFile(null);
              setPdfUploaded(false);
              setMessage("");
            }}
            disabled={!pdfUploaded}
          >
            🔄 No, volver a subir el archivo
          </Button>
        </Box>
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
                sx={{ mt: 2, fontWeight: 600, fontSize: 16, py: 1, borderRadius: 2, background: '#222', '&:hover': { background: '#111' } }}
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
              {pdfWarning && (
                <Alert severity="warning" sx={{ mt: 2, mb: 1 }}>
                  {pdfWarning}
                </Alert>
              )}
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2, fontWeight: 600, fontSize: 16, py: 1, borderRadius: 2, background: '#222', '&:hover': { background: '#111' } }}
                onClick={() => {
                  setActiveStep(2);
                  setMessage("");
                  setPdfWarning("");
                  const pdfInput = document.getElementById("pdf-input");
                  if (pdfInput) pdfInput.value = "";
                }}
                disabled={!pdfUploaded || manualPdfConfirmation !== true}
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
                  sx={{ mt: 3, fontWeight: 600, fontSize: 16, py: 1, borderRadius: 2, background: '#222', color: '#fff', '&:hover': { background: '#111' } }}
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
                    style={{ accentColor: '#222', width: 20, height: 20 }}
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
                    style={{ accentColor: '#222', width: 20, height: 20 }}
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ mt: 2, fontWeight: 600, fontSize: 16, py: 1, borderRadius: 2, background: '#222', '&:hover': { background: '#111' } }}
                  onClick={handleNotifyN8N}
                  disabled={uploading}
                >
                  Enviar archivos
                </Button>
              </Box>
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
        minWidth: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        background: "linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)",
        position: "relative",
        inset: 0,
      }}
    >
      <Box sx={{ width: "100%", display: "flex", alignItems: "center", mt: 2, mb: 2, position: "relative" }}>
        <img
          src={claroMediaLogo}
          alt="Claro Media Data Tech"
          style={{ width: 180, margin: "0 auto", display: "block" }}
        />
      </Box>
      <Paper elevation={6} sx={{ p: 5, borderRadius: 4, minWidth: 340, maxWidth: 380, width: "100%", boxShadow: "0 8px 32px rgba(25, 118, 210, 0.10)" }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel
                StepIconProps={{
                  sx: {
                    color: '#222',
                    '&.Mui-active': { color: '#222' },
                    '&.Mui-completed': { color: '#222' }
                  }
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        {uploading && <LinearProgress sx={{ mb: 2, '& .MuiLinearProgress-bar': { backgroundColor: '#000' }, backgroundColor: '#e0e0e0' }} />}
        {renderStepContent(activeStep)}
        {message && (
          <Alert severity={message.startsWith("✅") ? "success" : "error"} sx={{ mt: 2, mb: 1 }}>
            {message}
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default UploadForm;
