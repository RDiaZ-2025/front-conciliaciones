import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  useTheme,
  Zoom,
  Fab,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  Fullscreen as FullscreenIcon,
  Download as DownloadIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeIcon
} from '@mui/icons-material';

export interface FilePreviewProps {
  file: File | null;
  open: boolean;
  onClose: () => void;
  onDownload?: () => void;
}

interface PreviewState {
  loading: boolean;
  error: string | null;
  zoom: number;
  rotation: number;
  currentPage: number;
  totalPages: number;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  open,
  onClose,
  onDownload
}) => {
  const theme = useTheme();
  const [previewState, setPreviewState] = useState<PreviewState>({
    loading: false,
    error: null,
    zoom: 1,
    rotation: 0,
    currentPage: 1,
    totalPages: 1
  });
  
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // File type detection
  const getFileType = (file: File): string => {
    const extension = (file.name || '').toLowerCase().split('.').pop() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
      return 'image';
    }
    if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(extension)) {
      return 'video';
    }
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(extension)) {
      return 'audio';
    }
    if (extension === 'pdf') {
      return 'pdf';
    }
    if (['doc', 'docx', 'txt', 'rtf'].includes(extension)) {
      return 'document';
    }
    return 'unknown';
  };

  // Create file URL when file changes
  useEffect(() => {
    if (file && open) {
      setPreviewState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const url = URL.createObjectURL(file);
        setFileUrl(url);
        setPreviewState(prev => ({ ...prev, loading: false }));
      } catch (error) {
        setPreviewState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Error al cargar el archivo' 
        }));
      }
    }

    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
        setFileUrl(null);
      }
    };
  }, [file, open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setPreviewState({
        loading: false,
        error: null,
        zoom: 1,
        rotation: 0,
        currentPage: 1,
        totalPages: 1
      });
      setIsPlaying(false);
    }
  }, [open]);

  const handleZoomIn = () => {
    setPreviewState(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 5) }));
  };

  const handleZoomOut = () => {
    setPreviewState(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.1) }));
  };

  const handleRotateLeft = () => {
    setPreviewState(prev => ({ ...prev, rotation: prev.rotation - 90 }));
  };

  const handleRotateRight = () => {
    setPreviewState(prev => ({ ...prev, rotation: prev.rotation + 90 }));
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const renderImagePreview = () => (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        maxHeight: '70vh',
        overflow: 'auto',
        bgcolor: 'grey.100',
        borderRadius: 2,
        position: 'relative'
      }}
    >
      <img
        src={fileUrl || ''}
        alt={file?.name}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          transform: `scale(${previewState.zoom}) rotate(${previewState.rotation}deg)`,
          transition: 'transform 0.3s ease',
          objectFit: 'contain'
        }}
        onError={() => setPreviewState(prev => ({ 
          ...prev, 
          error: 'Error al cargar la imagen' 
        }))}
      />
      
      {/* Image controls */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          gap: 1,
          bgcolor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 2,
          p: 1
        }}
      >
        <IconButton 
          size="small" 
          onClick={handleZoomIn} 
          sx={{ color: 'white' }}
          title="Acercar"
        >
          <ZoomInIcon />
        </IconButton>
        <IconButton 
          size="small" 
          onClick={handleZoomOut} 
          sx={{ color: 'white' }}
          title="Alejar"
        >
          <ZoomOutIcon />
        </IconButton>
        <IconButton 
          size="small" 
          onClick={handleRotateLeft} 
          sx={{ color: 'white' }}
          title="Rotar izquierda"
        >
          <RotateLeftIcon />
        </IconButton>
        <IconButton 
          size="small" 
          onClick={handleRotateRight} 
          sx={{ color: 'white' }}
          title="Rotar derecha"
        >
          <RotateRightIcon />
        </IconButton>
      </Box>
    </Box>
  );

  const renderVideoPreview = () => (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        maxHeight: '70vh',
        bgcolor: 'grey.900',
        borderRadius: 2,
        position: 'relative'
      }}
    >
      <video
        ref={videoRef}
        src={fileUrl || ''}
        controls
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          borderRadius: theme.shape.borderRadius
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setPreviewState(prev => ({ 
          ...prev, 
          error: 'Error al cargar el video' 
        }))}
      >
        Tu navegador no soporta la reproducción de video.
      </video>
    </Box>
  );

  const renderAudioPreview = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        bgcolor: 'grey.50',
        borderRadius: 2,
        p: 4
      }}
    >
      <VolumeIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
      
      <Typography variant="h6" component="div" sx={{ mb: 2, textAlign: 'center' }}>
        {file?.name}
      </Typography>
      
      <audio
        ref={audioRef}
        src={fileUrl || ''}
        controls
        style={{ width: '100%', maxWidth: '400px' }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setPreviewState(prev => ({ 
          ...prev, 
          error: 'Error al cargar el audio' 
        }))}
      >
        Tu navegador no soporta la reproducción de audio.
      </audio>
    </Box>
  );

  const renderPdfPreview = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        bgcolor: 'grey.50',
        borderRadius: 2,
        p: 4
      }}
    >
      <Typography variant="h6" component="div" sx={{ mb: 2 }}>
        Vista previa de PDF
      </Typography>
      
      <iframe
        src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
        width="100%"
        height="500px"
        style={{
          border: 'none',
          borderRadius: theme.shape.borderRadius
        }}
        title={file?.name}
      />
    </Box>
  );

  const renderDocumentPreview = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        bgcolor: 'grey.50',
        borderRadius: 2,
        p: 4
      }}
    >
      <Typography variant="h6" component="div" sx={{ mb: 2 }}>
        Documento: {file?.name}
      </Typography>
      
      <Typography variant="body2" component="div" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
        La vista previa de documentos no está disponible. 
        Puedes descargar el archivo para verlo.
      </Typography>
      
      {onDownload && (
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={onDownload}
        >
          Descargar documento
        </Button>
      )}
    </Box>
  );

  const renderUnsupportedPreview = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        bgcolor: 'grey.50',
        borderRadius: 2,
        p: 4
      }}
    >
      <Typography variant="h6" component="div" sx={{ mb: 2 }}>
        Vista previa no disponible
      </Typography>
      
      <Typography variant="body2" component="div" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
        El tipo de archivo {file?.name.split('.').pop()?.toUpperCase()} no es compatible con la vista previa.
      </Typography>
      
      {onDownload && (
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={onDownload}
        >
          Descargar archivo
        </Button>
      )}
    </Box>
  );

  const renderPreviewContent = () => {
    if (previewState.loading) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px'
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    if (previewState.error) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {previewState.error}
        </Alert>
      );
    }

    if (!file || !fileUrl) {
      return null;
    }

    const fileType = getFileType(file);

    switch (fileType) {
      case 'image':
        return renderImagePreview();
      case 'video':
        return renderVideoPreview();
      case 'audio':
        return renderAudioPreview();
      case 'pdf':
        return renderPdfPreview();
      case 'document':
        return renderDocumentPreview();
      default:
        return renderUnsupportedPreview();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '60vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}
      >
        <Box component="div" sx={{ flex: 1 }}>
          <Typography variant="h6" component="span">
            {file?.name}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onDownload && (
            <IconButton onClick={onDownload} size="small" title="Descargar">
              <DownloadIcon />
            </IconButton>
          )}
          
          <IconButton onClick={onClose} size="small" title="Cerrar">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {renderPreviewContent()}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" component="span">
            {file && file.size !== undefined && file.size > 0 
              ? `Tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB`
              : file && file.size === 0
              ? 'Tamaño: 0 MB'
              : 'Tamaño: No disponible'
            }
          </Typography>
        </Box>
        
        <Button onClick={onClose} variant="outlined">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilePreview;