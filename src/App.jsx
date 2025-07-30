import React, { useState } from 'react';
import UploadForm from './components/UploadForm';
import Login from './components/Login';
import DashboardGeneral from './components/DashboardGeneral';
import loginIcon from './assets/CLARO_MEDIA_2_converted.jpg';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLoginClick = () => {
    setShowLogin(true);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowLogin(false);
  };

  if (isAuthenticated) {
    return <DashboardGeneral />;
  }

  return (
    <div className="App" style={{ position: 'relative', minHeight: '100vh' }}>
      {!showLogin && (
        <span
          style={{ position: 'absolute', top: 24, right: 32, width: 36, height: 36, zIndex: 2000, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={handleLoginClick}
          title="Iniciar sesión"
        >
          <img src={loginIcon} alt="Login" style={{ width: 36, height: 36, borderRadius: '50%' }} />
        </span>
      )}
      {showLogin ? <Login onLogin={handleLoginSuccess} onBack={() => setShowLogin(false)} /> : <UploadForm />}
    </div>
  );
}

export default App;
