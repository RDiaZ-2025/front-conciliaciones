import { Request, Response } from 'express';
import { ProductionRequest, Product, User, FormatType, RightsDuration, Team } from '../models';
import { AppDataSource } from '../config/typeorm.config';
import { NotificationService } from '../services/notificationService';
import { ProductionRequestHistoryService } from '../services/productionRequestHistoryService';
import { AuthService } from '../services/authService';
import { Not, In } from 'typeorm';

const notificationService = new NotificationService();
const historyService = new ProductionRequestHistoryService();

export class ProductionController {
  static async getFormatTypes(req: Request, res: Response): Promise<Response> {
    try {
      if (!AppDataSource.isInitialized) {
        return res.status(503).json({
          success: false,
          message: 'Base de datos no disponible'
        });
      }

      const formatTypeRepository = AppDataSource.getRepository(FormatType);
      const formatTypes = await formatTypeRepository.find();
      return res.json(formatTypes);
    } catch (error) {
      console.error('Error fetching format types:', error);
      return res.status(500).json({ message: 'Error fetching format types', error });
    }
  }

  static async getRightsDurations(req: Request, res: Response): Promise<Response> {
    try {
      if (!AppDataSource.isInitialized) {
        return res.status(503).json({
          success: false,
          message: 'Base de datos no disponible'
        });
      }

      const rightsDurationRepository = AppDataSource.getRepository(RightsDuration);
      const rightsDurations = await rightsDurationRepository.find();
      return res.json(rightsDurations);
    } catch (error) {
      console.error('Error fetching rights durations:', error);
      return res.status(500).json({ message: 'Error fetching rights durations', error });
    }
  }
}

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
    const hasManagementPermission = req.user?.permissions?.includes('production_management');

    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    
    // Use QueryBuilder for better handling of OR conditions with relations
    const query = productionRequestRepository.createQueryBuilder('request')
      .leftJoinAndSelect('request.customerData', 'customerData')
      .leftJoinAndSelect('request.assignedUser', 'assignedUser')
      .orderBy('request.requestDate', 'DESC');

    // If user doesn't have management permission, filter by assignment or ownership
    // UPDATE: The requirement is strictly that the dashboard must display requests based on the assigned user.
    // The creator must not see the request unless they are the assigned user.
    // Managers can see all ONLY if they explicitly request it (e.g. via view=all), otherwise default to assigned tasks.
    
    let filterByAssignedUser = true;

    if (hasManagementPermission && req.query.view === 'all') {
      filterByAssignedUser = false;
    }

    if (filterByAssignedUser) {
      query.where(
        'request.assignedUserId = :userId', 
        { userId }
      );
    }

    const productionRequests = await query.getMany();

    return res.status(200).json(productionRequests);
  } catch (error) {
    console.error('Error fetching production requests:', error);
    // @ts-ignore
    if (error.code) console.error('Error code:', error.code);
    // @ts-ignore
    if (error.message) console.error('Error message:', error.message);
    
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
        'audienceData.gender',
        'audienceData.ageRange',
        'audienceData.socioEconomicLevel',
        'campaignDetail',
        'campaignDetail.objective',
        'campaignDetail.campaignProducts',
        'campaignDetail.campaignProducts.product',
        'productionInfo',
        'productionInfo.formatType',
        'productionInfo.rightsDuration',
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
    let {
      name,
      department,
      contactPerson,
      assignedTeam,
      assignedUserId,
      deliveryDate,
      observations,
      statusId,
      customerData,
      audienceData,
      campaignDetail,
      productionInfo
    } = req.body;

    // Validate that requesting user/area matches authenticated user
    if (req.user?.userId) {
      const userRepository = AppDataSource.getRepository(User);
      const currentUser = await userRepository.findOne({ where: { id: req.user.userId } });

      if (currentUser) {
        // Enforce contactPerson matches authenticated user
        contactPerson = currentUser.name;

        // Enforce Department matches one of the user's teams
        const userTeams = await AuthService.getUserTeams(currentUser.id);
        if (userTeams.length > 0) {
          if (!userTeams.includes(department)) {
            // If provided department is invalid, default to the first team
            department = userTeams[0];
          }
        }
      }
    }

    // Validate required fields
    if (!name || !department || !contactPerson || !assignedTeam) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Smart Workload Distribution Engine
    // Logic to assign user if assignedTeam is present and no user is manually assigned
    let assignmentMethod = 'Manual';
    if (assignedTeam && !assignedUserId) {
      try {
        const teamRepository = AppDataSource.getRepository(Team);
        const team = await teamRepository.findOne({ where: { name: assignedTeam } });

        if (team) {
          const userRepository = AppDataSource.getRepository(User);
          // Find users in the team who are active (status 1)
          const users = await userRepository.find({ where: { teamId: team.id, status: 1 } });

          if (users && users.length > 0) {
            const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
            
            // Calculate workload for each user
            // Workload: Number of active requests (not completed or cancelled)
            const userWorkloads = await Promise.all(users.map(async (user) => {
              const activeRequestsCount = await productionRequestRepository.count({
                where: {
                  assignedUserId: user.id,
                  stage: Not(In(['completed', 'cancelled']))
                }
              });
              return { user, count: activeRequestsCount };
            }));

            // Sort by workload (ascending)
            userWorkloads.sort((a, b) => a.count - b.count);

            // Find users with the minimum workload
            const minWorkload = userWorkloads[0].count;
            const candidates = userWorkloads.filter(uw => uw.count === minWorkload);

            // Random selection among candidates (Tie-breaking)
            const randomIndex = Math.floor(Math.random() * candidates.length);
            const selectedCandidate = candidates[randomIndex];
            
            assignedUserId = selectedCandidate.user.id;
            assignmentMethod = 'Smart Workload Distribution';
            
            console.log(`Smart Assignment: Assigned to ${selectedCandidate.user.name} (ID: ${assignedUserId}) with ${selectedCandidate.count} active requests.`);
          }
        }
      } catch (error) {
        console.error("Error in Smart Workload Distribution:", error);
      }
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
      statusId,
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

      // Audit assignment info
      if (assignmentMethod === 'Smart Workload Distribution' && assignedUserId) {
         await historyService.logChange(
          savedRequest.id,
          'AssignmentMethod',
          null,
          `Smart Workload Distribution: Auto-assigned to user ID ${assignedUserId} based on workload`,
          req.user.userId,
          'update'
        );
      }
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
      statusId,
      stage,
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
    if (stage) existingRequest.stage = stage;
    if (statusId) existingRequest.statusId = statusId;

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

// Update General Info (Step 0)
export const updateStepGeneral = async (req: Request, res: Response): Promise<Response | void> => {
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
      statusId
    } = req.body;

    if (!AppDataSource.isInitialized) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }

    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    const existingRequest = await productionRequestRepository.findOne({ where: { id: parseInt(id) } });

    if (!existingRequest) {
      return res.status(404).json({ message: 'Production request not found' });
    }

    // Log differences
    if (req.user?.userId) {
      await historyService.logDifferences(
        existingRequest,
        { name, department, contactPerson, assignedTeam, assignedUserId, deliveryDate: deliveryDate ? new Date(deliveryDate) : null, observations },
        req.user.userId
      );
    }

    existingRequest.name = name;
    existingRequest.department = department;
    existingRequest.contactPerson = contactPerson;
    existingRequest.assignedTeam = assignedTeam;
    existingRequest.assignedUserId = assignedUserId;
    existingRequest.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    existingRequest.observations = observations;
    if (statusId) existingRequest.statusId = statusId;

    const updatedRequest = await productionRequestRepository.save(existingRequest);
    return res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Error updating general info:', error);
    return res.status(500).json({ message: 'Error updating general info', error });
  }
};

// Update Customer Data (Step 1)
export const updateStepCustomer = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { customerData } = req.body;

    if (!AppDataSource.isInitialized) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }

    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    const existingRequest = await productionRequestRepository.findOne({ 
      where: { id: parseInt(id) },
      relations: ['customerData']
    });

    if (!existingRequest) {
      return res.status(404).json({ message: 'Production request not found' });
    }

    if (customerData) {
      existingRequest.customerData = { ...existingRequest.customerData, ...customerData };
      await productionRequestRepository.save(existingRequest);
    }

    return res.status(200).json(existingRequest);
  } catch (error) {
    console.error('Error updating customer data:', error);
    return res.status(500).json({ message: 'Error updating customer data', error });
  }
};

// Update Campaign Data (Step 2)
export const updateStepCampaign = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { campaignDetail } = req.body;

    if (!AppDataSource.isInitialized) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }

    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    const existingRequest = await productionRequestRepository.findOne({ 
      where: { id: parseInt(id) },
      relations: ['campaignDetail', 'campaignDetail.campaignProducts']
    });

    if (!existingRequest) {
      return res.status(404).json({ message: 'Production request not found' });
    }

    if (campaignDetail) {
      existingRequest.campaignDetail = { ...existingRequest.campaignDetail, ...campaignDetail };
      await productionRequestRepository.save(existingRequest);
    }

    return res.status(200).json(existingRequest);
  } catch (error) {
    console.error('Error updating campaign data:', error);
    return res.status(500).json({ message: 'Error updating campaign data', error });
  }
};

// Update Audience Data (Step 3)
export const updateStepAudience = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { audienceData } = req.body;

    if (!AppDataSource.isInitialized) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }

    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    const existingRequest = await productionRequestRepository.findOne({ 
      where: { id: parseInt(id) },
      relations: ['audienceData']
    });

    if (!existingRequest) {
      return res.status(404).json({ message: 'Production request not found' });
    }

    if (audienceData) {
      existingRequest.audienceData = { ...existingRequest.audienceData, ...audienceData };
      await productionRequestRepository.save(existingRequest);
    }

    return res.status(200).json(existingRequest);
  } catch (error) {
    console.error('Error updating audience data:', error);
    return res.status(500).json({ message: 'Error updating audience data', error });
  }
};

// Update Production Info (Step 4)
export const updateStepProduction = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { productionInfo } = req.body;

    if (!AppDataSource.isInitialized) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }

    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    const existingRequest = await productionRequestRepository.findOne({ 
      where: { id: parseInt(id) },
      relations: ['productionInfo']
    });

    if (!existingRequest) {
      return res.status(404).json({ message: 'Production request not found' });
    }

    if (productionInfo) {
      existingRequest.productionInfo = { ...existingRequest.productionInfo, ...productionInfo };
      await productionRequestRepository.save(existingRequest);
    }

    return res.status(200).json(existingRequest);
  } catch (error) {
    console.error('Error updating production info:', error);
    return res.status(500).json({ message: 'Error updating production info', error });
  }
};