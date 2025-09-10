import React, { useState, useEffect } from 'react';
import AuthProvider, { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardGeneral from './pages/DashboardGeneral';
import Login from './pages/Login';
import UploadForm from './pages/UploadForm';
import AdminPanel from './pages/AdminPanel';
import DarkModeToggle from './components/DarkModeToggle';
import { PERMISSIONS } from './constants/auth';

// Componente interno que maneja la lógica de navegación
function AppContent() {
  const { user, logout, hasPermission } = useAuth();
  const [currentView, setCurrentView] = useState('login');
  const [darkMode, setDarkMode] = useState(false);

  // Efecto para manejar la navegación basada en el usuario logueado
  useEffect(() => {
    if (user) {
      // Determinar la vista inicial basada en los permisos del usuario
      if (hasPermission(PERMISSIONS.ADMIN_PANEL)) {
        setCurrentView('admin'); // Admin va directo al panel de administración
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

  const renderCurrentView = () => {
    
    switch (currentView) {
      case 'login':
        return (
          <Login 
            onLogin={handleLogin} 
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
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
        return (
          <ProtectedRoute 
            requiredPermission={PERMISSIONS.ADMIN_PANEL}
            darkMode={darkMode}
            onUnauthorized={handleUnauthorized}
          >
            <AdminPanel
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              onBack={handleBackToLogin}
              onGoToUpload={() => setCurrentView('upload')}
              onGoToDashboard={() => setCurrentView('dashboard')}
            />
          </ProtectedRoute>
        );

      default:
        return (
          <Login 
            onLogin={handleLogin}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        );
    }
  };

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100vh', 
      minHeight: '100vh', 
      background: darkMode ? '#181C32' : '#f8fafc', 
      transition: 'background 0.3s',
      margin: 0,
      padding: 0
    }}>
      {renderCurrentView()}
    </div>
  );
}

// Componente principal que envuelve todo en el AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
