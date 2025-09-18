import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TablePagination, 
  CircularProgress, 
  Alert, 
  TextField, 
  IconButton, 
  Button,
  Container,
  Stack,
  Chip,
  InputAdornment
} from '@mui/material';
import { Search as SearchIcon, Download as DownloadIcon } from '@mui/icons-material';
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
        bgcolor: 'background.default',
        color: 'text.primary',
        py: theme => theme.spacing(3),
        mt: theme => theme.spacing(8),
        transition: theme => theme.transitions.create(['background-color'], {
          duration: theme.transitions.duration.standard,
        })
      }}
    >
      <Container maxWidth="xl">
        <Paper 
          elevation={8} 
          sx={{ 
            p: theme => theme.spacing(4), 
            borderRadius: theme => theme.spacing(2), 
            bgcolor: 'background.paper',
            boxShadow: theme => theme.shadows[8],
            transition: theme => theme.transitions.create(['box-shadow'], {
              duration: theme.transitions.duration.standard,
            })
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              color: 'text.primary',
              fontWeight: theme => theme.typography.fontWeightBold,
              textAlign: 'center',
              mb: theme => theme.spacing(4)
            }}
          >
            Documentos Subidos por Usuario
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: theme => theme.spacing(3) }}>
            <TextField
              variant="outlined"
              size="medium"
              placeholder="Buscar usuario, archivo o estado"
              value={state.search}
              onChange={e => setSearch(e.target.value)}
              sx={{ 
                width: theme => theme.spacing(40),
                '& .MuiOutlinedInput-root': {
                  borderRadius: theme => theme.spacing(1)
                }
              }}
              InputProps={{ 
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                )
              }}
            />
          </Box>
          
          <TableContainer sx={{ maxHeight: theme => theme.spacing(75), borderRadius: theme => theme.spacing(1) }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    fontWeight: theme => theme.typography.fontWeightBold,
                    py: theme => theme.spacing(2)
                  }}>
                    Usuario
                  </TableCell>
                  <TableCell sx={{ 
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    fontWeight: theme => theme.typography.fontWeightBold,
                    py: theme => theme.spacing(2)
                  }}>
                    Nombre de Archivo
                  </TableCell>
                  <TableCell sx={{ 
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    fontWeight: theme => theme.typography.fontWeightBold,
                    py: theme => theme.spacing(2)
                  }}>
                    Fecha de Subida
                  </TableCell>
                  <TableCell sx={{ 
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    fontWeight: theme => theme.typography.fontWeightBold,
                    py: theme => theme.spacing(2),
                    textAlign: 'center'
                  }}>
                    Estado
                  </TableCell>
                  <TableCell sx={{ 
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    fontWeight: theme => theme.typography.fontWeightBold,
                    py: theme => theme.spacing(2),
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
                      <Alert 
                        severity="error" 
                        sx={{ 
                          my: theme => theme.spacing(3),
                          fontSize: theme => theme.typography.body1.fontSize
                        }}
                      >
                        {state.error}
                      </Alert>
                    </TableCell>
                  </TableRow>
                ) : state.loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: theme => theme.spacing(4) }}>
                      <CircularProgress size={40} />
                    </TableCell>
                  </TableRow>
                ) : filteredDocs.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={5} 
                      align="center" 
                      sx={{ 
                        py: theme => theme.spacing(6),
                        color: 'text.secondary',
                        fontSize: theme => theme.typography.h6.fontSize
                      }}
                    >
                      No hay documentos subidos por ningún usuario.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocs.slice(state.page * state.rowsPerPage, state.page * state.rowsPerPage + state.rowsPerPage).map((doc, idx) => (
                    <TableRow 
                      key={doc.Id || idx} 
                      sx={{
                        '&:nth-of-type(odd)': {
                          bgcolor: 'action.hover'
                        },
                        '&:hover': {
                          bgcolor: 'action.selected',
                          transform: 'translateY(-1px)',
                          boxShadow: theme => theme.shadows[2]
                        },
                        transition: theme => theme.transitions.create(['background-color', 'transform', 'box-shadow'], {
                          duration: theme.transitions.duration.short,
                        })
                      }}
                    >
                      <TableCell sx={{ 
                        color: 'text.primary',
                        fontWeight: theme => theme.typography.fontWeightMedium,
                        py: theme => theme.spacing(2)
                      }}>
                        {doc.UserEmail || doc.UserName || doc.IdUser}
                      </TableCell>
                      <TableCell sx={{ 
                        color: 'text.primary',
                        fontWeight: theme => theme.typography.fontWeightMedium,
                        py: theme => theme.spacing(2)
                      }}>
                        {doc.FileName || doc.NombreArchivo || 'Sin nombre'}
                      </TableCell>
                      <TableCell sx={{ 
                        color: 'text.primary',
                        fontWeight: theme => theme.typography.fontWeightMedium,
                        py: theme => theme.spacing(2)
                      }}>
                        {doc.Fecha ? new Date(doc.Fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', py: theme => theme.spacing(2) }}>
                        <Chip 
                          label={doc.Status || 'Sin estado'}
                          color={doc.Status === 'Completado' ? 'success' : doc.Status === 'Error' ? 'error' : 'default'}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', py: theme => theme.spacing(1) }}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownload(doc.IdFolder || '')}
                          disabled={!doc.IdFolder}
                          sx={{
                            borderRadius: theme => theme.spacing(1),
                            position: 'relative',
                            zIndex: 1
                          }}
                        >
                          Descargar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={filteredDocs.length}
            rowsPerPage={state.rowsPerPage}
            page={state.page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ 
              color: 'text.primary',
              mt: theme => theme.spacing(2),
              borderTop: theme => `1px solid ${theme.palette.divider}`
            }}
          />
        </Paper>
      </Container>
    </Box>
  );
};

export default LoadDocumentsOCbyUserView;