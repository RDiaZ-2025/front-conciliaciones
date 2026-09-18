import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { systemModuleService } from '../services/system_module.service';

export class SystemModulesController {
  getSystemModules = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const response = await systemModuleService.getSystemModules();
    res.status(200).json(response);
  });

  updateModuleState = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { code } = req.params;
    const { is_under_maintenance, maintenance_message, is_disabled } = req.body;

    const result = await systemModuleService.updateModuleState(code, {
      is_under_maintenance,
      maintenance_message,
      is_disabled
    });

    res.status(200).json(result);
  });
}
