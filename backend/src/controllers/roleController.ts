import { Request, Response } from 'express';
import { RoleService } from '../services/roleService';

export class RoleController {
    static async getAllRoles(req: Request, res: Response): Promise<void> {
        try {
            const roles = await RoleService.getAllRoles();
            res.status(200).json({
                success: true,
                data: roles
            });
        } catch (error) {
            console.error('Error getting roles:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    static async getRoleById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const role = await RoleService.getRoleById(parseInt(id));

            if (!role) {
                res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: role
            });
        } catch (error) {
            console.error('Error getting role:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}
