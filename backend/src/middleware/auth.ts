import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { JWTPayload } from '../types';

// Extender la interfaz Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
    return;
  }

  const decoded = AuthService.verifyToken(token);
  
  if (!decoded) {
    res.status(403).json({
      success: false,
      message: 'Token inválido o expirado'
    });
    return;
  }

  req.user = decoded;
  next();
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = AuthService.verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
};

// Middleware para verificar permisos específicos
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log(`requirePermission called for: ${permission}`);
      
      if (!req.user) {
        console.log('No user in request - authentication failed');
        res.status(401).json({
          success: false,
          message: 'Token de acceso requerido'
        });
        return;
      }

      console.log(`User authenticated: ${req.user.userId}, checking permissions...`);
      
      // Obtener permisos del usuario desde la base de datos
      const userPermissions = await AuthService.getUserPermissions(req.user.userId);
      
      console.log(`User permissions: ${userPermissions.join(', ')}`);
      
      // Comparar directamente con los permisos de la base de datos
      if (!userPermissions.includes(permission)) {
        console.log(`Permission denied: user does not have ${permission}`);
        res.status(403).json({
          success: false,
          message: `Permiso requerido: ${permission}`
        });
        return;
      }

      console.log(`Permission granted: ${permission}`);
      next();
    } catch (error) {
      console.error('Error verificando permisos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
};

// Middleware para verificar múltiples permisos (requiere al menos uno)
export const requireAnyPermission = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Token de acceso requerido'
        });
        return;
      }

      // Obtener permisos del usuario desde la base de datos
      const userPermissions = await AuthService.getUserPermissions(req.user.userId);
      
      const hasPermission = permissions.some(permission => userPermissions.includes(permission));
      
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: `Se requiere uno de los siguientes permisos: ${permissions.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error verificando permisos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
};

// Middleware para verificar múltiples permisos (requiere todos)
export const requireAllPermissions = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Token de acceso requerido'
        });
        return;
      }

      // Obtener permisos del usuario desde la base de datos
      const userPermissions = await AuthService.getUserPermissions(req.user.userId);
      
      const hasAllPermissions = permissions.every(permission => userPermissions.includes(permission));
      
      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(permission => !userPermissions.includes(permission));
        res.status(403).json({
          success: false,
          message: `Permisos faltantes: ${missingPermissions.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error verificando permisos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
};