import { Request, Response } from 'express';
import { ProductionRequest, Product, User, FormatType, RightsDuration, Team } from '../models';
import { AppDataSource } from '../config/typeorm.config';
import { NotificationService } from '../services/notificationService';
import { ProductionRequestHistoryService } from '../services/productionRequestHistoryService';
import { AuthService } from '../services/authService';
import { Not, In } from 'typeorm';

const notificationService = new NotificationService();
const historyService = new ProductionRequestHistoryService();

// Helper function for Smart Workload Distribution
const performSmartAssignment = async (department: string): Promise<{ assignedUserId: number, userName: string, activeRequestsCount: number } | null> => {
  try {
    const teamRepository = AppDataSource.getRepository(Team);
    const team = await teamRepository.findOne({ where: { name: department } });

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
              status: Not(In(['completed', 'cancelled']))
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

        console.log(`Smart Assignment: Assigned to ${selectedCandidate.user.name} (ID: ${selectedCandidate.user.id}) with ${selectedCandidate.count} active requests.`);

        return {
          assignedUserId: selectedCandidate.user.id,
          userName: selectedCandidate.user.name,
          activeRequestsCount: selectedCandidate.count
        };
      }
    }
  } catch (error) {
    console.error("Error in Smart Workload Distribution:", error);
  }
  return null;
};

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

    // NEW REQUIREMENT: 
    // - Production history (completed requests) should only be visible to 'head of area' (production_management/admin).
    // - Standard collaborators should NOT see closed requests.
    // - This implies that if a standard user requests 'all' or 'assigned', they should NOT see completed tasks in history view?
    //   Actually, the frontend splits them into 'active' and 'historical'. 
    //   The frontend already hides the 'Historical' button for standard users.
    //   But we must enforce it in backend too.

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

    // ENFORCE: Standard users cannot see 'completed' or 'cancelled' requests (which are historical)
    // even if they were assigned to them, if the requirement is "Collaborators with standard permissions should not have access to this section"
    // "That means all closed requests must be visible to all area heads, but not to regular collaborators."
    if (!hasManagementPermission) {
      query.andWhere('request.status NOT IN (:...closedStatuses)', { closedStatuses: ['completed', 'cancelled'] });
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
      assignedUserId,
      deliveryDate,
      observations,
      status,
      stage,
      customerData,
      audienceData,
      campaignDetail,
      productionInfo
    } = req.body;

    let userCreatorId: number | null = null;

    // Validate that requesting user/area matches authenticated user
    if (req.user?.userId) {
      const userRepository = AppDataSource.getRepository(User);
      const currentUser = await userRepository.findOne({ where: { id: req.user.userId } });

      if (currentUser) {
        userCreatorId = currentUser.id;

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
    if (!name || !department) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Smart Workload Distribution Engine
    // Logic to assign user if department (team) is present and no user is manually assigned
    let assignmentMethod = 'Manual';
    if (department && !assignedUserId) {
      const assignment = await performSmartAssignment(department);
      if (assignment) {
        assignedUserId = assignment.assignedUserId;
        assignmentMethod = 'Smart Workload Distribution';
      }
    }

    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }

    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);

    // Set default status based on budget logic
    let finalStatus = status || stage || 'request';

    if (campaignDetail && campaignDetail.budget) {
      // Remove non-numeric characters to handle formats like "50.000.000" or "$ 50,000,000"
      const budgetStr = String(campaignDetail.budget).replace(/[^0-9]/g, '');
      const budgetValue = parseInt(budgetStr);

      if (!isNaN(budgetValue)) {
        // Threshold: 50,000,000
        if (budgetValue < 50000000) {
          finalStatus = 'in_sell';
        } else {
          finalStatus = 'create_proposal';
        }
      }
    }

    const newProductionRequest = productionRequestRepository.create({
      name,
      requestDate: new Date(),
      department,
      userCreatorId,
      assignedUserId,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      observations,
      status: finalStatus,
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
    let {
      name,
      department,
      assignedUserId,
      deliveryDate,
      observations,
      status,
      stage,
      customerData,
      audienceData,
      campaignDetail,
      productionInfo
    } = req.body;

    // Validate required fields
    if (!name || !department) {
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

    // Smart Workload Distribution for Updates
    let assignmentMethod = 'Manual';

    // Check if department has changed
    const departmentChanged = department && existingRequest.department !== department;

    // Trigger Smart Assignment if:
    // 1. Department has changed (FORCE REASSIGNMENT to a user in the new department)
    // 2. OR Department exists but no user is currently assigned (and none provided in body)
    if (departmentChanged || (department && !assignedUserId && !existingRequest.assignedUserId)) {
      const assignment = await performSmartAssignment(department);
      if (assignment) {
        assignedUserId = assignment.assignedUserId;
        assignmentMethod = 'Smart Workload Distribution';
      }
    }

    // Log changes before saving if user is authenticated
    if (req.user?.userId) {
      await historyService.logDifferences(
        existingRequest,
        {
          name,
          department,
          assignedUserId,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          observations,
          status: status || stage || existingRequest.status
        },
        req.user.userId
      );
    }

    // Update the request
    existingRequest.name = name;
    existingRequest.department = department;
    existingRequest.assignedUserId = assignedUserId;
    existingRequest.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    existingRequest.observations = observations;

    if (status || stage) {
      existingRequest.status = status || stage;
    }

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

    // Audit assignment info if auto-assigned
    if (req.user?.userId && assignmentMethod === 'Smart Workload Distribution' && assignedUserId) {
      await historyService.logChange(
        updatedRequest.id,
        'AssignmentMethod',
        null,
        `Smart Workload Distribution: Auto-assigned to user ID ${assignedUserId} based on workload`,
        req.user.userId,
        'update'
      );
    }

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
      'in_sell',
      'create_proposal',
      'get_data',
      'quotation',
      'material_adjustment',
      'pre_production',
      'in_production',
      'in_editing',
      'delivered_approval',
      'client_approved',
      'completed',
      'material_preparation'
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

    const oldStatusCode = existingRequest.status || 'unknown';

    // Auto-assignment logic for in_sell -> material_preparation transition
    if (oldStatusCode === 'in_sell' && stage === 'material_preparation') {
      try {
        const teamRepository = AppDataSource.getRepository(Team);
        const userRepository = AppDataSource.getRepository(User);

        // Find "Operations" Team (Try 'Operaciones' or 'Operations' or 'Gestión Operativa')
        let operationsTeam = await teamRepository.findOne({ where: { name: 'Operaciones' } });
        if (!operationsTeam) {
             operationsTeam = await teamRepository.findOne({ where: { name: 'Operations' } });
        }
        if (!operationsTeam) {
             operationsTeam = await teamRepository.findOne({ where: { name: 'Gestión Operativa' } });
        }

        if (operationsTeam) {
          // Update department
          existingRequest.department = operationsTeam.name;

          // Find active users in "Operations" team
          const teamUsers = await userRepository.find({ where: { teamId: operationsTeam.id, status: 1 } });

          if (teamUsers.length > 0) {
            // Select random user
            const randomUser = teamUsers[Math.floor(Math.random() * teamUsers.length)];
            existingRequest.assignedUserId = randomUser.id;

            // Log auto-assignment
            if (req.user?.userId) {
              await historyService.logChange(
                existingRequest.id,
                'AutoAssignment',
                null,
                `Stage transition to 'material_preparation': Auto-assigned to Operations Team user ${randomUser.name} (${randomUser.id})`,
                req.user.userId,
                'update'
              );
            }
          }
        }
      } catch (assignError) {
        console.error('Error in auto-assignment during stage transition to material_preparation:', assignError);
      }
    }

    // Auto-assignment logic for create_proposal -> get_data transition
    if (oldStatusCode === 'create_proposal' && stage === 'get_data') {
      try {
        const teamRepository = AppDataSource.getRepository(Team);
        const userRepository = AppDataSource.getRepository(User);

        // Find "Data" Team (ID 5)
        const dataTeam = await teamRepository.findOne({ where: { id: 5 } });

        if (dataTeam) {
          // Update department to Data team name
          existingRequest.department = dataTeam.name;

          // Find active users in "Data" team
          const teamUsers = await userRepository.find({ where: { teamId: 5, status: 1 } });

          if (teamUsers.length > 0) {
            // Select random user
            const randomUser = teamUsers[Math.floor(Math.random() * teamUsers.length)];
            existingRequest.assignedUserId = randomUser.id;

            // Log auto-assignment
            if (req.user?.userId) {
              await historyService.logChange(
                existingRequest.id,
                'AutoAssignment',
                null,
                `Stage transition to 'get_data': Auto-assigned to Data Team user ${randomUser.name} (${randomUser.id})`,
                req.user.userId,
                'update'
              );
            }
          }
        }
      } catch (assignError) {
        console.error('Error in auto-assignment during stage transition:', assignError);
        // Continue with stage change even if assignment fails, but log it
      }
    }

    // Auto-assignment logic for get_data -> in_sell transition (Return to Creator)
    if (oldStatusCode === 'get_data' && stage === 'in_sell') {
      try {
        if (existingRequest.userCreatorId) {
          const userRepository = AppDataSource.getRepository(User);
          const creator = await userRepository.findOne({ 
            where: { id: existingRequest.userCreatorId },
            relations: ['team']
          });

          if (creator) {
            // Reassign to creator
            existingRequest.assignedUserId = creator.id;
            
            // Restore department if creator has a team
            if (creator.team) {
              existingRequest.department = creator.team.name;
            }

            // Log re-assignment
            if (req.user?.userId) {
              await historyService.logChange(
                existingRequest.id,
                'AutoAssignment',
                null,
                `Stage transition to 'in_sell': Returned to creator ${creator.name} (${creator.id})`,
                req.user.userId,
                'update'
              );
            }
          }
        }
      } catch (assignError) {
        console.error('Error in auto-assignment (return to creator) during stage transition:', assignError);
      }
    }

    // Log stage change
    if (req.user?.userId && oldStatusCode !== stage) {
      await historyService.logChange(
        existingRequest.id,
        'stage',
        oldStatusCode,
        stage,
        req.user.userId,
        'status_change'
      );
    }

    // Update the stage (status)
    existingRequest.status = stage;
    const updatedRequest = await productionRequestRepository.save(existingRequest);

    // Send notification to assigned user
    if (existingRequest.assignedUserId) {
      try {
        await notificationService.createNotification(
          existingRequest.assignedUserId,
          'Cambio de Etapa',
          `La solicitud "${existingRequest.name}" ha cambiado a la etapa: ${stage}`,
          'info'
        );
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
    }

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
    let {
      name,
      department,
      assignedUserId,
      deliveryDate,
      observations,
      status,
      stage
    } = req.body;

    if (!AppDataSource.isInitialized) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }

    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    const existingRequest = await productionRequestRepository.findOne({ where: { id: parseInt(id) } });

    if (!existingRequest) {
      return res.status(404).json({ message: 'Production request not found' });
    }

    // Smart Workload Distribution for Updates
    let assignmentMethod = 'Manual';

    // Check if department has changed
    const departmentChanged = department && existingRequest.department !== department;

    // Trigger Smart Assignment if:
    // 1. Department has changed (FORCE REASSIGNMENT to a user in the new department)
    // 2. OR Department exists but no user is currently assigned (and none provided in body)
    if (departmentChanged || (department && !assignedUserId && !existingRequest.assignedUserId)) {
      const assignment = await performSmartAssignment(department);
      if (assignment) {
        assignedUserId = assignment.assignedUserId;
        assignmentMethod = 'Smart Workload Distribution';
      }
    }

    // Log differences
    if (req.user?.userId) {
      await historyService.logDifferences(
        existingRequest,
        { name, department, assignedUserId, deliveryDate: deliveryDate ? new Date(deliveryDate) : null, observations, status: status || stage || existingRequest.status },
        req.user.userId
      );
    }

    existingRequest.name = name;
    existingRequest.department = department;
    existingRequest.assignedUserId = assignedUserId;
    existingRequest.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    existingRequest.observations = observations;

    if (status || stage) {
      existingRequest.status = status || stage;
    }

    const updatedRequest = await productionRequestRepository.save(existingRequest);

    // Audit assignment info if auto-assigned
    if (req.user?.userId && assignmentMethod === 'Smart Workload Distribution' && assignedUserId) {
      await historyService.logChange(
        updatedRequest.id,
        'AssignmentMethod',
        null,
        `Smart Workload Distribution: Auto-assigned to user ID ${assignedUserId} based on workload`,
        req.user.userId,
        'update'
      );
    }

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
    const { campaignDetail, status } = req.body;

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

    if (status) {
      existingRequest.status = status;
    }

    if (campaignDetail) {
      existingRequest.campaignDetail = { ...existingRequest.campaignDetail, ...campaignDetail };

      // Logic for high budget reassignment (> 50,000,000)
      if (campaignDetail.budget) {
        const budgetStr = String(campaignDetail.budget).replace(/[^0-9]/g, '');
        const budgetValue = parseInt(budgetStr);

        // Check if budget is higher than 50 million
         if (!isNaN(budgetValue) && budgetValue >= 50000000) {
            // 1. Change status to 'create_proposal'
            existingRequest.status = 'create_proposal';
            
            // Only perform reassignment if the department is not already 'Estrategia'
            // This prevents re-shuffling the user every time the campaign is saved with a high budget
            if (existingRequest.department !== 'Estrategia') {
                // 2. Change Team to "Estrategia" (Team ID 3)
                existingRequest.department = 'Estrategia';
     
                // 3. Assign a random person from Team "Estrategia" (Team ID 3)
                try {
                  const userRepository = AppDataSource.getRepository(User);
                  // Find active users (status = 1) in Team 3
                  const strategyUsers = await userRepository.find({ where: { teamId: 3, status: 1 } });
                  
                  if (strategyUsers.length > 0) {
                    const randomIndex = Math.floor(Math.random() * strategyUsers.length);
                    const selectedUser = strategyUsers[randomIndex];
                    
                    // Assign the selected user
                    existingRequest.assignedUserId = selectedUser.id;
                    
                    // Send notification to the new assigned user
                    await notificationService.createNotification(
                       selectedUser.id,
                       'Nueva Solicitud Asignada (Presupuesto Alto)',
                       `Se te ha asignado la solicitud "${existingRequest.name}" debido a su alto presupuesto (> 50M).`,
                       'info'
                    );
                  }
                } catch (assignError) {
                  console.error('Error auto-assigning Strategy user:', assignError);
                }
            }
         }
      }
    }

    await productionRequestRepository.save(existingRequest);

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

// Update Material Data
export const updateMaterialData = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { materialData } = req.body;

    if (!AppDataSource.isInitialized) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }

    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
    const existingRequest = await productionRequestRepository.findOne({
      where: { id: parseInt(id) }
    });

    if (!existingRequest) {
      return res.status(404).json({ message: 'Production request not found' });
    }

    // Update materialData (stringify if it's an object)
    existingRequest.materialData = typeof materialData === 'string' ? materialData : JSON.stringify(materialData);

    await productionRequestRepository.save(existingRequest);

    // Log change
    if (req.user?.userId) {
      await historyService.logChange(
        existingRequest.id,
        'MaterialData',
        null,
        'Material Preparation Data Updated',
        req.user.userId,
        'update'
      );
    }

    return res.status(200).json(existingRequest);
  } catch (error) {
    console.error('Error updating material data:', error);
    return res.status(500).json({ message: 'Error updating material data', error });
  }
};
