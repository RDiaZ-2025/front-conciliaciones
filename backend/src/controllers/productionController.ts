import { Request, Response } from 'express';
import { ProductionRequest } from '../models';
import { AppDataSource } from '../config/typeorm.config';

// Get all production requests
export const getAllProductionRequests = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }
    
    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    const productionRequests = await productionRequestRepository.find({
      order: { requestDate: 'DESC' }
    });
    
    return res.status(200).json(productionRequests);
  } catch (error) {
    console.error('Error fetching production requests:', error);
    return res.status(500).json({ message: 'Error fetching production requests', error });
  }
};

// Get a single production request by ID
export const getProductionRequestById = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }
    
    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    const productionRequest = await productionRequestRepository.findOne({
      where: { id: parseInt(id) }
    });
    
    if (!productionRequest) {
      return res.status(404).json({ message: 'Production request not found' });
    }
    
    return res.status(200).json(productionRequest);
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
    
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }
    
    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    
    const newProductionRequest = productionRequestRepository.create({
      name,
      requestDate: new Date(),
      department,
      contactPerson,
      assignedTeam,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      observations,
      stage: 'request' // Initial stage
    });
    
    const savedRequest = await productionRequestRepository.save(newProductionRequest);
    
    return res.status(201).json(savedRequest);
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
    
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }
    
    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    
    // Check if request exists
    const existingRequest = await productionRequestRepository.findOne({
      where: { id: parseInt(id) }
    });
    
    if (!existingRequest) {
      return res.status(404).json({ message: 'Production request not found' });
    }
    
    // Update the request
    existingRequest.name = name;
    existingRequest.department = department;
    existingRequest.contactPerson = contactPerson;
    existingRequest.assignedTeam = assignedTeam;
    existingRequest.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    existingRequest.observations = observations;
    existingRequest.stage = stage;
    
    const updatedRequest = await productionRequestRepository.save(existingRequest);
    
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
    
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }
    
    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    
    // Check if request exists
    const existingRequest = await productionRequestRepository.findOne({
      where: { id: parseInt(id) }
    });
    
    if (!existingRequest) {
      return res.status(404).json({ message: 'Production request not found' });
    }
    
    // Update the stage
    existingRequest.stage = stage;
    const updatedRequest = await productionRequestRepository.save(existingRequest);
    
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
    
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }
    
    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    
    // Check if request exists
    const existingRequest = await productionRequestRepository.findOne({
      where: { id: parseInt(id) }
    });
    
    if (!existingRequest) {
      return res.status(404).json({ message: 'Production request not found' });
    }
    
    await productionRequestRepository.remove(existingRequest);
    
    return res.status(200).json({ message: 'Production request deleted successfully' });
  } catch (error) {
    console.error('Error deleting production request:', error);
    return res.status(500).json({ message: 'Error deleting production request', error });
  }
};