import express from 'express';
import { 
  getAllTeams, 
  createTeam, 
  getUsersByTeam, 
  updateTeam, 
  deleteTeam, 
  updateTeamUsers 
} from '../controllers/teamController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Team routes
router.get('/', getAllTeams);
router.post('/', createTeam);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);

// Team User management
router.get('/:id/users', getUsersByTeam);
router.put('/:id/users', updateTeamUsers);

export default router;
