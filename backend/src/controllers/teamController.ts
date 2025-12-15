import { Request, Response } from 'express';
import { teamService } from '../services/teamService';

/**
 * Get all teams
 */
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

/**
 * Create a new team
 */
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

/**
 * Get users by team ID
 */
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
