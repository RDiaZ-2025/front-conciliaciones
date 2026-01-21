import { Request, Response } from 'express';
import { PermissionService } from '../services/permissionService';

const permissionService = new PermissionService();

export const getAllPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await permissionService.getAllPermissions();
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching permissions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createPermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const permission = await permissionService.createPermission(req.body);
    res.status(201).json({
      success: true,
      data: permission
    });
  } catch (error) {
    console.error('Error creating permission:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating permission',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updatePermission = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    console.error('Error updating permission:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating permission',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deletePermission = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    console.error('Error deleting permission:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting permission',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
