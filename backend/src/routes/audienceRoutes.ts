import express from 'express';
import { getGenders, getAgeRanges, getSocioeconomicLevels } from '../controllers/audienceController';

const router = express.Router();

// Public routes for audience dropdowns
router.get('/genders', getGenders);
router.get('/age-ranges', getAgeRanges);
router.get('/socioeconomic-levels', getSocioeconomicLevels);

export default router;
