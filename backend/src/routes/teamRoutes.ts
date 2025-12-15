import express from 'express';
import { getAllTeams, createTeam, getUsersByTeam } from '../controllers/teamController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Team routes
router.get('/', getAllTeams);
router.post('/', createTeam);
router.get('/:id/users', getUsersByTeam);

export default router;
