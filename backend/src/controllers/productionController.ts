import { Request, Response } from 'express';
import { ProductionRequest, Product } from '../models';
import { AppDataSource } from '../config/typeorm.config';
import { NotificationService } from '../services/notificationService';
import { ProductionRequestHistoryService } from '../services/productionRequestHistoryService';

const notificationService = new NotificationService();
const historyService = new ProductionRequestHistoryService();

// Get all production requests
export const getAllProductionRequests = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }

    // Filter by assigned user or creator (via requesterEmail)
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    const productionRequests = await productionRequestRepository.find({
      where: [
        { assignedUserId: userId },
        { customerData: { requesterEmail: userEmail } }
      ],
      order: { requestDate: 'DESC' },
      relations: ['customerData', 'assignedUser'] // Include relations to support filtering and display
    });

    return res.status(200).json(productionRequests);
  } catch (error) {
    console.error('Error fetching production requests:', error);
    return res.status(500).json({ message: 'Error fetching production requests', error });
  }
};

// Get all products
export const getProducts = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }

    const productRepository = AppDataSource.getRepository(Product);
    const products = await productRepository.find();

    return res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ message: 'Error fetching products', error });
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
      where: { id: parseInt(id) },
      relations: [
        'customerData',
        'audienceData',
        'campaignDetail',
        'campaignDetail.campaignProducts',
        'campaignDetail.campaignProducts.product',
        'productionInfo',
        'assignedUser'
      ]
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
      assignedUserId,
      deliveryDate,
      observations,
      customerData,
      audienceData,
      campaignDetail,
      productionInfo
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
      assignedUserId,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      observations,
      stage: 'request', // Initial stage
      customerData,
      audienceData,
      campaignDetail,
      productionInfo
    });

    const savedRequest = await productionRequestRepository.save(newProductionRequest);

    // Log creation history
    if (req.user?.userId) {
      await historyService.logChange(
        savedRequest.id,
        'ProductionRequest',
        null,
        'Created',
        req.user.userId,
        'create'
      );
    }

    // Send notification to assigned user
    if (assignedUserId) {
      try {
        await notificationService.createNotification(
          assignedUserId,
          'Nueva Solicitud Asignada',
          `Se te ha asignado la solicitud de producción: ${name}`,
          'info'
        );
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // Continue execution, don't fail the request because notification failed
      }
    }

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
      assignedUserId,
      deliveryDate,
      observations,
      stage,
      customerData,
      audienceData,
      campaignDetail,
      productionInfo
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
      where: { id: parseInt(id) },
      relations: [
        'customerData',
        'audienceData',
        'campaignDetail',
        'campaignDetail.campaignProducts',
        'productionInfo'
      ]
    });

    if (!existingRequest) {
      return res.status(404).json({ message: 'Production request not found' });
    }

    // Log changes before saving if user is authenticated
    if (req.user?.userId) {
      await historyService.logDifferences(
        existingRequest,
        {
          name,
          department,
          contactPerson,
          assignedTeam,
          assignedUserId,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          observations,
          stage
        },
        req.user.userId
      );
    }

    // Update the request
    existingRequest.name = name;
    existingRequest.department = department;
    existingRequest.contactPerson = contactPerson;
    existingRequest.assignedTeam = assignedTeam;
    existingRequest.assignedUserId = assignedUserId;
    existingRequest.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    existingRequest.observations = observations;
    existingRequest.stage = stage;

    // Update relations
    if (customerData) existingRequest.customerData = { ...existingRequest.customerData, ...customerData };
    if (audienceData) existingRequest.audienceData = { ...existingRequest.audienceData, ...audienceData };
    if (productionInfo) existingRequest.productionInfo = { ...existingRequest.productionInfo, ...productionInfo };

    if (campaignDetail) {
      // Handle campaign products separately if needed, or rely on cascade
      // For deep nested relations like campaignProducts, we might need to handle them carefully
      // But for now, let's assume cascade works for the main object
      existingRequest.campaignDetail = { ...existingRequest.campaignDetail, ...campaignDetail };
    }

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

    // Log stage change
    if (req.user?.userId && existingRequest.stage !== stage) {
      await historyService.logChange(
        existingRequest.id,
        'stage',
        existingRequest.stage,
        stage,
        req.user.userId,
        'status_change'
      );
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