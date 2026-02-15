import { Request, Response } from 'express';

export const getAllStatuses = async (req: Request, res: Response) => {
  try {
    // Hardcoded statuses since Status table is removed
    const statuses = [
      { id: 1, name: 'Solicitud', code: 'request', order: 1 },
      { id: 11, name: 'En Venta', code: 'in_sell', order: 2 },
      { id: 12, name: 'Obtener Datos', code: 'get_data', order: 3 },
      { id: 2, name: 'Cotización', code: 'quotation', order: 4 },
      { id: 3, name: 'Ajuste de Material', code: 'material_adjustment', order: 5 },
      { id: 4, name: 'Pre-producción', code: 'pre_production', order: 4 },
      { id: 5, name: 'En Producción', code: 'in_production', order: 5 },
      { id: 6, name: 'En Edición', code: 'in_editing', order: 6 },
      { id: 7, name: 'Entrega para Aprobación', code: 'delivered_approval', order: 7 },
      { id: 8, name: 'Aprobado por Cliente', code: 'client_approved', order: 8 },
      { id: 9, name: 'Completado', code: 'completed', order: 9 },
      { id: 10, name: 'Cancelado', code: 'cancelled', order: 10 }
    ];

    res.json(statuses);
  } catch (error) {
    console.error('Error fetching statuses:', error);
    res.status(500).json({ message: 'Error fetching statuses' });
  }
};
