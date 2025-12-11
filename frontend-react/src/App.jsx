import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Avatar } from '@mui/material';
import AuthProvider, { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import DashboardGeneral from './pages/DashboardGeneral';
import Login from './pages/Login';
import UploadForm from './pages/UploadForm';
import AdminPanel from './pages/AdminPanel';
import Production from './pages/Production/Production';
import LoadDocumentsOCbyUserView from './pages/LoadDocumentsOCbyUserView';
import Portada15Minutos from './pages/Portada15Minutos';
import MenuManagement from './pages/MenuManagement';
import DarkModeToggle from './components/DarkModeToggle';
import logoClaroMedia from '/claro-media-logo.png';
import { PERMISSIONS } from './constants/auth';
import createAppTheme from './styles/theme';

// Componente interno que maneja la lógica de navegación
function AppContent() {
  const { user, logout, hasPermission } = useAuth();
  const [currentView, setCurrentView] = useState('login');
  const [selectedMenu, setSelectedMenu] = useState('usuarios');
  const [darkMode, setDarkMode] = useState(false);

  // Efecto para manejar la navegación basada en el usuario logueado
  useEffect(() => {
    if (user) {
      // Determinar la vista inicial basada en los permisos del usuario
      if (hasPermission(PERMISSIONS.ADMIN_PANEL)) {
        setCurrentView('admin'); // Admin va directo al panel de administración
      } else if (hasPermission(PERMISSIONS.PRODUCTION_MANAGEMENT)) {
        setCurrentView('production'); // Usuario con permisos de producción
      } else if (hasPermission(PERMISSIONS.DOCUMENT_UPLOAD)) {
        setCurrentView('upload'); // Usuario con permisos de carga
      } else if (hasPermission(PERMISSIONS.MANAGEMENT_DASHBOARD)) {
        setCurrentView('dashboard'); // Usuario solo dashboard
      } else {
        setCurrentView('login'); // Sin permisos, volver al login
      }
    } else {
      setCurrentView('login');
    }
  }, [user, hasPermission]);

  const handleLogin = () => {
    // La navegación se maneja automáticamente en el useEffect
    // cuando el usuario se autentica exitosamente
  };

  const handleLogout = () => {
    logout();
    setCurrentView('login');
  };

  const handleUploadComplete = () => {
    if (hasPermission(PERMISSIONS.MANAGEMENT_DASHBOARD)) {
      setCurrentView('dashboard');
    }
  };

  const handleBackToLogin = () => {
    handleLogout();
  };

  const handleBackToUpload = () => {
    if (hasPermission(PERMISSIONS.DOCUMENT_UPLOAD)) {
      setCurrentView('upload');
    }
  };

  const handleGoToAdmin = () => {
    if (hasPermission(PERMISSIONS.ADMIN_PANEL)) {
      setCurrentView('admin');
    }
  };

  const handleUnauthorized = () => {
    // Redirigir a la vista apropiada basada en permisos
    if (hasPermission(PERMISSIONS.ADMIN_PANEL)) {
      setCurrentView('admin');
    } else if (hasPermission(PERMISSIONS.DOCUMENT_UPLOAD)) {
      setCurrentView('upload');
    } else if (hasPermission(PERMISSIONS.MANAGEMENT_DASHBOARD)) {
      setCurrentView('dashboard');
    } else {
      handleLogout();
    }
  };

  const handleMenuSelect = (menuId) => {

    // Map menu labels to view IDs
    const menuLabelToViewMap = {
      'Historial Carga Archivos': 'historial',
      'Cargar Documentos': 'upload',
      'Dashboard de Gestión': 'dashboard',
      'Producción': 'production',
      'Portada 15 Minutos': 'portada15',
      'Gestión de Menús': 'menu-management',
      'Usuarios': 'admin'
    };

    // Get the view ID from the menu label
    const viewId = menuLabelToViewMap[menuId] || menuId;


    // Check if user has permission for the selected menu
    const hasRequiredPermission = checkMenuPermission(viewId);

    if (!hasRequiredPermission) {
      console.warn(`User does not have permission for menu: ${menuId}`);
      return;
    }

    setCurrentView(viewId);
  };

  const checkMenuPermission = (menuId) => {
    const permissionMap = {
      'historial': PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES,
      'upload': PERMISSIONS.DOCUMENT_UPLOAD,
      'dashboard': PERMISSIONS.MANAGEMENT_DASHBOARD,
      'production': PERMISSIONS.PRODUCTION_MANAGEMENT,
      'portada15': PERMISSIONS.PORTADA_15_MINUTOS,
      'menu-management': PERMISSIONS.MANAGE_MENUS,
      'admin': PERMISSIONS.ADMIN_PANEL,
      'usuarios': PERMISSIONS.ADMIN_PANEL
    };

    const requiredPermission = permissionMap[menuId];
    return requiredPermission ? hasPermission(requiredPermission) : true;
  };

  // Add useEffect to track state changes
  useEffect(() => {
  }, [currentView, selectedMenu]);

  const renderAuthenticatedContent = () => {
    switch (currentView) {
      case 'historial':
        return (
          <ProtectedRoute
            requiredPermission={PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES}
            darkMode={darkMode}
            onUnauthorized={handleUnauthorized}
          >
            <LoadDocumentsOCbyUserView
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              onBack={handleBackToLogin}
            />
          </ProtectedRoute>
        );
      case 'production':
        return (
          <ProtectedRoute
            requiredPermission={PERMISSIONS.PRODUCTION_MANAGEMENT}
            darkMode={darkMode}
            onUnauthorized={handleUnauthorized}
          >
            <Production
              darkMode={darkMode}
            />
          </ProtectedRoute>
        );
      case 'portada15':
        return (
          <ProtectedRoute
            requiredPermission={PERMISSIONS.PORTADA_15_MINUTOS}
            darkMode={darkMode}
            onUnauthorized={handleUnauthorized}
          >
            <Portada15Minutos />
          </ProtectedRoute>
        );
      case 'menu-management':
        return (
          <ProtectedRoute
            requiredPermission={PERMISSIONS.MANAGE_MENUS}
            darkMode={darkMode}
            onUnauthorized={handleUnauthorized}
          >
            <MenuManagement />
          </ProtectedRoute>
        );
      case 'upload':
        return (
          <ProtectedRoute
            requiredPermission={PERMISSIONS.DOCUMENT_UPLOAD}
            darkMode={darkMode}
            onUnauthorized={handleUnauthorized}
          >
            <UploadForm
              onUploadComplete={handleUploadComplete}
              onBackToLogin={handleBackToLogin}
              onGoToAdmin={handleGoToAdmin}
              onGoToProduction={() => setCurrentView('production')}
              onGoToDashboard={() => setCurrentView('dashboard')}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          </ProtectedRoute>
        );
      case 'dashboard':
        return (
          <ProtectedRoute
            requiredPermission={PERMISSIONS.MANAGEMENT_DASHBOARD}
            darkMode={darkMode}
            onUnauthorized={handleUnauthorized}
          >
            <DashboardGeneral
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              onBack={handleBackToLogin}
              onGoToAdmin={handleGoToAdmin}
              onGoToUpload={handleBackToUpload}
            />
          </ProtectedRoute>
        );
      case 'admin':
      case 'usuarios':
        return (
          <ProtectedRoute
            requiredPermission={PERMISSIONS.ADMIN_PANEL}
            darkMode={darkMode}
            onUnauthorized={handleUnauthorized}
          >
            <AdminPanel
              selectedMenu={selectedMenu}
              onMenuSelect={handleMenuSelect}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              onBack={handleBackToLogin}
            />
          </ProtectedRoute>
        );
      default:
        console.warn(`Unknown view: ${currentView}`);
        return (
          <ProtectedRoute
            requiredPermission={PERMISSIONS.DOCUMENT_UPLOAD}
            darkMode={darkMode}
            onUnauthorized={handleUnauthorized}
          >
            <UploadForm
              onUploadComplete={handleUploadComplete}
              onBackToLogin={handleBackToLogin}
              onGoToAdmin={handleGoToAdmin}
              onGoToDashboard={() => setCurrentView('dashboard')}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          </ProtectedRoute>
        );
    }
  };

  const renderCurrentView = () => {
    if (currentView === 'login') {
      return (
        <Box sx={{ py: theme => theme.spacing(2) }}>
          <Login
            onLogin={handleLogin}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        </Box>
      );
    }

    // AdminPanel has its own Layout wrapper, so render it directly
    if (currentView === 'admin') {
      return renderAuthenticatedContent();
    }

    // Production page also has its own layout handling
    if (currentView === 'production') {
      return (
        <Layout
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onBack={handleBackToLogin}
          onMenuSelect={handleMenuSelect}
          fullWidth={true}
        >
          {renderAuthenticatedContent()}
        </Layout>
      );
    }

    return (
      <Layout
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onBack={handleBackToLogin}
        onMenuSelect={handleMenuSelect}
        fullWidth={true}
      >
        <Box sx={{ py: theme => theme.spacing(2) }}>
          {renderAuthenticatedContent()}
        </Box>
      </Layout>
    );
  };

  const theme = createAppTheme(darkMode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {renderCurrentView()}
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;