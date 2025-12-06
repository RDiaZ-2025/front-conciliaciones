import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from '../constants/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

const normalizePermissions = perms => perms.map(p => p.toLowerCase());

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({});

  useEffect(() => {
    try {
      localStorage.setItem('claromedia_users', JSON.stringify(users));
    } catch (error) {
      // Silent fail
    }
  }, [users]);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('user');
      if (token) {
        try {
          const userData = await authService.verifyToken();
          // Normalizar permisos a minúsculas
          const normalizedUser = {
            ...userData.data || userData,
            permissions: userData.data?.permissions ? normalizePermissions(userData.data.permissions) : (userData.permissions ? normalizePermissions(userData.permissions) : [])
          };
          setUser(normalizedUser);
        } catch (error) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login({ email, password });
      
      if (response.success) {
        const userData = {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          permissions: response.user.permissions,
          role: ROLES.ADMIN
        };
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
        if (response.token) {
          localStorage.setItem('auth_token', response.token);
        }
        
        const loginRecord = {
          userId: userData.id,
          email: userData.email,
          loginTime: new Date().toISOString(),
          timestamp: Date.now()
        };
        
        const frontendHistory = JSON.parse(localStorage.getItem('frontend_login_history') || '[]');
        frontendHistory.push(loginRecord);
        
        if (frontendHistory.length > 100) {
          frontendHistory.splice(0, frontendHistory.length - 100);
        }
        
        localStorage.setItem('frontend_login_history', JSON.stringify(frontendHistory));
        
        return { success: true };
      } else {
        throw new Error(response.message || 'Credenciales inválidas');
      }
    } catch (error) {
      throw new Error(error.message || 'Error de conexión');
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Silent fail
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
    }
  };

  const hasPermission = (permission) => {
    if (!user) {
      return false;
    }
    
    // Mapeo de permisos del backend a permisos del frontend
    const permissionMapping = {
      [PERMISSIONS.ADMIN_PANEL]: ['admin_panel', 'ADMIN_PANEL'],
      [PERMISSIONS.DOCUMENT_UPLOAD]: ['document_upload', 'DOCUMENT_UPLOAD'],
      [PERMISSIONS.MANAGEMENT_DASHBOARD]: ['management_dashboard', 'MANAGEMENT_DASHBOARD'],
      [PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES]: ['historial_carga_archivos_comerciales', 'HISTORIAL_CARGA_ARCHIVOS_COMERCIALES', 'history_load_commercial_files', 'HISTORY_LOAD_COMMERCIAL_FILES'],
      [PERMISSIONS.PRODUCTION_MANAGEMENT]: ['production_management', 'PRODUCTION_MANAGEMENT', 'PRODUCTION']
    };
    if (user.permissions && Array.isArray(user.permissions)) {
      const mappedPermissions = permissionMapping[permission] || [permission];
      const hasPermissionResult = mappedPermissions.some(mappedPerm => user.permissions.includes(mappedPerm));
      if (!hasPermissionResult) {
        return mappedPermissions.some(mappedPerm => user.permissions.some(up => up.toLowerCase() === mappedPerm.toLowerCase()));
      }
      return hasPermissionResult;
    }
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    const roleResult = userPermissions.includes(permission);
    return roleResult;
  };

  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };

  const getUserPermissions = () => {
    if (!user) return [];
    if (user.permissions && Array.isArray(user.permissions)) {
      return user.permissions;
    }
    return ROLE_PERMISSIONS[user.role] || [];
  };

  const createUser = async (userData) => {
    if (!hasPermission(PERMISSIONS.ADMIN_PANEL)) {
      throw new Error('No tienes permisos para crear usuarios');
    }
    
    try {
      const newUser = await userService.createUser({
        ...userData,
        createdAt: new Date().toISOString()
      });
      
      setUsers(prev => ({
        ...prev,
        [newUser.email]: newUser
      }));
      
      return newUser;
    } catch (error) {
      const newUser = {
        ...userData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        lastLogin: null
      };
      
      setUsers(prev => ({
        ...prev,
        [newUser.email]: newUser
      }));
      
      return newUser;
    }
  };

  const updateUser = async (email, updates) => {
    if (!hasPermission(PERMISSIONS.ADMIN_PANEL)) {
      throw new Error('No tienes permisos para editar usuarios');
    }
    try {
      const currentUser = users[email] || users[email?.toLowerCase()] || users[email?.toUpperCase()];
      if (!currentUser) {
        throw new Error('Usuario no encontrado');
      }
      const updatedUser = await userService.updateUser(currentUser.id, updates);
      setUsers(prev => ({
        ...prev,
        [email]: {
          ...prev[email],
          ...updates
        }
      }));
      return updatedUser;
    } catch (error) {
      setUsers(prev => ({
        ...prev,
        [email]: {
          ...prev[email],
          ...updates
        }
      }));
      return { ...users[email], ...updates };
    }
  };

  const toggleUserStatus = async (email) => {
    if (!hasPermission(PERMISSIONS.ADMIN_PANEL)) {
      throw new Error('No tienes permisos para cambiar el estado de usuarios');
    }
    if (user && user.email === email) {
      throw new Error('No puedes cambiar tu propio estado');
    }
    try {
      const response = await userService.getAllUsers();
      const allUsers = response.data || response;
      if (!Array.isArray(allUsers)) {
        throw new Error('La respuesta de la API no contiene un array de usuarios válido');
      }
      const currentUser = allUsers.find(u => u.email?.toLowerCase() === email?.toLowerCase());
      if (!currentUser) {
        throw new Error('Usuario no encontrado en la base de datos');
      }
      if (currentUser.email === user?.email) {
        throw new Error('No puedes cambiar tu propio estado');
      }
      // Usar el nuevo método de apiService
      const result = await userService.toggleUserStatus(currentUser.id);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const getAllUsers = async () => {
    if (!hasPermission(PERMISSIONS.ADMIN_PANEL)) {
      throw new Error('No tienes permisos para ver usuarios');
    }
    
    try {
      const response = await userService.getAllUsers();
      const apiUsers = response.data || response;
      
      if (!Array.isArray(apiUsers)) {
        throw new Error('La respuesta de la API no contiene un array de usuarios válido');
      }
      
      const usersMap = {};
      apiUsers.forEach(user => {
        usersMap[user.email] = user;
      });
      
      setUsers(usersMap);
      
      return apiUsers;
    } catch (error) {
      return Object.values(users).map(({ password, ...userWithoutPassword }) => userWithoutPassword);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    hasRole,
    getUserPermissions,
    createUser,
    updateUser,
    // Remove all references to deleteUser (function definitions, imports, and usages)
    toggleUserStatus,
    getAllUsers
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;