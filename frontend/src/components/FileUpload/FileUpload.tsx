import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  Stack,
  Card,
  CardContent,
  CardActions,
  LinearProgress,
  Alert,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Attachment as AttachmentIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import FilePreview from '../FilePreview';

export interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  acceptedTypes?: string[];
  maxFiles?: number;
  maxFileSize?: number; // in MB
  disabled?: boolean;
  showPreview?: boolean;
  allowDownload?: boolean;
  label?: string;
  helperText?: string;
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  files = [],
  onFilesChange,
  acceptedTypes = ['.pdf', '.xlsx', '.xls', '.mp3', '.wav', '.mp4', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx'],
  maxFiles = 10,
  maxFileSize = 50, // 50MB default
  disabled = false,
  showPreview = true,
  allowDownload = false,
  label = 'Subir archivos',
  helperText = 'Arrastra archivos aquí o haz clic para seleccionar'
}) => {
  const theme = useTheme();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert files to FileWithPreview format
  const filesWithPreview: FileWithPreview[] = files.map((file, index) => ({
    ...file,
    id: `${file.name}-${file.size || 0}-${index}`,
    preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
  }));

  const getFileIcon = (file: File) => {
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();

    if (type.startsWith('image/')) return <ImageIcon />;
    if (type.startsWith('video/')) return <VideoIcon />;
    if (type.startsWith('audio/') || name.endsWith('.wav') || name.endsWith('.mp3') || name.endsWith('.aac') || name.endsWith('.m4a')) return <AudioIcon />;
    if (type === 'application/pdf') return <PdfIcon />;
    if (type.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.xls')) return <ExcelIcon />;
    if (type.includes('document') || name.endsWith('.doc') || name.endsWith('.docx')) return <FileIcon />;
    return <AttachmentIcon />;
  };

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes || bytes === 0 || isNaN(bytes)) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (!file.size || isNaN(file.size) || file.size > maxFileSize * 1024 * 1024) {
      return `El archivo "${file.name}" excede el tamaño máximo de ${maxFileSize}MB`;
    }

    // Check file type
    const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    const isValidType = acceptedTypes.some(type => {
      const normalizedType = type.toLowerCase();
      const normalizedExtension = fileExtension.toLowerCase();
      
      // Check by extension
      if (normalizedType === normalizedExtension) return true;
      
      // Check by MIME type for common cases
      if (file.type) {
        const mimeType = file.type.toLowerCase();
        if (normalizedType === '.wav' && (mimeType.includes('audio/wav') || mimeType.includes('audio/wave'))) return true;
        if (normalizedType === '.mp3' && mimeType.includes('audio/mpeg')) return true;
        if (normalizedType === '.mp4' && mimeType.includes('video/mp4')) return true;
        if (normalizedType === '.pdf' && mimeType.includes('application/pdf')) return true;
        if (normalizedType === '.jpg' || normalizedType === '.jpeg') {
          if (mimeType.includes('image/jpeg')) return true;
        }
        if (normalizedType === '.png' && mimeType.includes('image/png')) return true;
        if (normalizedType === '.gif' && mimeType.includes('image/gif')) return true;
      }
      
      return false;
    });

    if (!isValidType) {
      return `El tipo de archivo "${file.name}" no está permitido. Tipos permitidos: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(newFiles);
    
    // Validate each file
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Check total file count
    if (files.length + fileArray.length > maxFiles) {
      setError(`No puedes subir más de ${maxFiles} archivos`);
      return;
    }

    // Check for duplicates
    const existingNames = files.map(f => f.name);
    const duplicates = fileArray.filter(f => existingNames.includes(f.name));
    
    if (duplicates.length > 0) {
      setError(`Ya existe(n) archivo(s) con el mismo nombre: ${duplicates.map(f => f.name).join(', ')}`);
      return;
    }

    // Add new files
    onFilesChange([...files, ...fileArray]);
  }, [files, onFilesChange, maxFiles, maxFileSize, acceptedTypes]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [disabled, handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const handleRemoveFile = useCallback((fileToRemove: FileWithPreview) => {
    const updatedFiles = files.filter((_, index) => 
      `${files[index].name}-${files[index].size || 0}-${index}` !== fileToRemove.id
    );
    onFilesChange(updatedFiles);
    
    // Revoke object URL to prevent memory leaks
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
  }, [files, onFilesChange]);

  const handleDownloadFile = useCallback((file: File) => {
    try {
      // Validate that file is a proper File object
      if (!file || !(file instanceof File) || !file.name) {
        console.error('Invalid file object for download:', file);
        setError('Error: Archivo inválido para descarga');
        return;
      }

      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating object URL for download:', error);
      setError('Error al descargar el archivo');
    }
  }, []);

  const handlePreviewFile = useCallback((file: File) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
  }, []);

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box>
      {/* Upload Area */}
      <Paper
        elevation={isDragOver ? 8 : 2}
        sx={{
          p: 4,
          textAlign: 'center',
          border: `2px dashed ${
            isDragOver 
              ? theme.palette.primary.main 
              : disabled 
                ? theme.palette.action.disabled 
                : theme.palette.divider
          }`,
          borderRadius: 2,
          bgcolor: isDragOver 
            ? theme.palette.primary.light + '20' 
            : disabled 
              ? theme.palette.action.disabledBackground 
              : theme.palette.background.paper,
          transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow'])
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />
        
        <CloudUploadIcon 
          sx={{ 
            fontSize: 48, 
            color: disabled ? 'action.disabled' : 'primary.main',
            mb: 2 
          }} 
        />
        
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 1,
            color: disabled ? 'text.disabled' : 'text.primary',
            fontWeight: theme.typography.fontWeightMedium
          }}
        >
          {label}
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ 
            color: disabled ? 'text.disabled' : 'text.secondary',
            mb: 2
          }}
        >
          {helperText}
        </Typography>
        
        <Button
          variant="outlined"
          onClick={openFileDialog}
          disabled={disabled}
          sx={{
            color: disabled ? 'text.disabled' : 'primary.main',
            textTransform: 'none',
            fontWeight: theme.typography.fontWeightMedium,
            borderColor: disabled ? theme.palette.action.disabled : theme.palette.primary.main,
            borderRadius: 1,
            px: 2,
            py: 1,
            transition: theme.transitions.create(['background-color', 'border-color']),
            '&:hover': !disabled ? {
              bgcolor: theme.palette.primary.light + '10',
              borderColor: theme.palette.primary.dark
            } : {}
          }}
        >
          Seleccionar archivos
        </Button>
        
        <Typography 
          variant="caption" 
          display="block" 
          sx={{ 
            mt: 2,
            color: 'text.secondary'
          }}
        >
          Máximo {maxFiles} archivos • Tamaño máximo {maxFileSize}MB por archivo
          <br />
          Tipos permitidos: {acceptedTypes.join(', ')}
        </Typography>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="body2" component="div" sx={{ mt: 1, textAlign: 'center' }}>
            Subiendo archivos...
          </Typography>
        </Box>
      )}

      {/* File Preview */}
      {showPreview && filesWithPreview.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              mb: 2,
              fontWeight: theme.typography.fontWeightMedium,
              color: 'text.primary'
            }}
          >
            Archivos seleccionados ({filesWithPreview.length})
          </Typography>
          
          <Stack spacing={2}>
            {filesWithPreview.map((file) => (
              <Card 
                key={file.id}
                elevation={1}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {/* File Icon or Image Preview */}
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        overflow: 'hidden'
                      }}
                    >
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <Box sx={{ color: 'primary.main' }}>
                          {getFileIcon(file)}
                        </Box>
                      )}
                    </Box>
                    
                    {/* File Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: theme.typography.fontWeightMedium,
                          color: 'text.primary',
                          wordBreak: 'break-word'
                        }}
                      >
                        {file.name}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ color: 'text.secondary' }}
                      >
                        {formatFileSize(file.size)} • {file.type || 'Tipo desconocido'}
                      </Typography>
                    </Box>
                    
                    {/* Actions */}
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewFile(file);
                        }}
                        sx={{ color: 'info.main' }}
                        title="Vista previa"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      
                      {allowDownload && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(file);
                          }}
                          sx={{ color: 'primary.main' }}
                          title="Descargar archivo"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      )}
                      
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(file);
                        }}
                        sx={{ color: 'error.main' }}
                        disabled={disabled}
                        title="Eliminar archivo"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          open={isPreviewOpen}
          onClose={handleClosePreview}
          onDownload={() => handleDownloadFile(previewFile)}
        />
      )}
    </Box>
  );
};

export default FileUpload;