import { Request, Response } from 'express';
import { teamService } from '../services/teamService';

export const getAllTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const teams = await teamService.getAllTeams();
    res.status(200).json({
      success: true,
      data: teams
    });
  } catch (error) {
    console.error('Error getting teams:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving teams'
    });
  }
};

export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Name is required'
      });
      return;
    }

    const newTeam = await teamService.createTeam({
      name,
      description
    });

    res.status(201).json({
      success: true,
      data: newTeam,
      message: 'Team created successfully'
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating team'
    });
  }
};

export const getUsersByTeam = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    console.error('Error getting users by team:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users by team'
    });
  }
};

export const updateTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Name is required'
      });
      return;
    }

    const updatedTeam = await teamService.updateTeam(parseInt(id), { name, description });

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
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating team'
    });
  }
};

export const deleteTeam = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting team'
    });
  }
};

export const updateTeamUsers = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    console.error('Error updating team users:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating team users'
    });
  }
};
