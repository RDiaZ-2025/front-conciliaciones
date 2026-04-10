
import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { asyncHandler } from "../utils/asyncHandler";

export class UserController {
  private userService = new UserService();

  getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const users = await this.userService.getAllUsers();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.status(200).json({ success: true, data: users });
  });

  getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = await this.userService.getUserById(parseInt(id));
    if (!user) {
      res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      return;
    }
    res.status(200).json({ success: true, data: user });
  });

  getAllPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const permissions = await this.userService.getAllPermissions();
    res.status(200).json({ success: true, data: permissions });
  });

  updateUserPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { permissions } = req.body;
    await this.userService.updateUserPermissions(parseInt(id), permissions);
    res.status(200).json({ success: true, message: 'Permisos actualizados correctamente' });
  });

  createUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, permissions = [], teamId, bossId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Nombre, email y contraseña son requeridos' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: 'Formato de email inválido' });
      return;
    }

    const result = await this.userService.createUser({
      name,
      email: email.toLowerCase(),
      password,
      permissions,
      teamId,
      bossId
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  });

  updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, email, password, permissions, teamId, bossId } = req.body;

    const result = await this.userService.updateUser(parseInt(id), {
      name,
      email,
      password,
      permissions,
      teamId,
      bossId
    });

    if (result.success) {
      const updatedUser = await this.userService.getUserById(parseInt(id));
      res.status(200).json({ ...result, user: updatedUser });
    } else {
      res.status(400).json(result);
    }
  });

  toggleUserStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const result = await this.userService.toggleUserStatus(parseInt(id));
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  });
}
