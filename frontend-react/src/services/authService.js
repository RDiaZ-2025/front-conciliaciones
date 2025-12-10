import { apiRequest } from './baseApiService';

export const authService = {
  login: async (credentials) => {
    const { email, password } = credentials;
    
    const requestBody = { email, password };
    
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    if (response.token) {
      localStorage.setItem('auth_token', response.token);
    }
    
    return response;
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Error al hacer logout en el servidor:', error);
    } finally {
      localStorage.removeItem('auth_token');
    }
  },

  verifyToken: async () => {
    return apiRequest('/auth/verify');
  },
};

export default authService;