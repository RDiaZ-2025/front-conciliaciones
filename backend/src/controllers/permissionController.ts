import { Request, Response } from 'express';
import { Permission } from '../models';
import { AppDataSource } from '../config/typeorm.config';

export const getAllPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
      return;
    }

    const permissionRepository = AppDataSource.getRepository(Permission);
    
    const permissions = await permissionRepository.find({
      order: { name: 'ASC' }
    });

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
