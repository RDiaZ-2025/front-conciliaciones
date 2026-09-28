import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { JWTPayload } from '../types';
const authService = new AuthService();

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
    const decoded = await authService.verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
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
      const decoded = await authService.verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    } catch (error) {

      console.warn('Token inválido en optionalAuth:', error);
    }
  }

  next();
};

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

      if (req.user.role?.toLowerCase() === 'admin') {
        next();
        return;
      }

      const userPermissions = await authService.getUserPermissions(req.user.userId);
      const hasPermission = userPermissions.some(p => p.toLowerCase() === permission.toLowerCase());

      if (!hasPermission) {
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

      if (req.user.role?.toLowerCase() === 'admin') {
        next();
        return;
      }

      const userPermissions = await authService.getUserPermissions(req.user.userId);
      const lowerUserPerms = userPermissions.map(p => p.toLowerCase());
      const hasPermission = permissions.some(p => lowerUserPerms.includes(p.toLowerCase()));

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

      if (req.user.role?.toLowerCase() === 'admin') {
        next();
        return;
      }

      const userPermissions = await authService.getUserPermissions(req.user.userId);
      const lowerUserPerms = userPermissions.map(p => p.toLowerCase());
      const hasAllPermissions = permissions.every(p => lowerUserPerms.includes(p.toLowerCase()));

      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(p => !lowerUserPerms.includes(p.toLowerCase()));
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

export const authenticateTokenOrWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
  const providedSecret = (req.headers['x-webhook-secret'] as string) || (req.headers['x-api-key'] as string);

  if (webhookSecret && providedSecret && providedSecret === webhookSecret) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Autenticación requerida (Token JWT o cabecera X-Webhook-Secret válida)'
    });
    return;
  }

  if (webhookSecret && token === webhookSecret) {
    return next();
  }

  try {
    const decoded = await authService.verifyToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};
