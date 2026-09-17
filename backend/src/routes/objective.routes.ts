import express from 'express';
import { getObjectives } from '../controllers/objective.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', getObjectives);

export default router;
