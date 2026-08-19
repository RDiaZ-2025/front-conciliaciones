import { Request, Response } from 'express';
import { customerService } from '../services/customer.service';
import { asyncHandler } from '../utils/asyncHandler';

export class CustomerController {
  getCustomers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const search = req.query.search as string;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '10');
    const includeInactive = req.query.includeInactive === 'true';

    const result = await customerService.getCustomers({ search, page, limit, includeInactive });
    res.status(200).json({ success: true, ...result });
  });

  getCustomerById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const customer = await customerService.getCustomerById(id);
    if (!customer) {
      res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      return;
    }
    res.status(200).json({ success: true, data: customer });
  });

  createCustomer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const customer = await customerService.createCustomer(req.body);
      res.status(201).json({ success: true, data: customer });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Error al crear el cliente' });
    }
  });

  updateCustomer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    try {
      const customer = await customerService.updateCustomer(id, req.body);
      if (!customer) {
        res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        return;
      }
      res.status(200).json({ success: true, data: customer });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Error al actualizar el cliente' });
    }
  });

  deleteCustomer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const success = await customerService.deleteCustomer(id);
    if (!success) {
      res.status(404).json({ success: false, message: 'Cliente no encontrado o ya inactivo' });
      return;
    }
    res.status(200).json({ success: true, message: 'Cliente inactivado correctamente' });
  });

  bulkUpload = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { fileName, fileData } = req.body;
    if (!fileName || !fileData) {
      res.status(400).json({ success: false, message: 'Archivo y nombre de archivo son obligatorios' });
      return;
    }

    try {
      const fileBuffer = Buffer.from(fileData, 'base64');
      const results = await customerService.bulkUpload(fileBuffer, fileName);
      
      if ((results as any).validationFailed) {
        res.status(400).json({ 
          success: false, 
          message: 'El archivo contiene errores de validación y no se pudo procesar.',
          data: results 
        });
        return;
      }
      
      res.status(200).json({ success: true, data: results });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Error al procesar la carga masiva' });
    }
  });
}

export const customerController = new CustomerController();
