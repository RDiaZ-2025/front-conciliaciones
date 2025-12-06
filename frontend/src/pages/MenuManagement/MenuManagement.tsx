import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Select,
  MenuItem as MuiMenuItem,
  InputLabel,
  FormControl
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useMenuManagement } from './useMenuManagement';
import { MenuItem } from './types';

const MenuManagement: React.FC = () => {
  const {
    state,
    fetchMenuItems,
    handleOpenDialog,
    handleCloseDialog,
    handleFormChange,
    handleSubmit,
    handleDelete
  } = useMenuManagement();

  // Helper to flatten menu items for parent selection
  const getFlatMenuItems = (items: MenuItem[], prefix = ''): { id: number; label: string }[] => {
    let flat: { id: number; label: string }[] = [];
    items.forEach(item => {
      flat.push({ id: item.id, label: prefix + item.label });
      if (item.children) {
        flat = [...flat, ...getFlatMenuItems(item.children, prefix + '-- ')];
      }
    });
    return flat;
  };

  const flatMenuItems = getFlatMenuItems(state.menuItems);

  // Recursive render for table rows
  const renderRows = (items: MenuItem[], level = 0) => {
    return items.map(item => (
      <React.Fragment key={item.id}>
        <TableRow>
          <TableCell style={{ paddingLeft: level * 20 + 16 }}>
            {item.label}
          </TableCell>
          <TableCell>{item.icon}</TableCell>
          <TableCell>{item.route}</TableCell>
          <TableCell>{item.displayOrder}</TableCell>
          <TableCell>{item.isActive ? 'Yes' : 'No'}</TableCell>
          <TableCell align="right">
            <IconButton onClick={() => handleOpenDialog(item)} color="primary" size="small">
              <EditIcon />
            </IconButton>
            <IconButton onClick={() => handleDelete(item.id)} color="error" size="small">
              <DeleteIcon />
            </IconButton>
          </TableCell>
        </TableRow>
        {item.children && renderRows(item.children, level + 1)}
      </React.Fragment>
    ));
  };

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary',
        minHeight: '100vh',
        mt: 8,
        py: 4
      }}
    >
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              Gestión de Menús
            </Typography>
            <Box>
              <Button
                startIcon={<RefreshIcon />}
                onClick={fetchMenuItems}
                sx={{ mr: 2 }}
              >
                Refrescar
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Nuevo Menú
              </Button>
            </Box>
          </Box>

          {state.error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {state.error}
            </Alert>
          )}

          {state.loading && !state.isDialogOpen ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Etiqueta</TableCell>
                    <TableCell>Icono</TableCell>
                    <TableCell>Ruta</TableCell>
                    <TableCell>Orden</TableCell>
                    <TableCell>Activo</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {renderRows(state.menuItems)}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        <Dialog open={state.isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {state.editingItem ? 'Editar Menú' : 'Nuevo Menú'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Etiqueta"
                value={state.formData.label}
                onChange={(e) => handleFormChange('label', e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Icono (Material Icon Name)"
                value={state.formData.icon}
                onChange={(e) => handleFormChange('icon', e.target.value)}
                fullWidth
                helperText="e.g. DashboardIcon, PeopleIcon"
              />
              <TextField
                label="Ruta"
                value={state.formData.route}
                onChange={(e) => handleFormChange('route', e.target.value)}
                fullWidth
                helperText="e.g. /dashboard, /admin"
              />
              
              <FormControl fullWidth>
                <InputLabel>Menú Padre</InputLabel>
                <Select
                  value={state.formData.parentId || ''}
                  onChange={(e) => handleFormChange('parentId', e.target.value || null)}
                  label="Menú Padre"
                >
                  <MuiMenuItem value="">
                    <em>Ninguno (Raíz)</em>
                  </MuiMenuItem>
                  {flatMenuItems
                    .filter(item => item.id !== state.editingItem?.id) // Prevent self-parenting
                    .map(item => (
                      <MuiMenuItem key={item.id} value={item.id}>
                        {item.label}
                      </MuiMenuItem>
                    ))
                  }
                </Select>
              </FormControl>

              <TextField
                label="Orden"
                type="number"
                value={state.formData.displayOrder}
                onChange={(e) => handleFormChange('displayOrder', parseInt(e.target.value) || 0)}
                fullWidth
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={state.formData.isActive}
                    onChange={(e) => handleFormChange('isActive', e.target.checked)}
                  />
                }
                label="Activo"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={state.loading}>
              {state.loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default MenuManagement;
