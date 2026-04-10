import { Request, Response } from 'express';
import { ProductionRequest, Product, User, FormatType, RightsDuration, Team } from '../models';
import { AppDataSource } from '../config/typeorm.config';
import { NotificationService } from '../services/notificationService';
import { ProductionRequestHistoryService } from '../services/productionRequestHistoryService';
import { AuthService } from '../services/authService';
import { WorkflowService } from '../services/workflowService';
import { Not, In } from 'typeorm';
import { WORKFLOW_STAGES } from '../constants/workflow';
import { asyncHandler } from "../utils/asyncHandler";
const authService = new AuthService();
const workflowService = new WorkflowService();

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

        return {
          assignedUserId: selectedCandidate.user.id,
          userName: selectedCandidate.user.name,
          activeRequestsCount: selectedCandidate.count
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error in smart assignment:', error);
    return null;
  }
};

export class ProductionController {
  getFormatTypes = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    if (!AppDataSource.isInitialized) {
            return res.status(503).json({
              success: false,
              message: 'Base de datos no disponible'
            });
          }

          const formatTypeRepository = AppDataSource.getRepository(FormatType);
          const formatTypes = await formatTypeRepository.find();
          return res.json(formatTypes);
    });

  getRightsDurations = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    if (!AppDataSource.isInitialized) {
            return res.status(503).json({
              success: false,
              message: 'Base de datos no disponible'
            });
          }

          const rightsDurationRepository = AppDataSource.getRepository(RightsDuration);
          const rightsDurations = await rightsDurationRepository.find();
          return res.json(rightsDurations);
    });

  getWorkflowStages = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    return res.json(WORKFLOW_STAGES);
    });
}

export const getAllProductionRequests = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
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
});

export const getProducts = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }

    const productRepository = AppDataSource.getRepository(Product);
    const products = await productRepository.find();

    return res.status(200).json(products);
});

export const getProductionRequestById = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
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
});

export const createProductionRequest = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
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

        const userTeams = await authService.getUserTeams(currentUser.id);
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

    let finalStatus = status || stage || 'quotation';

    const tempRequest = new ProductionRequest();
    tempRequest.status = finalStatus === 'quotation' ? '' : 'quotation'; // Just to trigger correct logic if needed
    tempRequest.department = department;
    tempRequest.assignedUserId = assignedUserId;
    tempRequest.userCreatorId = userCreatorId;

    const budgetValue = campaignDetail?.budget ? parseInt(String(campaignDetail.budget).replace(/[^0-9]/g, '')) : 0;

    // Determine if we should advance based on budget
    if (finalStatus === 'quotation' && budgetValue > 0) {
      tempRequest.status = 'quotation';
    }

    const rulesResult = await workflowService.advanceStage(tempRequest, { budget: budgetValue });
    if (rulesResult.newStage) {
      finalStatus = rulesResult.newStage;
    }

    if (rulesResult.assignmentMethod !== 'Manual') {
      assignmentMethod = rulesResult.assignmentMethod;
      department = tempRequest.department;
      assignedUserId = tempRequest.assignedUserId;
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
      unitAssigned: req.body.unitAssigned,
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

      if (assignmentMethod !== 'Manual' && assignedUserId) {
        await historyService.logChange(
          savedRequest.id,
          'AssignmentMethod',
          null,
          `${assignmentMethod}: Auto-assigned to user ID ${assignedUserId}`,
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
});

export const updateProductionRequest = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
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

    let oldAssignedUserId = existingRequest.assignedUserId;

    if (status || stage) {
      const targetStage = status || stage;
      if (targetStage && targetStage !== existingRequest.status) {
        // Here we just want to advance based on current status.
        // If frontend passes a target status, we can pass it as a hint in additionalData,
        // or just let advanceStage decide. Since the user said advanceStage must NOT receive newStage
        // and must calculate it via getNextStage, we call it with additionalData (req.body).
        const rulesResult = await workflowService.advanceStage(existingRequest, {
          ...req.body,
          targetStage,
          budget: campaignDetail?.budget ? parseInt(String(campaignDetail.budget).replace(/[^0-9]/g, '')) : undefined,
          saleClosed: targetStage === 'completed' ? false : true // Heuristic for in_sell -> completed
        });

        assignmentMethod = rulesResult.assignmentMethod !== 'Manual' ? rulesResult.assignmentMethod : assignmentMethod;
        assignedUserId = existingRequest.assignedUserId;
      }
    }

    if (customerData) existingRequest.customerData = { ...existingRequest.customerData, ...customerData };
    if (audienceData) existingRequest.audienceData = { ...existingRequest.audienceData, ...audienceData };
    if (productionInfo) existingRequest.productionInfo = { ...existingRequest.productionInfo, ...productionInfo };
    if (req.body.unitAssigned !== undefined) existingRequest.unitAssigned = req.body.unitAssigned;

    if (campaignDetail) {
      if (campaignDetail.budget !== undefined && campaignDetail.budget !== null) {
        campaignDetail.budget = String(campaignDetail.budget);
      }
      existingRequest.campaignDetail = { ...existingRequest.campaignDetail, ...campaignDetail };
    }

    const updatedRequest = await productionRequestRepository.save(existingRequest);

    if (req.user?.userId && assignmentMethod !== 'Manual' && assignedUserId) {
      await historyService.logChange(
        updatedRequest.id,
        'AssignmentMethod',
        null,
        `${assignmentMethod}: Auto-assigned to user ID ${assignedUserId}`,
        req.user.userId,
        'update'
      );
    }

    // Send notification if a new user was assigned
    if (assignedUserId && assignedUserId !== oldAssignedUserId && assignmentMethod !== 'Manual') {
      try {
        await notificationService.createNotification(
          assignedUserId,
          'Nueva Solicitud Asignada',
          `Se te ha asignado la solicitud de producción: ${existingRequest.name}`,
          'info'
        );
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
    }

    return res.status(200).json(updatedRequest);
});

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
    if (body.deliveryDate !== undefined) {
      existingRequest.deliveryDate = body.deliveryDate ? new Date(body.deliveryDate) : null;
    }
    if (body.observations) existingRequest.observations = body.observations;

    let assignmentMethod = 'Manual';
    let oldAssignedUserId = existingRequest.assignedUserId;

    if (body.status || body.stage) {
      const targetStage = body.status || body.stage;
      if (targetStage && targetStage !== existingRequest.status) {
        const rulesResult = await workflowService.advanceStage(existingRequest, {
          ...body,
          targetStage,
          budget: body.campaignDetail?.budget ? parseInt(String(body.campaignDetail.budget).replace(/[^0-9]/g, '')) : undefined,
          saleClosed: targetStage === 'completed' ? false : true
        });
        assignmentMethod = rulesResult.assignmentMethod;
        oldAssignedUserId = rulesResult.oldAssignedUserId;
      }
    }

    if (body.customerData) existingRequest.customerData = { ...existingRequest.customerData, ...body.customerData };
    if (body.audienceData) existingRequest.audienceData = { ...existingRequest.audienceData, ...body.audienceData };
    if (body.campaignDetail) existingRequest.campaignDetail = { ...existingRequest.campaignDetail, ...body.campaignDetail };
    if (body.productionInfo) existingRequest.productionInfo = { ...existingRequest.productionInfo, ...body.productionInfo };
    if (body.unitAssigned !== undefined) existingRequest.unitAssigned = body.unitAssigned;

    const updatedRequest = await productionRequestRepository.save(existingRequest);

    if (req.user?.userId) {
      await historyService.logDifferences(
        existingRequest,
        { ...body, assignedUserId: existingRequest.assignedUserId, department: existingRequest.department },
        req.user.userId
      );

      if (assignmentMethod !== 'Manual' && existingRequest.assignedUserId) {
        await historyService.logChange(
          updatedRequest.id,
          'AssignmentMethod',
          null,
          `${assignmentMethod}: Auto-assigned to user ID ${existingRequest.assignedUserId}`,
          req.user.userId,
          'update'
        );
      }
    }

    // Send notification if a new user was assigned
    if (existingRequest.assignedUserId && existingRequest.assignedUserId !== oldAssignedUserId && assignmentMethod !== 'Manual') {
      try {
        await notificationService.createNotification(
          existingRequest.assignedUserId,
          'Nueva Solicitud Asignada',
          `Se te ha asignado la solicitud de producción: ${existingRequest.name}`,
          'info'
        );
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
    }

    return res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Error updating production request partial:', error);
    return res.status(500).json({ message: 'Error updating production request', error });
  }
};

export const moveProductionRequest = updateProductionRequestPartial;
export const updateStepGeneral = updateProductionRequestPartial;
export const updateStepCustomer = updateProductionRequestPartial;
export const updateStepCampaign = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
const { id } = req.params;
    const { campaignDetail, status, deliveryDate } = req.body;

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
      if (campaignDetail.budget !== undefined && campaignDetail.budget !== null) {
        campaignDetail.budget = String(campaignDetail.budget);
      }
      existingRequest.campaignDetail = { ...existingRequest.campaignDetail, ...campaignDetail };
    }

    let assignmentMethod = 'Manual';
    let assignedUserId = existingRequest.assignedUserId;
    let oldAssignedUserId = existingRequest.assignedUserId;

    if (status && status !== existingRequest.status) {
      const rulesResult = await workflowService.advanceStage(existingRequest, {
        campaignDetail,
        status,
        targetStage: status,
        budget: campaignDetail?.budget ? parseInt(String(campaignDetail.budget).replace(/[^0-9]/g, '')) : undefined,
        saleClosed: status === 'completed' ? false : true
      });
      assignmentMethod = rulesResult.assignmentMethod;
      oldAssignedUserId = rulesResult.oldAssignedUserId;
      assignedUserId = existingRequest.assignedUserId;
    }

    if (deliveryDate !== undefined) {
      existingRequest.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    }

    const updatedRequest = await productionRequestRepository.save(existingRequest);

    if (req.user?.userId) {
      await historyService.logDifferences(
        existingRequest,
        { campaignDetail, status, deliveryDate, assignedUserId: existingRequest.assignedUserId, department: existingRequest.department },
        req.user.userId
      );

      if (assignmentMethod !== 'Manual' && assignedUserId) {
        await historyService.logChange(
          updatedRequest.id,
          'AssignmentMethod',
          null,
          `${assignmentMethod}: Auto-assigned to user ID ${assignedUserId}`,
          req.user.userId,
          'update'
        );
      }
    }

    // Send notification if a new user was assigned
    if (assignedUserId && assignedUserId !== oldAssignedUserId && assignmentMethod !== 'Manual') {
      try {
        await notificationService.createNotification(
          assignedUserId,
          'Nueva Solicitud Asignada',
          `Se te ha asignado la solicitud de producción: ${existingRequest.name}`,
          'info'
        );
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
    }

    return res.status(200).json(updatedRequest);
});
export const updateStepAudience = updateProductionRequestPartial;
export const updateStepProduction = updateProductionRequestPartial;
export const updateMaterialData = updateProductionRequestPartial;
