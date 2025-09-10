import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, CircularProgress, Alert, TextField, IconButton, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useLoadDocumentsOCbyUserView } from './useLoadDocumentsOCbyUserView';
import type { LoadDocumentsOCbyUserViewProps } from './types';

const LoadDocumentsOCbyUserView: React.FC<LoadDocumentsOCbyUserViewProps> = ({ darkMode }) => {
  const {
    state,
    handleChangePage,
    handleChangeRowsPerPage,
    setSearch,
    handleDownload,
    filteredDocs
  } = useLoadDocumentsOCbyUserView();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: darkMode
          ? '#23232b'
          : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
        transition: 'background 0.3s',
        color: darkMode ? '#fff' : '#181C32',
        fontFamily: 'Inter, Segoe UI, Roboto, sans-serif',
        position: 'relative',
        overflow: 'auto'
      }}
    >
      <Paper 
        elevation={6} 
        sx={{ 
          width: '100%', 
          maxWidth: 1100, 
          margin: 'auto', 
          padding: 4, 
          borderRadius: 6, 
          boxShadow: darkMode ? '0 2px 12px #0008' : '0 4px 24px 0 rgba(80, 80, 180, 0.08)', 
          background: darkMode ? '#2a2d3a' : 'rgba(255,255,255,0.98)', 
          border: darkMode ? '1px solid rgba(230, 0, 38, 0.2)' : '1.5px solid #d1d5fa', 
          textAlign: 'center', 
          zIndex: 1, 
          overflow: 'hidden', 
          transition: 'all 0.3s' 
        }}
      >
        <Typography
          variant="h6"
          align="center"
          sx={{
            color: darkMode ? "#fff" : "#181C32",
            fontWeight: "bold",
            mb: 2,
          }}
        >
          Documentos Subidos por Usuario
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Buscar usuario, archivo o estado"
            value={state.search}
            onChange={e => setSearch(e.target.value)}
            sx={{ 
              width: 260, 
              background: darkMode ? '#232946' : '#f8fafc', 
              borderRadius: 2, 
              color: darkMode ? '#fff' : '#181C32', 
              '& .MuiOutlinedInput-notchedOutline': { borderColor: darkMode ? '#E60026' : '#d1d5fa' }, 
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: darkMode ? '#B8001B' : '#181C32' }, 
              '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: darkMode ? '#E60026' : '#181C32' }, 
              input: { color: darkMode ? '#fff' : '#181C32' } 
            }}
            InputProps={{ 
              endAdornment: (
                <IconButton>
                  <SearchIcon sx={{ color: darkMode ? '#E60026' : '#181C32' }} />
                </IconButton>
              ), 
              style: { color: darkMode ? '#fff' : '#181C32', fontWeight: 500 } 
            }}
          />
        </Box>
        
        <TableContainer sx={{ maxHeight: '600px' }}>
          <Table stickyHeader sx={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  background: darkMode ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.1) 0%, rgba(184, 0, 27, 0.1) 100%)' : '#f8fafc', 
                  color: darkMode ? '#fff' : '#181C32', 
                  fontWeight: 700, 
                  py: 3, 
                  fontSize: '0.95rem', 
                  borderBottom: darkMode ? '1px solid #444' : '2px solid #181C32', 
                  backdropFilter: 'blur(10px)' 
                }}>
                  Usuario
                </TableCell>
                <TableCell sx={{ 
                  background: darkMode ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.1) 0%, rgba(184, 0, 27, 0.1) 100%)' : '#f8fafc', 
                  color: darkMode ? '#fff' : '#181C32', 
                  fontWeight: 700, 
                  py: 3, 
                  fontSize: '0.95rem', 
                  borderBottom: darkMode ? '1px solid #444' : '2px solid #181C32', 
                  backdropFilter: 'blur(10px)' 
                }}>
                  Nombre de Archivo
                </TableCell>
                <TableCell sx={{ 
                  background: darkMode ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.1) 0%, rgba(184, 0, 27, 0.1) 100%)' : '#f8fafc', 
                  color: darkMode ? '#fff' : '#181C32', 
                  fontWeight: 700, 
                  py: 3, 
                  fontSize: '0.95rem', 
                  borderBottom: darkMode ? '1px solid #444' : '2px solid #181C32', 
                  backdropFilter: 'blur(10px)' 
                }}>
                  Fecha de Subida
                </TableCell>
                <TableCell sx={{ 
                  background: darkMode ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.1) 0%, rgba(184, 0, 27, 0.1) 100%)' : '#f8fafc', 
                  color: darkMode ? '#fff' : '#181C32', 
                  fontWeight: 700, 
                  py: 3, 
                  fontSize: '0.95rem', 
                  borderBottom: darkMode ? '1px solid #444' : '2px solid #181C32', 
                  backdropFilter: 'blur(10px)', 
                  textAlign: 'center' 
                }}>
                  Estado
                </TableCell>
                <TableCell sx={{ 
                  background: darkMode ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.1) 0%, rgba(184, 0, 27, 0.1) 100%)' : '#f8fafc', 
                  color: darkMode ? '#fff' : '#181C32', 
                  fontWeight: 700, 
                  py: 3, 
                  fontSize: '0.95rem', 
                  borderBottom: darkMode ? '1px solid #444' : '2px solid #181C32', 
                  backdropFilter: 'blur(10px)', 
                  textAlign: 'center' 
                }}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.error ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Alert severity="error" sx={{ my: 3, fontSize: '1rem', fontWeight: 500 }}>
                      {state.error}
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : state.loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, fontSize: '1.1rem', color: '#888' }}>
                    No hay documentos subidos por ningún usuario.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.slice(state.page * state.rowsPerPage, state.page * state.rowsPerPage + state.rowsPerPage).map((doc, idx) => (
                  <TableRow 
                    key={doc.Id || idx} 
                    sx={{
                      background: darkMode
                        ? (idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.01)')
                        : (idx % 2 === 0 ? 'rgba(248, 250, 252, 0.5)' : 'rgba(255, 255, 255, 0.8)'),
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        background: darkMode
                          ? 'linear-gradient(135deg, rgba(230, 0, 38, 0.08) 0%, rgba(184, 0, 27, 0.08) 100%)'
                          : 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                        transform: 'translateY(-1px)',
                        boxShadow: darkMode
                          ? '0 4px 12px rgba(0, 0, 0, 0.15)'
                          : '0 4px 12px rgba(99, 102, 241, 0.15)'
                      },
                      borderBottom: darkMode
                        ? '1px solid rgba(255, 255, 255, 0.05)'
                        : '1px solid rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <TableCell sx={{ color: darkMode ? '#fff' : '#181C32', fontWeight: 500, py: 3 }}>
                      {doc.UserEmail || doc.UserName || doc.IdUser}
                    </TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#181C32', fontWeight: 500, py: 3 }}>
                      {doc.FileName || doc.NombreArchivo || 'Sin nombre'}
                    </TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#181C32', fontWeight: 500, py: 3 }}>
                      {doc.Fecha ? new Date(doc.Fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha'}
                    </TableCell>
                    <TableCell sx={{
                      color: darkMode ? '#fff' : '#181C32',
                      fontWeight: 500,
                      py: 3,
                      background: darkMode
                        ? (idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.01)')
                        : (idx % 2 === 0 ? 'rgba(248, 250, 252, 0.5)' : 'rgba(255, 255, 255, 0.8)'),
                      borderBottom: darkMode
                        ? '1px solid rgba(255, 255, 255, 0.05)'
                        : '1px solid rgba(0, 0, 0, 0.05)',
                      borderTop: 'none',
                      borderRight: 'none',
                      borderLeft: 'none',
                      textAlign: 'left',
                      fontSize: '1rem'
                    }}>
                      {doc.Status || 'Sin estado'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', py: 3 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => handleDownload(doc.IdFolder || '')}
                        disabled={!doc.IdFolder}
                      >
                        Descargar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={filteredDocs.length}
            rowsPerPage={state.rowsPerPage}
            page={state.page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ color: darkMode ? '#fff' : '#181C32', mt: 2, borderTop: undefined }}
          />
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default LoadDocumentsOCbyUserView;