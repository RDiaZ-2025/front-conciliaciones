import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppDataSource } from '../config/typeorm.config';
import { ModuleState } from '../models/ModuleState';

export class SystemModulesController {
  getSystemModules = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }
    const moduleStateRepo = AppDataSource.getRepository(ModuleState);
    const statesList = await moduleStateRepo.find();
    const states = new Map(statesList.map(s => [s.code, s]));

    const getState = (code: string, label: string) => {
      const st = states.get(code);
      return {
        code,
        label,
        is_under_maintenance: st ? st.isUnderMaintenance : false,
        maintenance_message: st ? st.maintenanceMessage : "Módulo en mantenimiento",
        is_disabled: st ? st.isDisabled : false
      };
    };

    const response = [
      {
        name: "Portal",
        icon: "🏛️",
        submodules: [
          getState("dashboard", "Dashboard"),
          getState("ingresos", "Ingresos (Beta)"),
          getState("presupuesto", "Presupuesto (Beta)")
        ]
      },
      {
        name: "Mensajería",
        icon: "💬",
        submodules: [
          getState("segmentacion", "Segmentación Bases (Beta)"),
          getState("analisis", "Análisis SMS (Beta)")
        ]
      }
    ];

    res.status(200).json(response);
  });

  updateModuleState = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }
    const { code } = req.params;
    const { is_under_maintenance, maintenance_message, is_disabled } = req.body;

    const moduleStateRepo = AppDataSource.getRepository(ModuleState);
    let st = await moduleStateRepo.findOne({ where: { code } });

    if (!st) {
      st = new ModuleState();
      st.code = code;
    }

    if (is_under_maintenance !== undefined) st.isUnderMaintenance = !!is_under_maintenance;
    if (maintenance_message !== undefined) st.maintenanceMessage = maintenance_message;
    if (is_disabled !== undefined) st.isDisabled = !!is_disabled;

    await moduleStateRepo.save(st);

    res.status(200).json({
      code: st.code,
      is_under_maintenance: st.isUnderMaintenance,
      maintenance_message: st.maintenanceMessage,
      is_disabled: st.isDisabled
    });
  });
}
