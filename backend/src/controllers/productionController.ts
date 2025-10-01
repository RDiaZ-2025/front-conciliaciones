import { Request, Response } from 'express';
import { getPool, sql } from '../config/database';

// Get all production requests
export const getAllProductionRequests = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const pool = getPool();
    
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }
    
    const result = await pool.request().query('SELECT * FROM production_requests ORDER BY requestDate DESC');
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error fetching production requests:', error);
    return res.status(500).json({ message: 'Error fetching production requests', error });
  }
};

// Get a single production request by ID
export const getProductionRequestById = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }
    
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT * FROM production_requests WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Production request not found' });
    }
    
    return res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching production request:', error);
    return res.status(500).json({ message: 'Error fetching production request', error });
  }
};

// Create a new production request
export const createProductionRequest = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      name,
      department,
      contactPerson,
      assignedTeam,
      deliveryDate,
      observations
    } = req.body;
    
    // Validate required fields
    if (!name || !department || !contactPerson || !assignedTeam) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const pool = getPool();
    
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }
    
    const requestDate = new Date().toISOString();
    const stage = 'request'; // Initial stage
    
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('requestDate', sql.DateTime, requestDate)
      .input('department', sql.NVarChar, department)
      .input('contactPerson', sql.NVarChar, contactPerson)
      .input('assignedTeam', sql.NVarChar, assignedTeam)
      .input('deliveryDate', sql.DateTime, deliveryDate)
      .input('observations', sql.NVarChar, observations)
      .input('stage', sql.NVarChar, stage)
      .query(`
        INSERT INTO production_requests 
        (name, requestDate, department, contactPerson, assignedTeam, deliveryDate, observations, stage) 
        OUTPUT INSERTED.id
        VALUES (@name, @requestDate, @department, @contactPerson, @assignedTeam, @deliveryDate, @observations, @stage)
      `);
    
    const newId = result.recordset[0].id;
    
    const newRequest = {
      id: newId,
      name,
      requestDate,
      department,
      contactPerson,
      assignedTeam,
      deliveryDate,
      observations,
      stage
    };
    
    return res.status(201).json(newRequest);
  } catch (error) {
    console.error('Error creating production request:', error);
    return res.status(500).json({ message: 'Error creating production request', error });
  }
};

// Update a production request
export const updateProductionRequest = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const {
      name,
      department,
      contactPerson,
      assignedTeam,
      deliveryDate,
      observations,
      stage
    } = req.body;
    
    // Validate required fields
    if (!name || !department || !contactPerson || !assignedTeam || !stage) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const pool = getPool();
    
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }
    
    // Check if request exists
    const checkResult = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT * FROM production_requests WHERE id = @id');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Production request not found' });
    }
    
    const existingRequest = checkResult.recordset[0];
    
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('name', sql.NVarChar, name)
      .input('department', sql.NVarChar, department)
      .input('contactPerson', sql.NVarChar, contactPerson)
      .input('assignedTeam', sql.NVarChar, assignedTeam)
      .input('deliveryDate', sql.DateTime, deliveryDate)
      .input('observations', sql.NVarChar, observations)
      .input('stage', sql.NVarChar, stage)
      .query(`
        UPDATE production_requests 
        SET name = @name, department = @department, contactPerson = @contactPerson, 
            assignedTeam = @assignedTeam, deliveryDate = @deliveryDate, 
            observations = @observations, stage = @stage
        WHERE id = @id
      `);
    
    const updatedRequest = {
      id,
      name,
      requestDate: existingRequest.requestDate,
      department,
      contactPerson,
      assignedTeam,
      deliveryDate,
      observations,
      stage
    };
    
    return res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Error updating production request:', error);
    return res.status(500).json({ message: 'Error updating production request', error });
  }
};

// Move a production request to the next stage
export const moveProductionRequest = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { stage } = req.body;
    
    // Validate stage
    const validStages = [
      'request',
      'quotation',
      'material_adjustment',
      'pre_production',
      'in_production',
      'in_editing',
      'delivered_approval',
      'client_approved',
      'completed'
    ];
    
    if (!stage || !validStages.includes(stage)) {
      return res.status(400).json({ message: 'Invalid stage' });
    }
    
    const pool = getPool();
    
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }
    
    // Check if request exists
    const checkResult = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT * FROM production_requests WHERE id = @id');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Production request not found' });
    }
    
    const existingRequest = checkResult.recordset[0];
    
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('stage', sql.NVarChar, stage)
      .query('UPDATE production_requests SET stage = @stage WHERE id = @id');
    
    const updatedRequest = {
      ...existingRequest,
      stage
    };
    
    return res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Error moving production request:', error);
    return res.status(500).json({ message: 'Error moving production request', error });
  }
};

// Delete a production request
export const deleteProductionRequest = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    
    const pool = getPool();
    
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }
    
    // Check if request exists
    const checkResult = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT * FROM production_requests WHERE id = @id');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Production request not found' });
    }
    
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM production_requests WHERE id = @id');
    
    return res.status(200).json({ message: 'Production request deleted successfully' });
  } catch (error) {
    console.error('Error deleting production request:', error);
    return res.status(500).json({ message: 'Error deleting production request', error });
  }
};