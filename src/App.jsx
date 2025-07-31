import React, { useState } from 'react';
import DashboardGeneral from './components/DashboardGeneral';
import Login from './components/Login';
import UploadForm from './components/UploadForm';
import DarkModeToggle from './components/DarkModeToggle';

function App() {
  const [currentView, setCurrentView] = useState('upload'); // 'upload', 'login', 'dashboard'
  const [darkMode, setDarkMode] = useState(false);

  const handleUploadComplete = () => {
    setCurrentView('login');
  };

  const handleLogin = () => {
    setCurrentView('dashboard');
  };

  const handleBackToUpload = () => {
    setCurrentView('upload');
  };

  const handleBackToLogin = () => {
    setCurrentView('login');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'upload':
        return (
          <UploadForm 
            onUploadComplete={handleUploadComplete}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        );
      case 'login':
        return (
          <Login 
            onLogin={handleLogin} 
            onBack={handleBackToUpload}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        );
      case 'dashboard':
        return (
          <DashboardGeneral 
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onBack={handleBackToLogin}
          />
        );
      default:
        return (
          <UploadForm 
            onUploadComplete={handleUploadComplete}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        );
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: darkMode ? '#181C32' : '#f8fafc', transition: 'background 0.3s' }}>
      {renderCurrentView()}
    </div>
  );
}

export default App;
