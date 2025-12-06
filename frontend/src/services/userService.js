import { apiRequest } from './baseApiService';

export const userService = {
  getAllUsers: async () => {
    return apiRequest('/users');
  },

  createUser: async (userData) => {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (userId, updates) => {
    return apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  toggleUserStatus: async (userId) => {
    return apiRequest(`/users/${userId}/toggle-status`, {
      method: 'PUT',
    });
  },

  getUserById: async (userId) => {
    return apiRequest(`/users/${userId}`);
  },

  getAllPermissions: async () => {
    return apiRequest('/users/permissions/all');
  },
};

export default userService;
