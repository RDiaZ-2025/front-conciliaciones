import { Request, Response } from 'express';
import { ProductionRequest, Product, User, FormatType, RightsDuration, Team } from '../models';
import { AppDataSource } from '../config/typeorm.config';
import { NotificationService } from '../services/notificationService';
import { ProductionRequestHistoryService } from '../services/productionRequestHistoryService';
import { AuthService } from '../services/authService';
import { Not, In } from 'typeorm';
import { WORKFLOW_STAGES } from '../constants/workflow';

const notificationService = new NotificationService();
const historyService = new ProductionRequestHistoryService();

const performSmartAssignment = async (department: string): Promise<{ assignedUserId: number, userName: string, activeRequestsCount: number } | null> => {
  try {
    const teamRepository = AppDataSource.getRepository(Team);
    const team = await teamRepository.findOne({ where: { name: department } });

    if (team) {
      const userRepository = AppDataSource.getRepository(User);
      const users = await userRepository.find({ where: { teamId: team.id, status: 1 } });

      if (users && users.length > 0) {
        const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);

        const userWorkloads = await Promise.all(users.map(async (user) => {
          const activeRequestsCount = await productionRequestRepository.count({
            where: {
              assignedUserId: user.id,
              status: Not(In(['completed', 'cancelled']))
            }
          });
          return { user, count: activeRequestsCount };
        }));

        userWorkloads.sort((a, b) => a.count - b.count);

        const minWorkload = userWorkloads[0].count;
        const candidates = userWorkloads.filter(uw => uw.count === minWorkload);

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

  static async getWorkflowStages(req: Request, res: Response): Promise<Response> {
    try {
      return res.json(WORKFLOW_STAGES);
    } catch (error) {
      console.error('Error fetching workflow stages:', error);
      return res.status(500).json({ message: 'Error fetching workflow stages', error });
    }
  }
}

export const getAllProductionRequests = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }

    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    const hasManagementPermission = req.user?.permissions?.includes('production_management');

    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);

    const query = productionRequestRepository.createQueryBuilder('request')
      .leftJoinAndSelect('request.customerData', 'customerData')
      .leftJoinAndSelect('request.assignedUser', 'assignedUser')
      .leftJoinAndSelect('request.materialRegisters', 'materialRegisters')
      .orderBy('request.requestDate', 'DESC');

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

    if (!hasManagementPermission) {
      query.andWhere('request.status NOT IN (:...closedStatuses)', { closedStatuses: ['completed', 'cancelled'] });
    }

    const productionRequests = await query.getMany();

    return res.status(200).json(productionRequests);
  } catch (error) {
    console.error('Error fetching production requests:', error);
    if ((error as any).code) console.error('Error code:', (error as any).code);
    if ((error as any).message) console.error('Error message:', (error as any).message);

    return res.status(500).json({ message: 'Error fetching production requests', error });
  }
};

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
        'assignedUser',
        'materialRegisters',
        'materialRegisters.creator'
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

    if (req.user?.userId) {
      const userRepository = AppDataSource.getRepository(User);
      const currentUser = await userRepository.findOne({ where: { id: req.user.userId } });

      if (currentUser) {
        userCreatorId = currentUser.id;

        const userTeams = await AuthService.getUserTeams(currentUser.id);
        if (userTeams.length > 0) {
          if (!userTeams.includes(department)) {
            department = userTeams[0];
          }
        }
      }
    }

    if (!name || !department) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

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

    let finalStatus = status || stage || 'request';

    if (campaignDetail && campaignDetail.budget) {
      const budgetStr = String(campaignDetail.budget).replace(/[^0-9]/g, '');
      const budgetValue = parseInt(budgetStr);

      if (!isNaN(budgetValue)) {
        if (budgetValue < 50000000) {
          finalStatus = 'get_data';
        } else {
          finalStatus = 'create_proposal';
        }
      }
    }

    if (finalStatus === 'get_data') {
      try {
        const teamRepository = AppDataSource.getRepository(Team);
        const userRepository = AppDataSource.getRepository(User);

        const dataTeam = await teamRepository.findOne({ where: { id: 5 } });

        if (dataTeam) {
          department = dataTeam.name;

          const teamUsers = await userRepository.find({ where: { teamId: dataTeam.id, status: 1 } });
          if (teamUsers.length > 0) {
            const randomUser = teamUsers[Math.floor(Math.random() * teamUsers.length)];
            assignedUserId = randomUser.id;
            assignmentMethod = 'Auto-assigned to Data Team';
          } else {
            console.warn(`No active users found in Data Team (ID: ${dataTeam.id})`);
          }
        } else {
          console.warn('Data Team (ID 5) not found');
        }
      } catch (assignError) {
        console.error('Error in auto-assignment to Data Team:', assignError);
      }
    }

    if (finalStatus === 'create_proposal') {
      try {
        const teamRepository = AppDataSource.getRepository(Team);
        const userRepository = AppDataSource.getRepository(User);

        const strategyTeam = await teamRepository.findOne({ where: { id: 3 } });

        if (strategyTeam) {
          department = strategyTeam.name;

          const teamUsers = await userRepository.find({ where: { teamId: strategyTeam.id, status: 1 } });
          if (teamUsers.length > 0) {
            const randomUser = teamUsers[Math.floor(Math.random() * teamUsers.length)];
            assignedUserId = randomUser.id;
            assignmentMethod = 'Auto-assigned to Strategy Team';
          } else {
            console.warn(`No active users found in Strategy Team (ID: ${strategyTeam.id})`);
          }
        } else {
          console.warn('Strategy Team (ID 3) not found');
        }
      } catch (assignError) {
        console.error('Error in auto-assignment to Strategy Team:', assignError);
      }
    }

    if (campaignDetail) {
      if (campaignDetail.budget !== undefined && campaignDetail.budget !== null) {
        campaignDetail.budget = String(campaignDetail.budget);
      }
    }

    const isEmptyObject = (obj: any) => {
      if (!obj) return true;
      return Object.values(obj).every(val => val === null || val === undefined || val === '' || val === false || (Array.isArray(val) && val.length === 0));
    };

    const newProductionRequest = productionRequestRepository.create({
      name,
      requestDate: new Date(),
      department,
      userCreatorId,
      assignedUserId,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      observations,
      status: finalStatus,
      customerData: isEmptyObject(customerData) ? undefined : customerData,
      audienceData: isEmptyObject(audienceData) ? undefined : audienceData,
      campaignDetail: isEmptyObject(campaignDetail) ? undefined : campaignDetail,
      productionInfo: isEmptyObject(productionInfo) ? undefined : productionInfo
    });

    const savedRequest = await productionRequestRepository.save(newProductionRequest);

    if (req.user?.userId) {
      await historyService.logChange(
        savedRequest.id,
        'ProductionRequest',
        null,
        'Created',
        req.user.userId,
        'create'
      );

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
      }
    }

    return res.status(201).json(savedRequest);
  } catch (error) {
    console.error('Error creating production request:', error);
    return res.status(500).json({ message: 'Error creating production request', error });
  }
};

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

    let assignmentMethod = 'Manual';

    const departmentChanged = department && existingRequest.department !== department;

    if (departmentChanged || (department && !assignedUserId && !existingRequest.assignedUserId)) {
      const assignment = await performSmartAssignment(department);
      if (assignment) {
        assignedUserId = assignment.assignedUserId;
        assignmentMethod = 'Smart Workload Distribution';
      }
    }

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

    existingRequest.name = name;
    existingRequest.department = department;
    existingRequest.assignedUserId = assignedUserId;
    existingRequest.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    existingRequest.observations = observations;

    if (status || stage) {
      existingRequest.status = status || stage;
    }

    if (customerData) existingRequest.customerData = { ...existingRequest.customerData, ...customerData };
    if (audienceData) existingRequest.audienceData = { ...existingRequest.audienceData, ...audienceData };
    if (productionInfo) existingRequest.productionInfo = { ...existingRequest.productionInfo, ...productionInfo };

    if (campaignDetail) {
      if (campaignDetail.budget !== undefined && campaignDetail.budget !== null) {
        campaignDetail.budget = String(campaignDetail.budget);
      }
      existingRequest.campaignDetail = { ...existingRequest.campaignDetail, ...campaignDetail };
    }

    const updatedRequest = await productionRequestRepository.save(existingRequest);

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

const updateProductionRequestPartial = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const body = req.body;

    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }

    const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
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

    if (body.name) existingRequest.name = body.name;
    if (body.department) existingRequest.department = body.department;
    if (body.assignedUserId) existingRequest.assignedUserId = body.assignedUserId;
    if (body.deliveryDate) existingRequest.deliveryDate = new Date(body.deliveryDate);
    if (body.observations) existingRequest.observations = body.observations;
    if (body.status) existingRequest.status = body.status;
    if (body.stage) {
      existingRequest.status = body.stage;
      if (body.stage === 'customer_review') {
        existingRequest.assignedUserId = existingRequest.userCreatorId;
      }
    }

    if (body.customerData) existingRequest.customerData = { ...existingRequest.customerData, ...body.customerData };
    if (body.audienceData) existingRequest.audienceData = { ...existingRequest.audienceData, ...body.audienceData };
    if (body.campaignDetail) existingRequest.campaignDetail = { ...existingRequest.campaignDetail, ...body.campaignDetail };
    if (body.productionInfo) existingRequest.productionInfo = { ...existingRequest.productionInfo, ...body.productionInfo };

    const updatedRequest = await productionRequestRepository.save(existingRequest);
    return res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Error updating production request partial:', error);
    return res.status(500).json({ message: 'Error updating production request', error });
  }
};

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
    const result = await productionRequestRepository.delete(id);

    if (result.affected === 0) {
      return res.status(404).json({ message: 'Production request not found' });
    }

    return res.status(200).json({ message: 'Production request deleted successfully' });
  } catch (error) {
    console.error('Error deleting production request:', error);
    return res.status(500).json({ message: 'Error deleting production request', error });
  }
};

export const moveProductionRequest = updateProductionRequestPartial;
export const updateStepGeneral = updateProductionRequestPartial;
export const updateStepCustomer = updateProductionRequestPartial;
export const updateStepCampaign = updateProductionRequestPartial;
export const updateStepAudience = updateProductionRequestPartial;
export const updateStepProduction = updateProductionRequestPartial;
export const updateMaterialData = updateProductionRequestPartial;
