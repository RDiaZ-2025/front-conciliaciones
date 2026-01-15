import express from 'express';
import { getObjectives } from '../controllers/objectiveController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Public route for objectives (needed for dropdowns)
router.get('/', getObjectives);

export default router;
