import express from 'express';
import {
  getAllTeams,
  createTeam,
  getUsersByTeam,
  updateTeam,
  deleteTeam,
  updateTeamUsers
} from '../controllers/team.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAllTeams);
router.post('/', createTeam);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);

router.get('/:id/users', getUsersByTeam);
router.put('/:id/users', updateTeamUsers);

export default router;
