let API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:22741/api';
console.log('🔧 API_BASE_URL configurada:', API_BASE_URL);

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error de conexión' }));
    throw new Error(error.message || 'Error en la solicitud');
  }
  return response.json();
};

export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  };

  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, config);
  return handleResponse(response);
};

export const getApiBaseUrl = () => {
  return API_BASE_URL;
};

export const setApiBaseUrl = (url) => {
  API_BASE_URL = url;
};