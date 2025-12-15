import { Request, Response } from 'express';
import { LoadDocumentsOCbyUser, User } from '../models';
import { AppDataSource } from '../config/typeorm.config';

export class LoadDocumentsOCbyUserController {
  static async registerUpload(req: Request, res: Response): Promise<void> {
    try {
      if (!AppDataSource.isInitialized) {
        res.status(503).json({ success: false, message: 'Base de datos no disponible' });
        return;
      }
      
      const { iduser, idfolder, fecha, status, filename } = req.body;
      if (!iduser || !idfolder || !fecha || !filename) {
        res.status(400).json({ success: false, message: 'iduser, idfolder, fecha y filename son requeridos' });
        return;
      }
      
      const loadDocumentsRepository = AppDataSource.getRepository(LoadDocumentsOCbyUser);
      
      const newDocument = loadDocumentsRepository.create({
        idUser: iduser,
        idFolder: idfolder,
        fecha: new Date(fecha),
        status: status ?? null,
        fileName: filename
      });
      
      const savedDocument = await loadDocumentsRepository.save(newDocument);
      
      res.status(201).json({ success: true, id: savedDocument.id });
    } catch (error) {
      console.error('Error registrando documento:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  static async getUploads(req: Request, res: Response): Promise<void> {
    try {
      if (!AppDataSource.isInitialized) {
        res.status(503).json({ success: false, message: 'Base de datos no disponible' });
        return;
      }
      
      const { iduser } = req.query;
      const loadDocumentsRepository = AppDataSource.getRepository(LoadDocumentsOCbyUser);
      
      let whereCondition = {};
      if (iduser) {
        whereCondition = { idUser: parseInt(iduser as string) };
      }
      
      const documents = await loadDocumentsRepository.find({
        where: whereCondition,
        relations: ['user'],
        select: {
          id: true,
          idUser: true,
          idFolder: true,
          fecha: true,
          status: true,
          fileName: true,
          user: {
            email: true,
            name: true
          }
        }
      });
      
      const formattedData = documents.map(doc => ({
        Id: doc.id,
        IdUser: doc.idUser,
        IdFolder: doc.idFolder,
        UserEmail: doc.user?.email || null,
        UserName: doc.user?.name || null,
        Fecha: doc.fecha,
        Status: doc.status,
        FileName: doc.fileName
      }));
      
      res.status(200).json({ success: true, data: formattedData });
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error consultando documentos:', error.message, error.stack);
      } else {
        console.error('Error consultando documentos:', error);
      }
      res.status(500).json({ success: false, message: 'Error interno del servidor', error: error instanceof Error ? error.message : String(error) });
    }
  }
}