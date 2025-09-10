import { Request, Response } from 'express';
import { getPool, sql } from '../config/database';

export class LoadDocumentsOCbyUserController {
  static async registerUpload(req: Request, res: Response): Promise<void> {
    try {
      const pool = getPool();
      if (!pool) {
        res.status(503).json({ success: false, message: 'Base de datos no disponible' });
        return;
      }
      const { iduser, idfolder, fecha, status, filename } = req.body;
      if (!iduser || !idfolder || !fecha || !filename) {
        res.status(400).json({ success: false, message: 'iduser, idfolder, fecha y filename son requeridos' });
        return;
      }
      const result = await pool.request()
        .input('IdUser', sql.Int, iduser)
        .input('IdFolder', sql.UniqueIdentifier, idfolder)
        .input('Fecha', sql.DateTime, fecha)
        .input('Status', sql.VarChar, status ?? null)
        .input('FileName', sql.VarChar, filename)
        .query('INSERT INTO LoadDocumentsOCbyUser (IdUser, IdFolder, Fecha, Status, FileName) OUTPUT INSERTED.Id VALUES (@IdUser, @IdFolder, @Fecha, @Status, @FileName)');
      res.status(201).json({ success: true, id: result.recordset[0].Id });
    } catch (error) {
      console.error('Error registrando documento:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  static async getUploads(req: Request, res: Response): Promise<void> {
    try {
      const pool = getPool();
      if (!pool) {
        res.status(503).json({ success: false, message: 'Base de datos no disponible' });
        return;
      }
      const { iduser } = req.query;
      let query = `SELECT ldc.Id, ldc.IdUser, ldc.IdFolder, u.Email as UserEmail, ldc.Fecha, ldc.Status, ldc.FileName
                   FROM LoadDocumentsOCbyUser ldc
                   LEFT JOIN USERS u ON ldc.IdUser = u.Id`;
      if (iduser) {
        query += ' WHERE ldc.IdUser = @IdUser';
      }
      const request = pool.request();
      if (iduser) {
        request.input('IdUser', sql.Int, iduser);
      }
      const result = await request.query(query);
      res.status(200).json({ success: true, data: result.recordset });
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