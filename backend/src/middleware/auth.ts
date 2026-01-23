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

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Token no proporcionado'
    });
    return;
  }

  try {
    const decoded = await AuthService.verifyToken(token);

    if (!decoded) {
      res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Token inválido o expirado'
    });
    return;
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = await AuthService.verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    } catch (error) {
      // Si el token es inválido en optionalAuth, simplemente continuamos sin usuario autenticado
      console.warn('Token inválido en optionalAuth:', error);
    }
  }

  next();
};

// Middleware para verificar permisos específicos
export const requirePermission = (permission: string) => {
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


      // Comparar directamente con los permisos de la base de datos
      if (!userPermissions.includes(permission)) {
        res.status(403).json({
          success: false,
          message: `Permiso requerido: ${permission}`
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