import express from 'express';
import {
  getAllTeams,
  createTeam,
  getUsersByTeam,
  updateTeam,
  deleteTeam,
  updateTeamUsers
} from '../controllers/team.controller';
import {
  getSubteamsByTeam,
  getSubteamById,
  createSubteam,
  updateSubteam,
  deleteSubteam,
  getSubteamUsers,
  updateSubteamUsers
} from '../controllers/subteam.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Teams
router.get('/', getAllTeams);
router.post('/', createTeam);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);

router.get('/:id/users', getUsersByTeam);
router.put('/:id/users', updateTeamUsers);

// Subteams
router.get('/:id/subteams', getSubteamsByTeam);
router.post('/:id/subteams', createSubteam);
router.get('/subteams/:subteamId', getSubteamById);
router.put('/subteams/:subteamId', updateSubteam);
router.delete('/subteams/:subteamId', deleteSubteam);
router.get('/subteams/:subteamId/users', getSubteamUsers);
router.put('/subteams/:subteamId/users', updateSubteamUsers);

export default router;
