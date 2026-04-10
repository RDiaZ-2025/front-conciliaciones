import { Request, Response } from 'express';
import { PermissionService } from '../services/permissionService';
import { asyncHandler } from "../utils/asyncHandler";

const permissionService = new PermissionService();

export const getAllPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
const permissions = await permissionService.getAllPermissions();
    res.json({
      success: true,
      data: permissions
    });
});

export const createPermission = asyncHandler(async (req: Request, res: Response): Promise<void> => {
const permission = await permissionService.createPermission(req.body);
    res.status(201).json({
      success: true,
      data: permission
    });
});

export const updatePermission = asyncHandler(async (req: Request, res: Response): Promise<void> => {
const id = parseInt(req.params.id);
    const permission = await permissionService.updatePermission(id, req.body);
    
    if (!permission) {
      res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
      return;
    }

    res.json({
      success: true,
      data: permission
    });
});

export const deletePermission = asyncHandler(async (req: Request, res: Response): Promise<void> => {
const id = parseInt(req.params.id);
    const success = await permissionService.deletePermission(id);
    
    if (!success) {
      res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Permission deleted successfully'
    });
});
