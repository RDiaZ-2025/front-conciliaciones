import { Request, Response } from 'express';
import { teamService } from '../services/team.service';
import { asyncHandler } from "../utils/asyncHandler";

export const getAllTeams = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const teams = await teamService.getAllTeams();
  res.status(200).json({
    success: true,
    data: teams
  });
});

export const createTeam = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, description, leaderId, defaultWorkflowId, metadata } = req.body;

  if (!name) {
    res.status(400).json({
      success: false,
      message: 'Name is required'
    });
    return;
  }

  const newTeam = await teamService.createTeam({
    name,
    description,
    leaderId: leaderId ? Number(leaderId) : null,
    defaultWorkflowId: defaultWorkflowId ? Number(defaultWorkflowId) : null,
    metadata: metadata !== undefined ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null
  });

  res.status(201).json({
    success: true,
    data: newTeam,
    message: 'Team created successfully'
  });
});

export const getUsersByTeam = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const teamId = parseInt(req.params.id);

  if (isNaN(teamId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid team ID'
    });
    return;
  }

  const users = await teamService.getUsersByTeam(teamId);

  res.status(200).json({
    success: true,
    data: users
  });
});

export const updateTeam = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, description, leaderId, defaultWorkflowId, metadata } = req.body;

  if (!name) {
    res.status(400).json({
      success: false,
      message: 'Name is required'
    });
    return;
  }

  const updatedTeam = await teamService.updateTeam(parseInt(id), {
    name,
    description,
    leaderId: leaderId !== undefined ? (leaderId ? Number(leaderId) : null) : undefined,
    defaultWorkflowId: defaultWorkflowId !== undefined ? (defaultWorkflowId ? Number(defaultWorkflowId) : null) : undefined,
    metadata: metadata !== undefined ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : undefined
  });

  if (!updatedTeam) {
    res.status(404).json({
      success: false,
      message: 'Team not found'
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: updatedTeam,
    message: 'Team updated successfully'
  });
});

export const deleteTeam = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const success = await teamService.deleteTeam(parseInt(id));

  if (!success) {
    res.status(404).json({
      success: false,
      message: 'Team not found'
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Team deleted successfully'
  });
});

export const updateTeamUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { userIds } = req.body;

  if (!Array.isArray(userIds)) {
    res.status(400).json({
      success: false,
      message: 'userIds must be an array'
    });
    return;
  }

  await teamService.updateTeamUsers(parseInt(id), userIds);

  res.status(200).json({
    success: true,
    message: 'Team users updated successfully'
  });
});
