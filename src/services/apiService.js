// Servicio para conectar con la base de datos real
// Configura aquí la URL de tu API backend

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
console.log('🔧 API_BASE_URL configurada:', API_BASE_URL);

// Función helper para manejar respuestas de la API
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error de conexión' }));
    throw new Error(error.message || 'Error en la solicitud');
  }
  return response.json();
};

// Función helper para hacer peticiones con headers comunes
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  };

  // Agregar token de autorización si existe
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, config);
  return handleResponse(response);
};

// Servicios de autenticación
export const authService = {
  // Login de usuario
  login: async (credentials) => {
    console.log('🔍 apiService.login: Credenciales recibidas:', credentials);
    const { email, password } = credentials;
    console.log('🔍 apiService.login: Datos extraídos:', { email, password, emailType: typeof email, passwordType: typeof password });
    
    const requestBody = { email, password };
    console.log('🔍 apiService.login: Body a enviar:', requestBody);
    console.log('🔍 apiService.login: Body JSON:', JSON.stringify(requestBody));
    
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    // Guardar token si viene en la respuesta
    if (response.token) {
      localStorage.setItem('auth_token', response.token);
    }
    
    return response;
  },

  // Logout de usuario
  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Error al hacer logout en el servidor:', error);
    } finally {
      localStorage.removeItem('auth_token');
    }
  },

  // Verificar token actual
  verifyToken: async () => {
    return apiRequest('/auth/verify');
  },
};

// Servicios de gestión de usuarios
export const userService = {
  // Obtener todos los usuarios
  getAllUsers: async () => {
    return apiRequest('/users');
  },

  // Crear nuevo usuario
  createUser: async (userData) => {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Actualizar usuario
  updateUser: async (userId, updates) => {
    return apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Habilitar/deshabilitar usuario
  toggleUserStatus: async (userId) => {
    return apiRequest(`/users/${userId}/toggle-status`, {
      method: 'PUT',
    });
  },

  // Obtener usuario por ID
  getUserById: async (userId) => {
    return apiRequest(`/users/${userId}`);
  },

  // Actualizar rol de usuario
  updateUserRole: async (userId, role) => {
    return await apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },
};



// Función para configurar la URL base de la API
export const setApiBaseUrl = (url) => {
  API_BASE_URL = url;
};

// Función para obtener la URL base actual
export const getApiBaseUrl = () => {
  return API_BASE_URL;
};

export default {
  auth: authService,
  users: userService,
  setApiBaseUrl,
  getApiBaseUrl,
};