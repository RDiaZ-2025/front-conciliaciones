import { apiRequest } from './baseApiService';

export const authService = {
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