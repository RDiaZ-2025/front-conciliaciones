import { AppDataSource } from '../config/typeorm.config';
import { ModuleState } from '../models/ModuleState';

export interface ModuleStateResponse {
  code: string;
  is_under_maintenance: boolean;
  maintenance_message: string | null;
  is_disabled: boolean;
}

export interface ModuleStatusItem extends ModuleStateResponse {
  label: string;
}

export interface ModuleGroup {
  name: string;
  icon: string;
  submodules: ModuleStatusItem[];
}

export class SystemModuleService {
  /**
   * Obtiene la estructura de módulos del sistema con su estado actual de mantenimiento y disponibilidad
   */
  async getSystemModules(): Promise<ModuleGroup[]> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no inicializada');
    }

    const moduleStateRepo = AppDataSource.getRepository(ModuleState);
    const statesList = await moduleStateRepo.find();
    const states = new Map(statesList.map(s => [s.code, s]));

    const getState = (code: string, label: string): ModuleStatusItem => {
      const st = states.get(code);
      return {
        code,
        label,
        is_under_maintenance: st ? st.isUnderMaintenance : false,
        maintenance_message: st ? st.maintenanceMessage : "Módulo en mantenimiento",
        is_disabled: st ? st.isDisabled : false
      };
    };

    return [
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
  }

  /**
   * Actualiza o crea el estado operativo de un módulo
   */
  async updateModuleState(
    code: string,
    data: {
      is_under_maintenance?: boolean;
      maintenance_message?: string;
      is_disabled?: boolean;
    }
  ): Promise<ModuleStateResponse> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no inicializada');
    }

    const moduleStateRepo = AppDataSource.getRepository(ModuleState);
    let st = await moduleStateRepo.findOne({ where: { code } });

    if (!st) {
      st = new ModuleState();
      st.code = code;
    }

    if (data.is_under_maintenance !== undefined) st.isUnderMaintenance = !!data.is_under_maintenance;
    if (data.maintenance_message !== undefined) st.maintenanceMessage = data.maintenance_message;
    if (data.is_disabled !== undefined) st.isDisabled = !!data.is_disabled;

    await moduleStateRepo.save(st);

    return {
      code: st.code,
      is_under_maintenance: st.isUnderMaintenance,
      maintenance_message: st.maintenanceMessage,
      is_disabled: st.isDisabled
    };
  }
}

export const systemModuleService = new SystemModuleService();
