import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthService } from '../services/auth.service';
import { LoginRequest } from '../types';

export class AuthController {
  private authService = new AuthService();
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
      return;
    }

    const result = await this.authService.login({ email, password });

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(401).json(result);
    }
  });

  me = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
      return;
    }

    const user = await this.authService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    const permissions = await this.authService.getUserPermissions(req.user.userId);
    const teams = await this.authService.getUserTeams(req.user.userId);

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        permissions: permissions,
        teams: teams,
        lastAccess: user.lastAccess
      }
    });
    return;
  });

  initializeUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const users = await this.authService.initializeUsers();
    res.status(200).json({
      success: true,
      message: 'Usuarios inicializados exitosamente',
      users
    });
  });

  async logout(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Logout exitoso'
    });
  }
}
