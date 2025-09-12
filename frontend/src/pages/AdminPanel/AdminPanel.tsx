import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Pagination,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  History as HistoryIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminPanel } from './useAdminPanel';
import LoadDocumentsOCbyUserView from '../LoadDocumentsOCbyUserView';
import UploadForm from '../UploadForm';
import DashboardGeneral from '../DashboardGeneral';

const AdminPanel = ({ darkMode, selectedMenu = 'usuarios' }) => {
  const { user } = useAuth();
  const {
    users,
    openDialog,
    editingUser,
    formData,
    setFormData,
    availablePermissions,
    accessHistory,
    showAccessHistory,
    snackbar,
    setSnackbar,
    openRoleDialog,
    selectedUserForRole,
    searchUser,
    setSearchUser,
    currentPage,
    setCurrentPage,
    usersPerPage,
    handleToggleAccessHistory,
    handleOpenDialog,
    handleCloseDialog,
    handleOpenRoleDialog,
    handleCloseRoleDialog,
    handleSubmit,
    handleToggleStatus,
    getRoleLabel,
    getRoleColor,
    getPermissionLabel,
    getPermissionDescription,
    getPermissionColor,
    handleTogglePermission,
    formatLoginTime,
    loadAccessHistory
  } = useAdminPanel();

  const renderContent = () => {
    switch (selectedMenu) {
      case 'historial':
        return <LoadDocumentsOCbyUserView darkMode={darkMode} />;
      case 'upload':
        return <UploadForm hideHeader={true} darkMode={darkMode} />;
      case 'dashboard':
        return <DashboardGeneral darkMode={darkMode} />;
      case 'usuarios':
      default:
        return renderUserManagement();
    }
  };

  const renderUserManagement = () => {
    const filteredUsers = users.filter(u =>
      !searchUser ||
      u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchUser.toLowerCase())
    );
    
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

    return (
      <Box sx={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
        <Box sx={{ mb: theme => theme.spacing(6), textAlign: 'center' }}>
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={3} sx={{ mb: 3 }}>
          <Box
            sx={{
              p: theme => theme.spacing(1.3),
              borderRadius: '50%',
              bgcolor: 'primary.main',
              height: 48,
              width: 48,
              boxShadow: theme => theme.shadows[4]
            }}
          >
            <AdminIcon sx={{ fontSize: 32, color: 'common.white' }} />
          </Box>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: theme => theme.typography.fontWeightBold,
                color: 'text.primary',
                letterSpacing: '-0.02em'
              }}
            >
              Panel de Administración
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: 'text.secondary',
                fontWeight: theme => theme.typography.fontWeightRegular,
                mt: 0.5
              }}
            >
              Gestión avanzada de usuarios y permisos
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Paper
        elevation={2}
        sx={{
          p: theme => theme.spacing(4),
          mb: theme => theme.spacing(4),
          bgcolor: 'background.paper',
          borderRadius: theme => theme.spacing(2),
          border: theme => `1px solid ${theme.palette.divider}`
        }}
      >
        <Stack direction="row" alignItems="center" spacing={3}>
          <Box
            sx={{
              p: theme => theme.spacing(2),
              borderRadius: theme => theme.spacing(1.5),
              bgcolor: 'action.hover',
              border: theme => `1px solid ${theme.palette.divider}`
            }}
          >
            <PersonIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h6" 
              sx={{
                color: 'text.primary',
                fontWeight: theme => theme.typography.fontWeightSemiBold,
                mb: 0.5
              }}
            >
              Sesión Activa
            </Typography>
            <Typography 
              variant="body1"
              sx={{
                color: 'text.secondary',
                lineHeight: 1.6
              }}
            >
              Conectado como{' '}
              <Box component="span" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                {user?.name}
              </Box>
              {' '}({user?.email})
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Paper
        elevation={2}
        sx={{
          bgcolor: 'background.paper',
          borderRadius: theme => theme.spacing(2),
          border: theme => `1px solid ${theme.palette.divider}`,
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            p: theme => theme.spacing(4),
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: theme => `1px solid ${theme.palette.divider}`,
            bgcolor: 'action.hover'
          }}
        >
          <Box>
            <Typography 
              variant="h5" 
              sx={{
                color: 'text.primary',
                fontWeight: theme => theme.typography.fontWeightBold,
                mb: 0.5
              }}
            >
              Gestión de Usuarios
            </Typography>
            <Typography 
              variant="body2" 
              sx={{
                color: 'text.secondary',
                fontWeight: theme => theme.typography.fontWeightMedium
              }}
            >
              Administra usuarios y sus permisos del sistema
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              variant="outlined"
              size="small"
              placeholder="Buscar usuario..."
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              sx={{ minWidth: 220 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{
                fontWeight: theme => theme.typography.fontWeightSemiBold,
                px: theme => theme.spacing(3),
                py: theme => theme.spacing(1.5),
                borderRadius: theme => theme.spacing(1.5),
                textTransform: 'none'
              }}
            >
              Nuevo Usuario
            </Button>
          </Stack>
        </Box>

        <TableContainer sx={{ maxHeight: theme => theme.spacing(75) }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {['Usuario', 'Email', 'Permisos', 'Estado', 'Acciones'].map((header) => (
                  <TableCell 
                    key={header} 
                    sx={{ 
                      bgcolor: 'action.hover',
                      color: 'text.primary',
                      fontWeight: theme => theme.typography.fontWeightBold,
                      py: theme => theme.spacing(2),
                      textAlign: header === 'Estado' || header === 'Acciones' ? 'center' : 'left'
                    }}
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.map((userData, index) => (
                <TableRow 
                  key={userData.id || userData.email || index}
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
                  <TableCell sx={{ py: theme => theme.spacing(2) }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          p: theme => theme.spacing(1),
                          borderRadius: theme => theme.spacing(1),
                          bgcolor: 'primary.light',
                          color: 'primary.contrastText'
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Typography 
                        sx={{
                          color: 'text.primary',
                          fontWeight: theme => theme.typography.fontWeightSemiBold
                        }}
                      >
                        {userData.name}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ py: theme => theme.spacing(2) }}>
                    <Typography 
                      sx={{
                        color: 'text.secondary',
                        fontWeight: theme => theme.typography.fontWeightMedium
                      }}
                    >
                      {userData.email}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: theme => theme.spacing(2) }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxWidth: 300 }}>
                      {userData.permissions && Array.isArray(userData.permissions) && userData.permissions.length > 0 ? (
                        Array.from(new Set(userData.permissions.map(p => typeof p === 'string' ? p : p.Name || p.name))).map((permissionName, permIdx) => (
                          <Chip
                            key={`perm-${permissionName}-${permIdx}`}
                            label={getPermissionLabel(permissionName)}
                            color={getPermissionColor(permissionName)}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              fontWeight: theme => theme.typography.fontWeightMedium,
                              borderRadius: theme => theme.spacing(1)
                            }}
                          />
                        ))
                      ) : userData.role ? (
                        <Chip
                          label={getRoleLabel(userData.role)}
                          color={getRoleColor(userData.role)}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontWeight: theme => theme.typography.fontWeightMedium,
                            borderRadius: theme => theme.spacing(1)
                          }}
                        />
                      ) : (
                        <Chip
                          label="Sin permisos"
                          color="default"
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontWeight: theme => theme.typography.fontWeightMedium,
                            borderRadius: theme => theme.spacing(1)
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ py: theme => theme.spacing(2) }}>
                    <Chip
                      label={userData.status === 1 ? 'Activo' : 'Inactivo'}
                      color={userData.status === 1 ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        fontWeight: theme => theme.typography.fontWeightMedium,
                        borderRadius: theme => theme.spacing(1)
                      }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ py: theme => theme.spacing(2) }}>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Editar usuario">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(userData)}
                          sx={{ color: 'primary.main' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={userData.status === 1 ? 'Desactivar' : 'Activar'}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleStatus(userData.email, userData.status)}
                          sx={{ color: userData.status === 1 ? 'error.main' : 'success.main' }}
                        >
                          {userData.status === 1 ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Ver historial">
                        <IconButton
                          size="small"
                          onClick={() => handleToggleAccessHistory()}
                          sx={{ color: 'info.main' }}
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: theme => theme.spacing(3) }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(event, value) => setCurrentPage(value)}
              color="primary"
              size="large"
            />
          </Box>
        )}
      </Paper>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: theme => theme.spacing(2),
            border: theme => `1px solid ${theme.palette.divider}`
          }
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: 'action.hover',
            borderBottom: theme => `1px solid ${theme.palette.divider}`,
            p: theme => theme.spacing(3)
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: theme => theme.typography.fontWeightBold,
              color: 'text.primary'
            }}
          >
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: theme => theme.spacing(3) }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              variant="outlined"
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
              variant="outlined"
              disabled={!!editingUser}
            />
            <TextField
              label={editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
              required={!editingUser}
              variant="outlined"
            />
            <Divider />
            <Typography
              variant="h6"
              sx={{
                fontWeight: theme => theme.typography.fontWeightSemiBold,
                color: 'text.primary'
              }}
            >
              Permisos
            </Typography>
            <FormGroup>
              {availablePermissions.map((permission) => {
                const permissionName = typeof permission === 'string' ? permission : permission.Name || permission.name;
                return (
                  <FormControlLabel
                    key={permissionName}
                    control={
                      <Checkbox
                        checked={formData.permissions.includes(permissionName)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              permissions: [...formData.permissions, permissionName]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              permissions: formData.permissions.filter(p => p !== permissionName)
                            });
                          }
                        }}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {getPermissionLabel(permissionName)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {getPermissionDescription(permissionName)}
                        </Typography>
                      </Box>
                    }
                  />
                );
              })}
            </FormGroup>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            p: theme => theme.spacing(3),
            borderTop: theme => `1px solid ${theme.palette.divider}`,
            bgcolor: 'action.hover'
          }}
        >
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            sx={{
              fontWeight: theme => theme.typography.fontWeightSemiBold,
              px: theme => theme.spacing(3),
              borderRadius: theme => theme.spacing(1)
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{
              fontWeight: theme => theme.typography.fontWeightSemiBold,
              px: theme => theme.spacing(3),
              borderRadius: theme => theme.spacing(1)
            }}
          >
            {editingUser ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
    );
  };

  return renderContent();
};

export default AdminPanel;